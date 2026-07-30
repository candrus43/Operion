import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id
  const orgId = (session.user as any).organizationId

  const note = await prisma.executiveNote.findUnique({
    where: { userId },
    select: { content: true, updatedAt: true },
  })

  return NextResponse.json(note ?? { content: "", updatedAt: null })
}

export async function PUT(req: NextRequest) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id
  const orgId = (session.user as any).organizationId

  const { content } = await req.json()

  if (typeof content !== "string") {
    return NextResponse.json({ error: "Content must be a string" }, { status: 400 })
  }

  const note = await prisma.executiveNote.upsert({
    where: { userId },
    create: {
      userId,
      organizationId: orgId,
      content,
    },
    update: {
      content,
    },
    select: { content: true, updatedAt: true },
  })

  return NextResponse.json(note)
}
