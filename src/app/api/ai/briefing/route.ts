import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

const CACHE_TTL = 10 * 60 * 1000

// --- Resolution / deep-link types -------------------------------------------
// The LLM returns DISPLAY STRINGS ONLY. We resolve each briefed item back to a
// real org record server-side (deterministic, title-matching) and attach the
// resolved record + context (owner / priority / dueDate) alongside the display
// text. The LLM output itself is never modified.
type RecordRef = { kind: "task" | "project" | "entity" | "meeting"; id: string; href: string }

type CriticalItem = { title: string; detail: string; sourceEntity: string; sourceItem: string; urgency: string; record?: RecordRef; owner?: string; priority?: string; dueDate?: string }
type DeadlineItem = { title: string; detail: string; date: string; sourceEntity: string; sourceItem: string; record?: RecordRef; owner?: string }
type RiskItem = { title: string; detail: string; sourceEntity: string; sourceItem: string; record?: RecordRef }
type ActionItem = { action: string; reason: string; sourceItem: string; record?: RecordRef }
type Briefing = { criticalItems: CriticalItem[]; upcomingDeadlines: DeadlineItem[]; risks: RiskItem[]; recommendedActions: ActionItem[] }

type CacheEntry = { briefing: Briefing; generatedAt: string; expiresAt: number }
const briefingCache = new Map<string, CacheEntry>()

// Resolution record shapes (from the same org-scoped queries).
type TaskRec = { id: string; title: string; status: string; priority: string; dueDate: Date | null; assignee: { name: string | null } | null }
type ProjectRec = { id: string; name: string }
type EntityRec = { id: string; name: string }
type MeetingRec = { id: string; title: string; date: Date }

const EMPTY_BRIEFING: Briefing = { criticalItems: [], upcomingDeadlines: [], risks: [], recommendedActions: [] }
function formatDate(value: Date | null | undefined) { return value ? value.toISOString().slice(0, 10) : "No date" }
function daysBetween(later: Date, earlier: Date) { return Math.max(0, Math.ceil((later.getTime() - earlier.getTime()) / 86400000)) }
function norm(s?: string | null) { return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim() }

// Conservative title matching. Returns a score: -1 = no confident match.
// Higher = stronger. We only deep-link when a confident match exists.
const TASK_PRIORITY_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
function matchScore(needle: string, title: string): number {
  const n = norm(needle), t = norm(title)
  if (!n || !t) return -1
  if (n === t) return 3 // exact title match
  if (t.length >= 4 && n.includes(t)) return 2 // needle references the full record title
  if (n.length >= 5 && t.includes(n)) return 1 // full needle is a distinct substring of the record title
  return -1
}

function bestTaskMatch(needles: string[], tasks: TaskRec[], opts?: { openOnly?: boolean }): TaskRec | null {
  let best: { task: TaskRec; score: number } | null = null
  for (const task of tasks) {
    if (opts?.openOnly && task.status === "DONE") continue
    let taskScore = -1
    for (const needle of needles) {
      const s = matchScore(needle, task.title)
      if (s > taskScore) taskScore = s
    }
    if (taskScore < 1) continue
    // Favor non-DONE and higher priority only as tie-breakers among matches.
    const total = taskScore + ((TASK_PRIORITY_RANK[task.priority] ?? 0) - 2.5) * 0.01 + (task.status === "DONE" ? -0.05 : 0)
    if (!best || total > best.score) best = { task, score: total }
  }
  return best?.task ?? null
}

function bestNameMatch(needles: string[], records: { id: string; name: string }[]): { id: string; name: string } | null {
  let best: { rec: { id: string; name: string }; score: number } | null = null
  for (const rec of records) {
    for (const needle of needles) {
      const s = matchScore(needle, rec.name)
      if (s >= 1 && (!best || s > best.score)) best = { rec, score: s }
    }
  }
  return best?.rec ?? null
}

function bestMeetingMatch(needles: string[], meetings: MeetingRec[]): MeetingRec | null {
  const best = bestNameMatch(needles, meetings.map(m => ({ id: m.id, name: m.title })))
  if (!best) return null
  return meetings.find(m => m.id === best.id) ?? null
}

