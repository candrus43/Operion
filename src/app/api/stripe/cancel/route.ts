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
      return NextResponse.json({ error: "Only owners can cancel subscriptions" }, { status: 403 })
    }

    const orgId = (session.user as any).organizationId
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { reason, feedback, cancelImmediately } = body as {
      reason?: string
      feedback?: string
      cancelImmediately?: boolean
    }

    // Fetch org with Stripe subscription info
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        subscriptionStatus: true,
        subscriptionTier: true,
        name: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    if (!org.stripeSubscriptionId) {
      // No Stripe subscription to cancel — just mark as CANCELLED locally
      await prisma.organization.update({
        where: { id: orgId },
        data: { subscriptionStatus: "CANCELLED" },
      })

      await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          userId: (session.user as any).id,
          action: "UPDATE",
          entity: "Subscription",
          entityId: orgId,
          details: JSON.stringify({
            action: "cancelled",
            reason: reason || null,
            feedback: feedback || null,
            noStripeSubscription: true,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        cancelledAt: new Date().toISOString(),
        noStripeSubscription: true,
      })
    }

    // Cancel via Stripe
    const stripe = getStripe()

    if (cancelImmediately) {
      // Immediately cancel the subscription
      await stripe.subscriptions.cancel(org.stripeSubscriptionId)
    } else {
      // Cancel at end of billing period
      await stripe.subscriptions.update(org.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })
    }

    // Update org status locally
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        subscriptionStatus: "CANCELLED",
      },
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: (session.user as any).id,
        action: "UPDATE",
        entity: "Subscription",
        entityId: orgId,
        details: JSON.stringify({
          action: cancelImmediately ? "cancelled_immediately" : "cancel_at_period_end",
          stripeSubscriptionId: org.stripeSubscriptionId,
          reason: reason || null,
          feedback: feedback || null,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      cancelledAt: new Date().toISOString(),
      cancelImmediately: cancelImmediately ?? false,
    })
  } catch (error: any) {
    console.error("Stripe cancel error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    )
  }
}
