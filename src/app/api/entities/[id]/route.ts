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
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const perm = await requireRole("OWNER", "EXECUTIVE_ASSISTANT")
  if (perm instanceof NextResponse) return perm

  const { id } = await params
  const body = await req.json()
  const { name, type, metadata, parentEntityId, ownerContactId } = body

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
      ...(parentEntityId !== undefined && { parentEntityId: parentEntityId || null }),
      ...(ownerContactId !== undefined && { ownerContactId: ownerContactId || null }),
    },
  })

  // Fire-and-forget: create audit log (non-blocking)
  void createAuditLog({
    organizationId: perm.orgId,
    userId: perm.userId,
    action: "UPDATE",
    entity: "Entity",
    entityId: entity.id,
    details: JSON.stringify({ name: entity.name, type: entity.type }),
  })

  return NextResponse.json(entity)
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

  const existing = await prisma.entity.findFirst({
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
    entity: "Entity",
    entityId: id,
    details: JSON.stringify({ name: existing.name, type: existing.type }),
  })

  await prisma.entity.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
