import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"
import crypto from "crypto"

export async function POST(request: Request) {
  const limit = await applyRateLimit(request, { maxRequests: 10, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Only OWNER can grant support access
  const role = (session.user as any).role
  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only organization owners can grant support access" }, { status: 403 })
  }

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 400 })
  }

  let body: { durationMinutes?: number; writeAccess?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { durationMinutes, writeAccess } = body

  // Validate duration
  const allowedDurations = [30, 120, 480] // 30 min, 2 hours, 8 hours
  const duration = durationMinutes && allowedDurations.includes(durationMinutes) ? durationMinutes : 30

  if (!allowedDurations.includes(duration)) {
    return NextResponse.json({ error: "Duration must be 30, 120, or 480 minutes" }, { status: 400 })
  }

  // Check for existing active token — revoke it (only one active per org)
  const existingActive = await prisma.supportAccessToken.findFirst({
    where: {
      organizationId: orgId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  })

  if (existingActive) {
    await prisma.supportAccessToken.update({
      where: { id: existingActive.id },
      data: { revokedAt: new Date() },
    })
  }

  // Create new token
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + duration * 60 * 1000)

  const supportToken = await prisma.supportAccessToken.create({
    data: {
      organizationId: orgId,
      token,
      permissions: writeAccess ? "READ_WRITE" : "READ",
      expiresAt,
      createdBy: (session.user as any).id,
    },
  })

  // Audit log
  await prisma.auditLog.create({
    data: {
      organizationId: orgId,
      userId: (session.user as any).id,
      action: "CREATE",
      entity: "SupportAccessToken",
      entityId: supportToken.id,
      details: JSON.stringify({
        permissions: supportToken.permissions,
        expiresAt: supportToken.expiresAt.toISOString(),
        durationMinutes: duration,
      }),
    },
  })

  return NextResponse.json({
    token: supportToken.token,
    expiresAt: supportToken.expiresAt.toISOString(),
    permissions: supportToken.permissions,
  })
}
