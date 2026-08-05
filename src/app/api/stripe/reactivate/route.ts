import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getStripe } from "@/lib/stripe"
import { applyRateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  const limit = await applyRateLimit(request, { maxRequests: 10, windowMs: 60_000 })
  if (limit) return limit

  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as any).role
    if (role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can reactivate subscriptions" }, { status: 403 })
    }

    const orgId = (session.user as any).organizationId
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 })
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    if (org.subscriptionStatus !== "CANCELLED") {
      return NextResponse.json({ error: "Subscription is not cancelled" }, { status: 400 })
    }

    if (org.stripeSubscriptionId) {
      // Reactivate via Stripe — remove cancel_at_period_end
      const stripe = getStripe()
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: false,
      })
    }

    await prisma.organization.update({
      where: { id: orgId },
      data: { subscriptionStatus: "ACTIVE" },
    })

    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: (session.user as any).id,
        action: "UPDATE",
        entity: "Subscription",
        entityId: orgId,
        details: JSON.stringify({ action: "reactivated" }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Stripe reactivate error:", error)
    return NextResponse.json(
      { error: "Unable to reactivate subscription" },
      { status: 500 }
    )
  }
}
