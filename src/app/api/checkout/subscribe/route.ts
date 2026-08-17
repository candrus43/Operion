import { NextResponse } from "next/server"
import { applyRateLimit } from "@/lib/rate-limit"
import { createCheckoutSession, getAppBaseUrl, isPlan, resolveClientReferenceId } from "@/lib/checkout"

/**
 * Session B of the two-session purchase flow (owner decision 2026-08-15).
 *
 * Creates a mode=subscription Checkout Session with ONLY the monthly price
 * (Founder $249/mo / Studio $499/mo) and trial_period_days=30, so the first
 * recurring charge lands on day 31.
 *
 * Called by the /complete-subscription page (Session A success landing) with
 * the same plan / customerEmail / client_reference_id that Session A carried.
 * Also used by the webhook to build the Session B link emailed to customers
 * who complete Session A but abandon the flow.
 */
export async function POST(request: Request) {
  const limit = await applyRateLimit(request, { maxRequests: 30, windowMs: 60_000 })
  if (limit) return limit

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
  if (!isPlan(plan)) {
    return NextResponse.json({ error: "plan must be Founder or Studio" }, { status: 400 })
  }
  if (customerEmail !== undefined && (typeof customerEmail !== "string" || !customerEmail.trim())) {
    return NextResponse.json({ error: "customerEmail must be a non-empty string" }, { status: 400 })
  }

  try {
    const clientReferenceId = await resolveClientReferenceId(body as Record<string, unknown>)

    const session = await createCheckoutSession({
      plan,
      step: "subscription",
      customerEmail: typeof customerEmail === "string" ? customerEmail.trim() : undefined,
      clientReferenceId,
      baseUrl: getAppBaseUrl(request),
    })

    if (!session.url) {
      console.error("Stripe Checkout returned a session without a URL", session.id)
      return NextResponse.json({ error: "Unable to create subscription session" }, { status: 502 })
    }

    console.log(
      `💳 Session B (subscription) created: ${session.id} plan=${plan} ` +
        `mode=${session.mode} trial=30d ref=${clientReferenceId ?? "none"}`
    )
    return NextResponse.json({ url: session.url, sessionId: session.id })
  } catch (error) {
    console.error("Stripe subscription session creation failed:", error)
    return NextResponse.json({ error: "Unable to create subscription session" }, { status: 502 })
  }
}

export const dynamic = "force-dynamic"
