import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import type { AiConversationSummary } from "@/lib/ai/types"

type SessionUser = { user?: { id?: string; organizationId?: string } }
function getScopedIds(session: SessionUser | null) {
  const userId = session?.user?.id
  const organizationId = session?.user?.organizationId
  if (!userId || !organizationId) return null
  return { userId, organizationId }
}

/** GET — list the current user's persisted conversations (org + user scoped). */
export async function GET() {
  const session = await auth()
  const scoped = getScopedIds(session)
  if (!scoped) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await prisma.aiConversation.findMany({
    where: { userId: scoped.userId, organizationId: scoped.organizationId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  })

  const items: AiConversationSummary[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    messageCount: r._count.messages,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return NextResponse.json({ conversations: items })
}

/**
 * POST — create a new conversation for the current user + org.
 * Body: { title: string }
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  const scoped = getScopedIds(session)
  if (!scoped) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { title?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  const title = (body.title ?? "").trim().slice(0, 160) || "New conversation"

  const convo = await prisma.aiConversation.create({
    data: {
      title,
      userId: scoped.userId,
      organizationId: scoped.organizationId,
    },
  })

  return NextResponse.json({ id: convo.id, title: convo.title })
}
