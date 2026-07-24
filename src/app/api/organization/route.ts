import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const TIER_LIMITS: Record<string, { maxUsers: number | null; maxEntities: number | null }> = {
  SOLO: { maxUsers: 1, maxEntities: 3 },
  TEAM: { maxUsers: 5, maxEntities: 25 },
  ENTERPRISE: { maxUsers: null, maxEntities: null },
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  if (!orgId) {
    return NextResponse.json({ name: "Operion", tier: "SOLO", maxUsers: 1, maxEntities: 3, currentUserCount: 0, currentEntityCount: 0 })
  }

  const [org, userCount, entityCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, subscriptionTier: true, subscriptionStatus: true, trialEndDate: true },
    }),
    prisma.user.count({ where: { organizationId: orgId } }),
    prisma.entity.count({ where: { organizationId: orgId } }),
  ])

  const tier = org?.subscriptionTier || "SOLO"
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.SOLO

  return NextResponse.json({
    name: org?.name || "Operion",
    tier,
    maxUsers: limits.maxUsers,
    maxEntities: limits.maxEntities,
    currentUserCount: userCount,
    currentEntityCount: entityCount,
    subscriptionStatus: org?.subscriptionStatus || "TRIAL",
    trialEndDate: org?.trialEndDate || null,
  })
}
