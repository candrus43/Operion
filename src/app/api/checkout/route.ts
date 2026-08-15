import Stripe from "stripe"
import { NextResponse } from "next/server"

const PLAN_CONFIG = {
  Founder: {
    monthlyPriceId: "price_1TyY65ADHNbdtKNS9M83pmJc", // $249/mo — Operion Solo — Monthly (live)
    setupPriceId: "price_1TyY95ADHNbdtKNSdZYrvGV7", // $2,500 one-time — Operion Solo — Setup (live)
  },
  Studio: {
    monthlyPriceId: "price_1TyYB3ADHNbdtKNSacUZufAC", // $499/mo — Operion Team — Monthly (live)
    setupPriceId: "price_1TyYD6ADHNbdtKNSgbvfZQ6A", // $5,000 one-time — Operion Team — Setup (live)
  },
} as const

type Plan = keyof typeof PLAN_CONFIG

function appUrl(request: Request): string {
  return (process.env.NEXTAUTH_URL || new URL(request.url).origin).replace(/\/$/, "")
}

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY is not configured")
    return NextResponse.json({ error: "Payment service is not configured" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be a JSON object" }, { status: 400 })
  }

  const { plan, customerEmail } = body as Record<string, unknown>
  if (plan !== "Founder" && plan !== "Studio") {
    return NextResponse.json({ error: "plan must be Founder or Studio" }, { status: 400 })
  }
  if (customerEmail !== undefined && (typeof customerEmail !== "string" || !customerEmail.trim())) {
    return NextResponse.json({ error: "customerEmail must be a non-empty string" }, { status: 400 })
  }

  try {
    const stripe = new Stripe(secretKey)
    const selectedPlan = PLAN_CONFIG[plan as Plan]
    const baseUrl = appUrl(request)
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        { price: selectedPlan.monthlyPriceId, quantity: 1 },
        // One-time setup fee — billed with the subscription's first invoice.
        { price: selectedPlan.setupPriceId, quantity: 1 },
      ],
      subscription_data: {
        // The subscription starts immediately; this only defers the recurring invoice.
        trial_period_days: 30,
      },
      success_url: `${baseUrl}/home`,
      cancel_url: `${baseUrl}/pricing`,
      ...(typeof customerEmail === "string" ? { customer_email: customerEmail.trim() } : {}),
    })

    if (!session.url) {
      console.error("Stripe Checkout returned a session without a URL", session.id)
      return NextResponse.json({ error: "Unable to create checkout session" }, { status: 502 })
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Stripe Checkout session creation failed:", error)
    return NextResponse.json({ error: "Unable to create checkout session" }, { status: 502 })
  }
}
