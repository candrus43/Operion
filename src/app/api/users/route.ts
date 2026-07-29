import { NextRequest, NextResponse } from "next/server"
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

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true, image: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 })
  }

  // Enforce tier user caps
  const [org, userCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { subscriptionTier: true },
    }),
    prisma.user.count({ where: { organizationId: orgId } }),
  ])

  const tier = org?.subscriptionTier || "SOLO"
  const limits = TIER_LIMITS[tier] || TIER_LIMITS.SOLO
  const maxUsers = limits.maxUsers

  if (maxUsers !== null && userCount >= maxUsers) {
    return NextResponse.json(
      {
        error: "User limit reached",
        message: `Your ${tier} plan allows up to ${maxUsers} user${maxUsers === 1 ? "" : "s"}. Upgrade to add more team members.`,
        currentCount: userCount,
        maxAllowed: maxUsers,
        tier,
      },
      { status: 403 }
    )
  }

  // Create the user
  const body = await req.json()
  const { name, email, role } = body

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      role: role || "STAFF",
      organizationId: orgId,
    },
    select: { id: true, name: true, email: true, image: true, role: true },
  })

  return NextResponse.json(user, { status: 201 })
}
