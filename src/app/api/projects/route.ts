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

  const status = searchParams.get("status")
  const phase = searchParams.get("phase")
  const entityId = searchParams.get("entityId")

  const where: any = { organizationId: orgId }

  if (status && status !== "all") {
    where.status = status
  }
  if (phase && phase !== "all") {
    where.phase = phase
  }
  if (entityId) {
    where.entityId = entityId
  }

  const projects = await prisma.project.findMany({
    where,
    include: {
      entity: true,
      _count: { select: { tasks: true, documents: true, meetings: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(projects)
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

  const { name, description, status, phase, budget, startDate, targetDate, entityId } = body

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 })
  }

  const project = await prisma.project.create({
    data: {
      name,
      description: description || null,
      status: status || "ACTIVE",
      phase: phase || "ACQUISITION",
      progress: 0,
      budget: budget ? parseFloat(String(budget)) : null,
      startDate: startDate ? new Date(startDate) : null,
      targetDate: targetDate ? new Date(targetDate) : null,
      organizationId: orgId,
      entityId: entityId || null,
    },
    include: {
      entity: true,
      _count: { select: { tasks: true } },
    },
  })

  // Fire-and-forget: create audit log (non-blocking)
  void createAuditLog({
    organizationId: orgId,
    userId,
    action: "CREATE",
    entity: "Project",
    entityId: project.id,
    details: JSON.stringify({ name: project.name, status: project.status }),
  })

  return NextResponse.json(project, { status: 201 })
}
