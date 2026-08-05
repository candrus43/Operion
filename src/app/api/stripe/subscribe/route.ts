import { NextResponse } from "next/server"
import { getStripe, PRICE_ID_MAP } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { applyRateLimit } from "@/lib/rate-limit"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.redirect(new URL("/login?redirect=/pricing", request.url))
  const sessionOrgId = (session.user as any).organizationId
  const limit = await applyRateLimit(request, { maxRequests: 60, windowMs: 60_000 })
  if (limit) return limit

  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get("plan") as "SOLO" | "TEAM"
    const customerId = searchParams.get("customerId")

    if (!plan || !customerId) {
      return NextResponse.redirect(
        new URL("/pricing?checkout=error", request.url).toString()
      )
    }

    if (!["SOLO", "TEAM"].includes(plan)) {
      return NextResponse.redirect(
        new URL("/pricing?checkout=error", request.url).toString()
      )
    }

    const monthlyPriceId = PRICE_ID_MAP[`${plan}_MONTHLY`]
    if (!monthlyPriceId) {
      return NextResponse.redirect(
        new URL("/pricing?checkout=error", request.url).toString()
      )
    }

    // Look up org by Stripe customer ID instead of orgId to avoid exposing orgId in URLs
    const org = await prisma.organization.findFirst({
      where: { stripeCustomerId: customerId, id: sessionOrgId },
      select: { id: true, subscriptionStatus: true },
    })

    if (!org) {
      return NextResponse.redirect(
        new URL("/pricing?checkout=error", request.url).toString()
      )
    }

    const isTrial = org.subscriptionStatus === "TRIAL"

    const stripe = getStripe()
    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000"

    const subscriptionData: Record<string, any> = {}
    if (isTrial) {
      subscriptionData.trial_period_days = 30
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: org.id,
      metadata: { plan, orgId: org.id, step: "subscription" },
      line_items: [{ price: monthlyPriceId, quantity: 1 }],
      mode: "subscription",
      ...(Object.keys(subscriptionData).length > 0 && { subscription_data: subscriptionData }),
      success_url: `${origin}/home?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    })

    return NextResponse.redirect(session.url!)
  } catch (error: any) {
    console.error("Subscription redirect error:", error)
    return NextResponse.redirect(
      new URL("/pricing?checkout=error", request.url).toString()
    )
  }
}
