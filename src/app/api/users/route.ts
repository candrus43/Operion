import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

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

// TODO: When adding POST (user creation/invite), enforce tier user caps here:
// - Fetch org.subscriptionTier
// - SOLO: max 1 user, TEAM: max 5 users, ENTERPRISE: unlimited
// - Return 403 if limit reached, with upgrade message
// - See GET /api/organization for TIER_LIMITS reference
