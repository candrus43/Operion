import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/permissions"
import { applyRateLimit } from "@/lib/rate-limit"

// ── Audit log helper ────────────────────────────────────────────────

async function createAuditLog(params: {
  organizationId: string
  userId: string
  action: string
  entity: string
  entityId: string
  details?: string
}) {
  await prisma.auditLog.create({ data: params })
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await applyRateLimit(req, { maxRequests: 60, windowMs: 60_000 })
  if (limit) return limit

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
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

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

  // Fire-and-forget: create audit log (non-blocking)
  void createAuditLog({
    organizationId: perm.orgId,
    userId: perm.userId,
    action: "UPDATE",
    entity: "Project",
    entityId: project.id,
    details: JSON.stringify({ name: project.name, status: project.status }),
  })

  return NextResponse.json(project)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const perm = await requireRole("OWNER", "EXECUTIVE_ASSISTANT")
  if (perm instanceof NextResponse) return perm

  const { id } = await params

  const existing = await prisma.project.findFirst({
    where: { id, organizationId: perm.orgId },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Store audit log before deleting
  void createAuditLog({
    organizationId: perm.orgId,
    userId: perm.userId,
    action: "DELETE",
    entity: "Project",
    entityId: id,
    details: JSON.stringify({ name: existing.name }),
  })

  await prisma.project.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
