import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/permissions"
import { applyRateLimit } from "@/lib/rate-limit"
import { TIER_LIMITS } from "@/lib/tier-limits"

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

export async function GET(req: Request) {
  const limit = await applyRateLimit(req, { maxRequests: 60, windowMs: 60_000 })
  if (limit) return limit

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
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const perm = await requireRole("OWNER", "EXECUTIVE_ASSISTANT")
  if (perm instanceof NextResponse) return perm

  const body = await req.json()
  const { name, type, metadata } = body
  if (!name || !type) {
    return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
  }

  // Tier enforcement: check entity limit
  const org = await prisma.organization.findUnique({
    where: { id: perm.orgId },
    select: { subscriptionTier: true },
  })
  const tier = org?.subscriptionTier || "SOLO"
  const maxEntities = TIER_LIMITS[tier]?.maxEntities
  if (maxEntities !== null && maxEntities !== undefined) {
    const currentCount = await prisma.entity.count({ where: { organizationId: perm.orgId } })
    if (currentCount >= maxEntities) {
      const message = tier === "SOLO"
        ? "Solo plan limited to 3 entities. Upgrade to Team."
        : "Team plan limited to 25 entities. Upgrade to Enterprise."
      return NextResponse.json({ error: message }, { status: 403 })
    }
  }

  const entity = await prisma.entity.create({
    data: {
      name,
      type,
      metadata: metadata ? JSON.stringify(metadata) : "{}",
      organizationId: perm.orgId,
    },
  })

  // Fire-and-forget: create audit log (non-blocking)
  void createAuditLog({
    organizationId: perm.orgId,
    userId: perm.userId,
    action: "CREATE",
    entity: "Entity",
    entityId: entity.id,
    details: JSON.stringify({ name: entity.name, type: entity.type }),
  })

  return NextResponse.json(entity, { status: 201 })
}
