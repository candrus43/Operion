import { NextResponse } from "next/server"
import { getStripe, PRICE_ID_MAP } from "@/lib/stripe"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get("plan") as "SOLO" | "TEAM"
    const customerId = searchParams.get("customerId")
    const orgId = searchParams.get("orgId")

    if (!plan || !customerId || !orgId) {
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

    const stripe = getStripe()
    const origin = request.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000"

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: orgId,
      metadata: { plan, orgId, step: "subscription" },
      line_items: [{ price: monthlyPriceId, quantity: 1 }],
      mode: "subscription",
      subscription_data: {
        trial_period_days: 30,
      },
      success_url: `${origin}/dashboard?checkout=success`,
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
