import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getStripe, PRICE_ID_MAP } from "@/lib/stripe"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const orgId = (session.user as any).organizationId
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 })
    }

    const body = await request.json()
    const { plan, mode } = body as { plan: "SOLO" | "TEAM"; mode: "setup" | "monthly" }

    if (!plan || !mode) {
      return NextResponse.json({ error: "plan and mode are required" }, { status: 400 })
    }

    if (!["SOLO", "TEAM"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan. Must be SOLO or TEAM" }, { status: 400 })
    }

    if (!["setup", "monthly"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode. Must be setup or monthly" }, { status: 400 })
    }

    // Validate both prices exist
    const setupPriceKey = `${plan}_SETUP`
    const monthlyPriceKey = `${plan}_MONTHLY`
    const setupPriceId = PRICE_ID_MAP[setupPriceKey]
    const monthlyPriceId = PRICE_ID_MAP[monthlyPriceKey]

    if (!setupPriceId || !monthlyPriceId) {
      return NextResponse.json(
        { error: `Missing price for ${plan}` },
        { status: 400 }
      )
    }

    // Find the org
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, stripeCustomerId: true },
    })

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const stripe = getStripe()

    // Create or retrieve Stripe customer — handle mode mismatch
    let stripeCustomerId = org.stripeCustomerId
    if (stripeCustomerId) {
      try {
        // Verify the customer is accessible with current key
        await stripe.customers.retrieve(stripeCustomerId)
      } catch {
        // Customer doesn't exist in this mode — clear it and create new
        stripeCustomerId = null
      }
    }
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: { orgId: org.id },
      })
      stripeCustomerId = customer.id
      await prisma.organization.update({
        where: { id: org.id },
        data: { stripeCustomerId },
      })
    }

    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000"

    const isSetup = mode === "setup"

    if (isSetup) {
      // Standalone setup fee payment
      const sessionConfig: any = {
        customer: stripeCustomerId,
        client_reference_id: org.id,
        metadata: { plan, orgId: org.id },
        line_items: [{ price: setupPriceId, quantity: 1 }],
        mode: "payment",
        success_url: `${origin}/home?checkout=success`,
        cancel_url: `${origin}/pricing?checkout=cancelled`,
      }
      const checkoutSession = await stripe.checkout.sessions.create(sessionConfig)
      return NextResponse.json({ url: checkoutSession.url })
    }

    // Monthly: setup fee as payment, then subscription with 30-day trial
    // Create a payment checkout for the setup fee that redirects to subscription on success
    const subscriptionUrl = `${origin}/api/stripe/subscribe?plan=${plan}&customerId=${stripeCustomerId}&orgId=${org.id}`

    const paymentSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      client_reference_id: org.id,
      metadata: { plan, orgId: org.id, step: "setup" },
      line_items: [{ price: setupPriceId, quantity: 1 }],
      mode: "payment",
      success_url: subscriptionUrl,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
    })

    return NextResponse.json({ url: paymentSession.url })
  } catch (error: any) {
    console.error("Checkout session error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
