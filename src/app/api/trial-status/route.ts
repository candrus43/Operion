import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const limit = await applyRateLimit(req, { maxRequests: 60, windowMs: 60_000 })
  if (limit) return limit

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const orgId = (session.user as any).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "No organization" }, { status: 400 })
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      subscriptionStatus: true,
      trialStartDate: true,
      trialEndDate: true,
    },
  })

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 })
  }

  const now = new Date()
  const trialEndDate = org.trialEndDate
  const daysRemaining = trialEndDate
    ? Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Auto-expire if trial has passed but status hasn't been updated
  let status = org.subscriptionStatus
  if (status === "TRIAL" && trialEndDate && trialEndDate < now) {
    status = "EXPIRED"
    // Persist the expired status so middleware checks pick it up
    await prisma.organization.update({
      where: { id: orgId },
      data: { subscriptionStatus: "EXPIRED" },
    })
  }

  return NextResponse.json({
    status,
    trialStartDate: org.trialStartDate,
    trialEndDate: org.trialEndDate,
    daysRemaining: daysRemaining !== null ? Math.max(0, daysRemaining) : null,
  })
}
