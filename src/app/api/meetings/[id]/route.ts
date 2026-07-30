import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

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
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = (session.user as any).organizationId

  const meeting = await prisma.meeting.findFirst({
    where: { id, organizationId: orgId },
    include: {
      project: { select: { id: true, name: true } },
    },
  })

  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json(meeting)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id
  const body = await req.json()
  const { title, date, location, projectId, notes } = body

  const existing = await prisma.meeting.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const meeting = await prisma.meeting.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(location !== undefined && { location: location || null }),
      ...(projectId !== undefined && { projectId: projectId || null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: {
      project: { select: { id: true, name: true } },
    },
  })

  // Fire-and-forget: create audit log (non-blocking)
  void createAuditLog({
    organizationId: orgId,
    userId,
    action: "UPDATE",
    entity: "Meeting",
    entityId: meeting.id,
    details: JSON.stringify({ title: meeting.title, date: meeting.date }),
  })

  return NextResponse.json(meeting)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id

  const existing = await prisma.meeting.findFirst({
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
    entity: "Meeting",
    entityId: id,
    details: JSON.stringify({ title: existing.title, date: existing.date }),
  })

  await prisma.meeting.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
