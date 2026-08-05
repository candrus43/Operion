import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

const CACHE_TTL = 5 * 60 * 1000
const briefingCache = new Map<string, { briefing: string; expiresAt: number }>()

const FALLBACK_BRIEFING = `1. Critical Items
No AI briefing is available right now. Review overdue and high-priority tasks first.

2. Upcoming Deadlines
Check the Tasks and Calendar views for deadlines in the next seven days.

3. Risks to Watch
Unassigned, blocked, or overdue work may put active projects at risk.

4. Recommended Actions
Prioritize the oldest overdue item, confirm owners for critical work, and review upcoming meetings.`

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "No date"
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
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ briefing: cached.briefing, cached: true })
  }
  briefingCache.delete(cacheKey)

  try {
    const now = new Date()
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const [organization, entities, tasks, projects, meetings, overdueTasks, notifications] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
      prisma.entity.findMany({ where: { organizationId: orgId }, select: { name: true, type: true }, orderBy: { name: "asc" } }),
      prisma.task.findMany({
        where: { organizationId: orgId, status: { not: "DONE" } },
        select: { title: true, description: true, status: true, priority: true, dueDate: true, category: true, notes: true, assignee: { select: { name: true } }, entity: { select: { name: true } }, project: { select: { name: true } } },
        orderBy: [{ priority: "asc" }, { dueDate: "asc" }], take: 30,
      }),
      prisma.project.findMany({
        where: { organizationId: orgId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
        select: { name: true, phase: true, description: true, status: true, progress: true, startDate: true, targetDate: true, entity: { select: { name: true } } }, orderBy: { targetDate: "asc" }, take: 20,
      }),
      prisma.meeting.findMany({
        where: { organizationId: orgId, date: { gte: now, lte: weekAhead } },
        select: { title: true, date: true, location: true, notes: true, project: { select: { name: true } } }, orderBy: { date: "asc" }, take: 10,
      }),
      prisma.task.findMany({
        where: { organizationId: orgId, status: { not: "DONE" }, dueDate: { lt: now } },
        select: { title: true, status: true, priority: true, dueDate: true, entity: { select: { name: true } } }, orderBy: { dueDate: "asc" }, take: 10,
      }),
      prisma.notification.findMany({
        where: { organizationId: orgId, ...(userId ? { userId } : {}) },
        select: { title: true, message: true, type: true, createdAt: true, read: true }, orderBy: { createdAt: "desc" }, take: 10,
      }),
    ])

    const data = JSON.stringify({
      organization: organization?.name || "Your organization",
      entities,
      tasks: tasks.slice(0, 20).map(t => ({
        ...t,
        description: t.description?.slice(0, 200) || null,
        notes: t.notes?.slice(0, 200) || null,
        dueDate: formatDate(t.dueDate),
      })),
      projects: projects.slice(0, 12).map(p => ({
        ...p,
        description: p.description?.slice(0, 200) || null,
        startDate: formatDate(p.startDate),
        targetDate: formatDate(p.targetDate),
      })),
      upcomingMeetings: meetings.slice(0, 8).map(m => ({
        ...m,
        notes: m.notes?.slice(0, 200) || null,
        date: formatDate(m.date),
      })),
      overdueItems: overdueTasks.slice(0, 8).map(t => ({ ...t, dueDate: formatDate(t.dueDate) })),
      recentNotifications: notifications.slice(0, 8).map(n => ({ ...n, createdAt: formatDate(n.createdAt) })),
    })
    const systemPrompt = `You are an AI Chief of Staff for a business owner. Today is ${now.toISOString().slice(0, 10)}. Analyze their data and give a concise briefing with sections: 1. Critical Items (max 3), 2. Upcoming Deadlines, 3. Risks to Watch, 4. Recommended Actions. Be specific — mention entity names, task names, dates. Keep to ~500 words.

Use only the supplied organization data. Do not invent facts. Return plain text with the four numbered headings.

Organization data:
${data}`

    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured")
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    console.info("AI briefing OpenAI call", { model: "gpt-4o", orgId, max_tokens: 900 })
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.4,
      max_tokens: 900,
    })
    const briefing = completion.choices[0]?.message?.content?.trim() || FALLBACK_BRIEFING
    briefingCache.set(cacheKey, { briefing, expiresAt: Date.now() + CACHE_TTL })
    return NextResponse.json({ briefing, cached: false })
  } catch (error) {
    console.error("AI briefing failed; using fallback", error)
    return NextResponse.json({ briefing: FALLBACK_BRIEFING, fallback: true })
  }
}
