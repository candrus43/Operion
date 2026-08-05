import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

const CACHE_TTL = 10 * 60 * 1000

type Briefing = {
  criticalItems: { title: string; detail: string; sourceEntity: string; sourceItem: string; urgency: string }[]
  upcomingDeadlines: { title: string; detail: string; date: string; sourceEntity: string; sourceItem: string }[]
  risks: { title: string; detail: string; sourceEntity: string; sourceItem: string }[]
  recommendedActions: { action: string; reason: string; sourceItem: string }[]
}
type CacheEntry = { briefing: Briefing; generatedAt: string; expiresAt: number }
const briefingCache = new Map<string, CacheEntry>()

const EMPTY_BRIEFING: Briefing = { criticalItems: [], upcomingDeadlines: [], risks: [], recommendedActions: [] }
function formatDate(value: Date | null | undefined) { return value ? value.toISOString().slice(0, 10) : "No date" }
function daysBetween(later: Date, earlier: Date) { return Math.max(0, Math.ceil((later.getTime() - earlier.getTime()) / 86400000)) }

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
      prisma.entity.findMany({ where: { organizationId: orgId }, select: { name: true, type: true }, orderBy: { name: "asc" } }),
      prisma.task.findMany({ where: { organizationId: orgId, status: { not: "DONE" } }, select: { title: true, description: true, status: true, priority: true, dueDate: true, category: true, notes: true, assignee: { select: { name: true } }, entity: { select: { name: true } }, project: { select: { name: true } } }, orderBy: [{ priority: "asc" }, { dueDate: "asc" }], take: 30 }),
      prisma.project.findMany({ where: { organizationId: orgId, status: { notIn: ["COMPLETED", "CANCELLED"] } }, select: { name: true, phase: true, description: true, status: true, progress: true, startDate: true, targetDate: true, entity: { select: { name: true } } }, orderBy: { targetDate: "asc" }, take: 20 }),
      prisma.meeting.findMany({ where: { organizationId: orgId, date: { gte: now, lte: weekAhead } }, select: { title: true, date: true, location: true, notes: true, project: { select: { name: true } } }, orderBy: { date: "asc" }, take: 10 }),
      prisma.notification.findMany({ where: { organizationId: orgId, ...(userId ? { userId } : {}) }, select: { title: true, message: true, type: true, createdAt: true, read: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    ])
    const data = JSON.stringify({
      organization: organization?.name || "Your organization", entities,
      tasks: tasks.slice(0, 20).map(t => ({ ...t, description: t.description?.slice(0, 200) || null, notes: t.notes?.slice(0, 200) || null, dueDate: formatDate(t.dueDate), daysOverdue: t.dueDate && t.dueDate < now ? daysBetween(now, t.dueDate) : 0, daysUntilDue: t.dueDate && t.dueDate >= now ? daysBetween(t.dueDate, now) : null, missingAssignee: !t.assignee, isBlocked: t.status === "BLOCKED" })),
      projects: projects.slice(0, 12).map(p => ({ ...p, description: p.description?.slice(0, 200) || null, startDate: formatDate(p.startDate), targetDate: formatDate(p.targetDate), isPastTarget: !!p.targetDate && p.targetDate < now && p.progress < 100, stalled: !!p.startDate && p.progress < 20 && p.startDate <= new Date(now.getTime() - 30 * 86400000) })),
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
    const generatedAt = new Date().toISOString()
    briefingCache.set(cacheKey, { briefing, generatedAt, expiresAt: Date.now() + CACHE_TTL })
    return NextResponse.json({ briefing, cached: false, generatedAt })
  } catch (error) {
    console.error("AI briefing failed; using fallback", error)
    return NextResponse.json({ briefing: EMPTY_BRIEFING, fallback: true, generatedAt: new Date().toISOString() })
  }
}
