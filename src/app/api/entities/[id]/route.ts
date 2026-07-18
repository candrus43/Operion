import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/permissions"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const entity = await prisma.entity.findFirst({
    where: { id, organizationId: orgId },
    include: {
      _count: {
        select: { projects: true, tasks: true, contacts: true, documents: true },
      },
      projects: {
        orderBy: { updatedAt: "desc" },
        take: 10,
      },
      tasks: {
        include: { assignee: true, project: true },
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
      contacts: {
        orderBy: { createdAt: "desc" },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!entity) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(entity)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requireRole("OWNER", "EXECUTIVE_ASSISTANT")
  if (perm instanceof NextResponse) return perm

  const { id } = await params
  const body = await req.json()
  const { name, type, metadata } = body

  const existing = await prisma.entity.findFirst({
    where: { id, organizationId: perm.orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const entity = await prisma.entity.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(type && { type }),
      ...(metadata !== undefined && { metadata: JSON.stringify(metadata) }),
    },
  })

  return NextResponse.json(entity)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requireRole("OWNER", "EXECUTIVE_ASSISTANT")
  if (perm instanceof NextResponse) return perm

  const { id } = await params

  const existing = await prisma.entity.findFirst({
    where: { id, organizationId: perm.orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.entity.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