function taskRef(task: TaskRec): RecordRef { return { kind: "task", id: task.id, href: `/tasks/${task.id}` } }
function projectRef(p: { id: string }): RecordRef { return { kind: "project", id: p.id, href: `/projects/${p.id}` } }
function entityRef(e: { id: string }): RecordRef { return { kind: "entity", id: e.id, href: `/entities/${e.id}` } }
function meetingRef(m: MeetingRec): RecordRef { return { kind: "meeting", id: m.id, href: "/calendar" } } // no /meetings/[id] detail page yet

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    criticalItems: { type: "array", maxItems: 3, items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, detail: { type: "string" }, sourceEntity: { type: "string" }, sourceItem: { type: "string" }, urgency: { type: "string" } }, required: ["title", "detail", "sourceEntity", "sourceItem", "urgency"] } },
    upcomingDeadlines: { type: "array", maxItems: 3, items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, detail: { type: "string" }, date: { type: "string" }, sourceEntity: { type: "string" }, sourceItem: { type: "string" } }, required: ["title", "detail", "date", "sourceEntity", "sourceItem"] } },
    risks: { type: "array", maxItems: 3, items: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, detail: { type: "string" }, sourceEntity: { type: "string" }, sourceItem: { type: "string" } }, required: ["title", "detail", "sourceEntity", "sourceItem"] } },
    recommendedActions: { type: "array", maxItems: 3, items: { type: "object", additionalProperties: false, properties: { action: { type: "string" }, reason: { type: "string" }, sourceItem: { type: "string" } }, required: ["action", "reason", "sourceItem"] } },
  },
  required: ["criticalItems", "upcomingDeadlines", "risks", "recommendedActions"],
}

