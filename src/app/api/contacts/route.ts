import { NextRequest, NextResponse } from "next/server"
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

export async function GET(req: NextRequest) {
  const limit = await applyRateLimit(req, { maxRequests: 60, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get("entityId")
  const search = searchParams.get("search")

  const where: any = { organizationId: orgId }
  if (entityId && entityId !== "all") {
    where.entityId = entityId
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { company: { contains: search } },
      { email: { contains: search } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: {
      entity: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(contacts)
}

export async function POST(req: Request) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  const userId = (session.user as any).id
  const body = await req.json()

  const { name, company, position, phone, email, entityId, notes } = body

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const contact = await prisma.contact.create({
    data: {
      name,
      company: company || null,
      position: position || null,
      phone: phone || null,
      email: email || null,
      organizationId: orgId,
      entityId: entityId || null,
      notes: notes || null,
    },
    include: {
      entity: { select: { id: true, name: true } },
    },
  })

  // Fire-and-forget: create audit log (non-blocking)
  void createAuditLog({
    organizationId: orgId,
    userId,
    action: "CREATE",
    entity: "Contact",
    entityId: contact.id,
    details: JSON.stringify({ name: contact.name, company: contact.company }),
  })

  return NextResponse.json(contact, { status: 201 })
}
