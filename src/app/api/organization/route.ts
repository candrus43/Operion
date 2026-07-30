import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getBranding } from "@/lib/branding"

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
    const branding = getBranding()
    return NextResponse.json({
      name: "Operion",
      tier: "SOLO",
      maxUsers: 1,
      maxEntities: 3,
      currentUserCount: 0,
      currentEntityCount: 0,
      logoUrl: branding.logoUrl,
    })
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
  const branding = getBranding()

  return NextResponse.json({
    name: org?.name || "Operion",
    tier,
    maxUsers: limits.maxUsers,
    maxEntities: limits.maxEntities,
    currentUserCount: userCount,
    currentEntityCount: entityCount,
    subscriptionStatus: org?.subscriptionStatus || "TRIAL",
    trialEndDate: org?.trialEndDate || null,
    logoUrl: branding.logoUrl,
  })
}

export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as any).role
  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can update organization settings" }, { status: 403 })
  }

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 })
  }

  let body: { name?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { name } = body

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
  }

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { name: name.trim() },
    select: {
      name: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      trialEndDate: true,
    },
  })

  return NextResponse.json(org)
}