export async function POST(request: NextRequest) {
  const limit = await applyRateLimit(request, { maxRequests: 10, windowMs: 60_000 })
  if (limit) return limit
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const orgId = (session.user as { organizationId?: string }).organizationId
  const userId = (session.user as { id?: string }).id
  if (!orgId) return NextResponse.json({ error: "No organization found" }, { status: 400 })
  const cacheKey = `${orgId}:${userId ?? "unknown"}`
  const cached = briefingCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json({ briefing: cached.briefing, cached: true, generatedAt: cached.generatedAt })
  briefingCache.delete(cacheKey)

  try {
    const now = new Date()
    const weekAhead = new Date(now.getTime() + 7 * 86400000)
    const [organization, entities, tasks, projects, meetings, notifications] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
      prisma.entity.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, type: true }, orderBy: { name: "asc" } }),
      prisma.task.findMany({ where: { organizationId: orgId }, select: { id: true, title: true, description: true, status: true, priority: true, dueDate: true, category: true, notes: true, assignee: { select: { name: true } }, entity: { select: { name: true } }, project: { select: { name: true } } }, orderBy: [{ priority: "asc" }, { dueDate: "asc" }] }),
      prisma.project.findMany({ where: { organizationId: orgId, status: { notIn: ["COMPLETED", "CANCELLED"] } }, select: { id: true, name: true, phase: true, description: true, status: true, progress: true, startDate: true, targetDate: true, entity: { select: { name: true } } }, orderBy: { targetDate: "asc" } }),
      prisma.meeting.findMany({ where: { organizationId: orgId, date: { gte: now, lte: weekAhead } }, select: { id: true, title: true, date: true, location: true, notes: true, project: { select: { name: true } } }, orderBy: { date: "asc" } }),
      prisma.notification.findMany({ where: { organizationId: orgId, ...(userId ? { userId } : {}) }, select: { title: true, message: true, type: true, createdAt: true, read: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    ])
    const data = JSON.stringify({
      organization: organization?.name || "Your organization", entities: entities.map(e => ({ name: e.name, type: e.type })),
      tasks: tasks.slice(0, 20).map(t => ({ title: t.title, description: t.description?.slice(0, 200) || null, status: t.status, priority: t.priority, notes: t.notes?.slice(0, 200) || null, dueDate: formatDate(t.dueDate), daysOverdue: t.dueDate && t.dueDate < now ? daysBetween(now, t.dueDate) : 0, daysUntilDue: t.dueDate && t.dueDate >= now ? daysBetween(t.dueDate, now) : null, missingAssignee: !t.assignee?.name, isBlocked: t.status === "BLOCKED", assignee: t.assignee?.name || null, entity: t.entity?.name || null, project: t.project?.name || null })),
      projects: projects.slice(0, 12).map(p => ({ name: p.name, phase: p.phase, status: p.status, progress: p.progress, description: p.description?.slice(0, 200) || null, startDate: formatDate(p.startDate), targetDate: formatDate(p.targetDate), isPastTarget: !!p.targetDate && p.targetDate < now && p.progress < 100, stalled: !!p.startDate && p.progress < 20 && p.startDate <= new Date(now.getTime() - 30 * 86400000), entity: p.entity?.name || null })),
      upcomingMeetings: meetings.slice(0, 8).map(m => ({ ...m, notes: m.notes?.slice(0, 200) || null, date: formatDate(m.date) })),
      recentNotifications: notifications.slice(0, 8).map(n => ({ ...n, createdAt: formatDate(n.createdAt) })),
    })
    const today = now.toISOString().slice(0, 10)
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured")
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", temperature: 0.3, max_tokens: 900,
      messages: [
        { role: "system", content: "You are an AI Chief of Staff for a business owner managing multiple entities.\nYour job is to analyze supplied organization data and produce a concise executive briefing.\nOutput ONLY valid JSON matching the schema. Every item must reference a real entity, project, task, or meeting from the supplied data. Never invent items or give generic advice." },
        { role: "user", content: `Today is ${today}. Analyze the following organization data and produce a briefing. Return empty arrays when no relevant data exists.\n${data}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "executive_briefing", strict: true, schema } },
    })
    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error("Empty AI response")
    const briefing = JSON.parse(raw) as Briefing
    resolveBriefing(briefing, { tasks, projects, entities, meetings })
    const generatedAt = new Date().toISOString()
    briefingCache.set(cacheKey, { briefing, generatedAt, expiresAt: Date.now() + CACHE_TTL })
    return NextResponse.json({ briefing, cached: false, generatedAt })
  } catch (error) {
    console.error("AI briefing failed; using fallback", error)
    return NextResponse.json({ briefing: EMPTY_BRIEFING, fallback: true, generatedAt: new Date().toISOString() })
  }
}

// Deterministic, org-scoped resolution of each briefed item to a real record.
// Confidence rule: only attach a deep link when a title match scores >= 1
// (exact, needle-contains-title, or title-contains-needle). Otherwise the item
// renders as a non-link element.
function resolveBriefing(
  briefing: Briefing,
  pools: { tasks: TaskRec[]; projects: ProjectRec[]; entities: EntityRec[]; meetings: MeetingRec[] },
) {
  const { tasks, projects, entities, meetings } = pools

  // CRITICAL ITEMS -> tasks (favor open + high priority)
  briefing.criticalItems = briefing.criticalItems.map(item => {
    const task = bestTaskMatch([item.title, item.sourceItem, item.detail], tasks, { openOnly: true })
    return task
      ? { ...item, record: taskRef(task), owner: task.assignee?.name || undefined, priority: task.priority, dueDate: formatDate(task.dueDate) }
      : item
  })

  // UPCOMING DEADLINES -> tasks with dueDate (or a meeting in the next 7 days)
  briefing.upcomingDeadlines = briefing.upcomingDeadlines.map(item => {
    const task = bestTaskMatch([item.title, item.sourceItem, item.detail], tasks, { openOnly: true })
    if (task) return { ...item, record: taskRef(task), owner: task.assignee?.name || undefined }
    const meeting = bestMeetingMatch([item.title, item.sourceItem], meetings)
    if (meeting) return { ...item, record: meetingRef(meeting) }
    return item
  })

  // RISKS -> projects preferred, then tasks
  briefing.risks = briefing.risks.map(item => {
    const project = bestNameMatch([item.title, item.sourceItem, item.detail], projects)
    if (project) return { ...item, record: projectRef(project) }
    const task = bestTaskMatch([item.title, item.sourceItem, item.detail], tasks, { openOnly: true })
    if (task) return { ...item, record: taskRef(task) }
    return item
  })

  // RECOMMENDED ACTIONS -> task / project / entity when referenced; else no link
  briefing.recommendedActions = briefing.recommendedActions.map(item => {
    const needles = [item.action, item.sourceItem, item.reason]
    const task = bestTaskMatch(needles, tasks)
    if (task) return { ...item, record: taskRef(task) }
    const project = bestNameMatch(needles, projects)
    if (project) return { ...item, record: projectRef(project) }
    const entity = bestNameMatch(needles, entities)
    if (entity) return { ...item, record: entityRef(entity) }
    return item
  })
}
