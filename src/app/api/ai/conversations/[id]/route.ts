import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { AiAnswerCard, AiChatMessage, AiConversationDetail } from "@/lib/ai/types"
import type { Prisma } from "@prisma/client"
function toCard(json: Prisma.JsonValue | null): AiAnswerCard | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null
  const c = json as Record<string, unknown>
  if (typeof c.answer !== "string") return null
  return {
    answer: c.answer,
    sources: Array.isArray(c.sources) ? (c.sources as AiAnswerCard["sources"]) : [],
    caveats: Array.isArray(c.caveats) ? (c.caveats as string[]) : [],
  }
}

interface RouteCtx {
  params: Promise<{ id: string }>
}

type SessionUser = { user?: { id?: string; organizationId?: string } }
function getScopedIds(session: SessionUser | null) {
  const userId = session?.user?.id
  const organizationId = session?.user?.organizationId
  if (!userId || !organizationId) return null
  return { userId, organizationId }
}

/** GET — fetch a conversation's full transcript (org + user scoped). */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params
  const session = await auth()
  const scoped = getScopedIds(session)
  if (!scoped) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const convo = await prisma.aiConversation.findFirst({
    where: {
      id,
      userId: scoped.userId,
      organizationId: scoped.organizationId,
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!convo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const messages: AiChatMessage[] = convo.messages.map((m) =>
    m.role === "assistant"
      ? { role: "assistant", card: toCard(m.card) }
      : { role: "user", content: m.content }
  )

  const detail: AiConversationDetail = {
    id: convo.id,
    title: convo.title,
    messages,
    createdAt: convo.createdAt.toISOString(),
    updatedAt: convo.updatedAt.toISOString(),
  }

  return NextResponse.json({ conversation: detail })
}

/** DELETE — remove a conversation (org + user scoped). */
export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params
  const session = await auth()
  const scoped = getScopedIds(session)
  if (!scoped) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await prisma.aiConversation.findFirst({
    where: {
      id,
      userId: scoped.userId,
      organizationId: scoped.organizationId,
    },
    select: { id: true },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Insights referencing this conversation are kept (conversationId set null).
  await prisma.aiConversation.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
}
