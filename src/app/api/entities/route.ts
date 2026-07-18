import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/permissions"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const orgId = (session.user as any).organizationId
  const entities = await prisma.entity.findMany({
    where: { organizationId: orgId },
    include: {
      _count: { select: { projects: true, tasks: true, contacts: true, documents: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(entities)
}

export async function POST(req: Request) {
  const perm = await requireRole("OWNER", "EXECUTIVE_ASSISTANT")
  if (perm instanceof NextResponse) return perm

  const body = await req.json()
  const { name, type, metadata } = body
  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
  }
  const entity = await prisma.entity.create({
    data: {
      name,
      type,
      metadata: metadata ? JSON.stringify(metadata) : "{}",
      organizationId: perm.orgId,
    },
  })
  return NextResponse.json(entity, { status: 201 })
}
