import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { AiAnswerCard, AiInsightSummary, AiSource } from "@/lib/ai/types"
import type { Prisma } from "@prisma/client"

type SessionUser = { user?: { id?: string; organizationId?: string } }
function getScopedIds(session: SessionUser | null) {
  const userId = session?.user?.id
  const organizationId = session?.user?.organizationId
  if (!userId || !organizationId) return null
  return { userId, organizationId }
}

function toSources(json: Prisma.JsonValue): AiSource[] {
  if (!Array.isArray(json)) return []
  const out: AiSource[] = []
  for (const s of json) {
    const maybe = s as unknown as Record<string, unknown>
    if (maybe && typeof maybe === "object" && typeof maybe.id === "string" && typeof maybe.url === "string") {
      out.push({
        id: maybe.id,
        url: maybe.url,
        title: typeof maybe.title === "string" ? maybe.title : "",
        type: maybe.type as AiSource["type"],
      } as unknown as AiSource)
    }
  }
  return out
}

/** GET — list the current user's saved insights (org + user scoped). */
export async function GET() {
  const session = await auth()
  const scoped = getScopedIds(session)
  if (!scoped) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await prisma.aiInsight.findMany({
    where: { userId: scoped.userId, organizationId: scoped.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  const items: AiInsightSummary[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    question: r.question,
    answer: r.answer,
    sources: toSources(r.sources),
    createdAt: r.createdAt.toISOString(),
  }))

  return NextResponse.json({ insights: items })
}

/**
 * POST — save a new insight.
 * Body: { question, answer, sources, title?, conversationId? }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  const scoped = getScopedIds(session)
  if (!scoped) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    question?: string
    answer?: string
    sources?: AiSource[]
    title?: string
    conversationId?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const question = (body.question ?? "").trim()
  const answer = (body.answer ?? "").trim()
  if (!question || !answer) {
    return NextResponse.json({ error: "question and answer are required" }, { status: 400 })
  }

  // Only allow linking to a conversation this user owns (optional).
  let conversationId: string | null = null
  if (body.conversationId) {
    const owned = await prisma.aiConversation.findFirst({
      where: {
        id: body.conversationId,
        userId: scoped.userId,
        organizationId: scoped.organizationId,
      },
      select: { id: true },
    })
    if (owned) conversationId = owned.id
  }

  const sources = Array.isArray(body.sources)
    ? body.sources.filter((s) => !!s && typeof s.id === "string" && typeof s.url === "string")
    : []

  const insight = await prisma.aiInsight.create({
    data: {
      userId: scoped.userId,
      organizationId: scoped.organizationId,
      conversationId,
      title: (body.title ?? "").trim().slice(0, 160) || null,
      question,
      answer,
      sources: sources as unknown as Prisma.InputJsonValue,
    },
  })

  const card: AiAnswerCard = { answer, sources, caveats: [] }
  return NextResponse.json({ id: insight.id, title: insight.title, card })
}
