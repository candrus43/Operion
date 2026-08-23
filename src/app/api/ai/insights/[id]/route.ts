import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

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

/** PATCH — update an insight's title (org + user scoped). */
export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params
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

  const existing = await prisma.aiInsight.findFirst({
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

  const title = (body.title ?? "").trim().slice(0, 160)
  const updated = await prisma.aiInsight.update({
    where: { id: existing.id },
    data: { title: title || null },
    select: { id: true, title: true },
  })

  return NextResponse.json({ id: updated.id, title: updated.title })
}

/** DELETE — remove a saved insight (org + user scoped). */
export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const { id } = await ctx.params
  const session = await auth()
  const scoped = getScopedIds(session)
  if (!scoped) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const existing = await prisma.aiInsight.findFirst({
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

  await prisma.aiInsight.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
}
