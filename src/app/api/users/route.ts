import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendTeamInviteEmail } from "@/lib/email"
import { applyRateLimit } from "@/lib/rate-limit"

import { TIER_LIMITS } from "@/lib/tier-limits"

const VALID_ROLES = ["OWNER", "EXECUTIVE_ASSISTANT", "OPERATIONS_MANAGER", "STAFF", "READ_ONLY"]

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId

  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, email: true, image: true, role: true, createdAt: true },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const limit = await applyRateLimit(req, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const currentUserRole = (session.user as any).role
  const currentUserId = (session.user as any).id
  const orgId = (session.user as any).organizationId

  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 })
  }

  // Only OWNER can invite users
  if (currentUserRole !== "OWNER") {
    return NextResponse.json({ error: "Only owners can invite users" }, { status: 403 })
  }

  // Enforce tier user caps
  const [org, userCount] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { subscriptionTier: true, name: true },
    }),
    prisma.user.count({ where: { organizationId: orgId } }),
  ])

  const tier = org?.subscriptionTier || "SOLO"
  const orgName = org?.name || "Operion"
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

  if (role && !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()

  // Check for duplicate email in this org, regardless of casing.
  const existingUser = await prisma.user.findFirst({
    where: {
      email: { equals: normalizedEmail, mode: "insensitive" },
      organizationId: orgId,
    },
  })

  if (existingUser) {
    return NextResponse.json({ error: "A user with this email already exists in your organization" }, { status: 409 })
  }

  // Generate invite token
  const inviteToken = randomBytes(32).toString("hex")

  const user = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      role: role || "STAFF",
      status: "PENDING",
      inviteToken,
      organizationId: orgId,
    },
    select: { id: true, name: true, email: true, image: true, role: true, status: true, createdAt: true },
  })

  // Try to send invite email
  const emailSent = await sendTeamInviteEmail({
    email: user.email,
    name: user.name,
    orgName,
    invitedByName: session.user.name || "A team member",
    inviteToken,
  })

  // Create audit log for the invitation
  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: currentUserId,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      details: JSON.stringify({ invitedEmail: email, invitedName: name, role: user.role, emailSent }),
    },
  })

  return NextResponse.json(
    {
      ...user,
      inviteEmailSent: emailSent,
      inviteNote: emailSent
        ? undefined
        : "Email service not configured. The user can sign in at " + (process.env.NEXTAUTH_URL || "https://operion.ctonew.app") + "/login",
    },
    { status: 201 }
  )
}
