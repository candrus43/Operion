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

  const document = await prisma.document.findFirst({
    where: { id, organizationId: orgId },
    include: {
      project: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  })

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(document)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id
  const body = await req.json()
  const { name, type, url, filePath, projectId, entityId } = body

  const existing = await prisma.document.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const document = await prisma.document.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(type !== undefined && { type }),
      ...(url !== undefined && { url: url || null }),
      ...(filePath !== undefined && { filePath: filePath || null }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(entityId !== undefined && { entityId: entityId || null }),
    },
    include: {
      project: { select: { id: true, name: true } },
      entity: { select: { id: true, name: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  })

  // Fire-and-forget: create audit log (non-blocking)
  void createAuditLog({
    organizationId: orgId,
    userId,
    action: "UPDATE",
    entity: "Document",
    entityId: document.id,
    details: JSON.stringify({ name: document.name, type: document.type }),
  })

  return NextResponse.json(document)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id
  const userRole = (session.user as any).role

  const existing = await prisma.document.findFirst({
    where: { id, organizationId: orgId },
  })
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // OWNER, EA, or uploader can delete
  const allowedRoles = ["OWNER", "EXECUTIVE_ASSISTANT"]
  const isUploader = existing.uploadedById === userId
  if (!allowedRoles.includes(userRole) && !isUploader) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Store audit log before deleting
  void createAuditLog({
    organizationId: orgId,
    userId,
    action: "DELETE",
    entity: "Document",
    entityId: id,
    details: JSON.stringify({ name: existing.name, type: existing.type }),
  })

  await prisma.document.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
