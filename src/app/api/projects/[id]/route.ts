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

  const project = await prisma.project.findFirst({
    where: { id, organizationId: orgId },
    include: {
      entity: true,
      tasks: {
        include: {
          assignee: true,
          dependsOn: { select: { id: true, title: true, status: true } },
        },
        orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
      },
      documents: { orderBy: { createdAt: "desc" } },
      meetings: { orderBy: { date: "desc" } },
      _count: { select: { tasks: true, documents: true, meetings: true } },
    },
  })

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(project)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requireRole("OWNER", "EXECUTIVE_ASSISTANT", "OPERATIONS_MANAGER")
  if (perm instanceof NextResponse) return perm

  const { id } = await params
  const body = await req.json()
  const { name, description, status, phase, progress, budget, startDate, targetDate, entityId } = body

  const existing = await prisma.project.findFirst({
    where: { id, organizationId: perm.orgId },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(phase !== undefined && { phase }),
      ...(progress !== undefined && { progress }),
      ...(budget !== undefined && { budget: budget ? parseFloat(String(budget)) : null }),
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
      ...(entityId !== undefined && { entityId: entityId || null }),
    },
    include: {
      entity: true,
      _count: { select: { tasks: true } },
    },
  })

  return NextResponse.json(project)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const perm = await requireRole("OWNER", "EXECUTIVE_ASSISTANT")
  if (perm instanceof NextResponse) return perm

  const { id } = await params

  const existing = await prisma.project.findFirst({
    where: { id, organizationId: perm.orgId },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.project.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
