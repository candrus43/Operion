import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
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

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
    include: {
      entity: {
        select: {
          id: true,
          name: true,
          projects: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(contact)
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
  const { name, company, position, phone, email, entityId, notes } = body

  const existing = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(company !== undefined && { company: company || null }),
      ...(position !== undefined && { position: position || null }),
      ...(phone !== undefined && { phone: phone || null }),
      ...(email !== undefined && { email: email || null }),
      ...(entityId !== undefined && { entityId: entityId || null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: {
      entity: { select: { id: true, name: true } },
    },
  })

  // Fire-and-forget: create audit log (non-blocking)
  void createAuditLog({
    organizationId: orgId,
    userId,
    action: "UPDATE",
    entity: "Contact",
    entityId: contact.id,
    details: JSON.stringify({ name: contact.name, company: contact.company }),
  })

  return NextResponse.json(contact)
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

  const existing = await prisma.contact.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Store audit log before deleting
  void createAuditLog({
    organizationId: orgId,
    userId,
    action: "DELETE",
    entity: "Contact",
    entityId: id,
    details: JSON.stringify({ name: existing.name, company: existing.company }),
  })

  await prisma.contact.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
