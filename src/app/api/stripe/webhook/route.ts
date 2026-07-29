import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { getStripe, PRICE_ID_MAP } from "@/lib/stripe"
import Stripe from "stripe"

/**
 * Reverse lookup: price ID → plan name (e.g. "SOLO" | "TEAM")
 */
function priceIdToPlan(priceId: string): string | null {
  for (const [key, id] of Object.entries(PRICE_ID_MAP)) {
    if (id === priceId) {
      // Key format: "SOLO_SETUP", "SOLO_MONTHLY", "TEAM_SETUP", "TEAM_MONTHLY"
      return key.split("_")[0] // "SOLO" or "TEAM"
    }
  }
  return null
}

/**
 * Retrieve the subscription tier from a Stripe Subscription object.
 * Falls back to the price ID on the first subscription item.
 */
async function getTierFromSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription | string
): Promise<string | null> {
  const sub =
    typeof subscription === "string"
      ? await stripe.subscriptions.retrieve(subscription)
      : subscription

  const priceId = sub.items.data[0]?.price?.id
  if (!priceId) return null
  return priceIdToPlan(priceId)
}

export async function POST(request: Request) {
  // Read raw body — must happen before any other body consumption
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set")
    return new NextResponse("Webhook secret not configured", { status: 500 })
  }

  if (!signature) {
    console.warn("Missing stripe-signature header")
    return new NextResponse("Missing stripe-signature header", { status: 400 })
  }

  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message)
    return new NextResponse(`Signature verification failed: ${err.message}`, {
      status: 400,
    })
  }

  // --- Idempotency: skip already-processed events ---
  const existing = await prisma.stripeEvent.findUnique({
    where: { id: event.id },
  })
  if (existing) {
    // Already processed — acknowledge with 200 to prevent Stripe retries
    return new NextResponse(JSON.stringify({ received: true, dupe: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }

  // Record the event as processed (best-effort; failures below still record it
  // so we never retry a malformed event forever)
  await prisma.stripeEvent.create({
    data: {
      id: event.id,
      type: event.type,
    },
  })

  // --- Route by event type ---
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(stripe, event.data.object)
        break
      }
      case "customer.subscription.updated": {
        await handleSubscriptionUpdated(stripe, event.data.object)
        break
      }
      case "customer.subscription.deleted": {
        await handleSubscriptionDeleted(event.data.object)
        break
      }
      default:
        // Unhandled event type — acknowledged but not processed
        console.log(`Unhandled Stripe event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error processing webhook ${event.id} (${event.type}):`, err)
    // Still return 200 — we already recorded the event; don't retry
  }

  return new NextResponse(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })
}

/**
 * checkout.session.completed
 * Find the org by client_reference_id and activate the subscription.
 */
async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const orgId = session.client_reference_id
  if (!orgId) {
    console.warn("checkout.session.completed: missing client_reference_id")
    return
  }

  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!org) {
    console.warn(`checkout.session.completed: org not found: ${orgId}`)
    return
  }

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? org.stripeCustomerId

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null

  // Determine tier from metadata or subscription
  let tier = org.subscriptionTier
  if (session.metadata?.plan) {
    tier = session.metadata.plan
  } else if (stripeSubscriptionId) {
    const resolvedTier = await getTierFromSubscription(stripe, stripeSubscriptionId)
    if (resolvedTier) tier = resolvedTier
  }

  // Determine status
  let status = "ACTIVE"
  if (session.mode === "subscription") {
    status = "ACTIVE"
  } else if (session.mode === "payment") {
    // One-time setup fee — org is now active
    status = "ACTIVE"
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      subscriptionTier: tier,
      subscriptionStatus: status,
      stripeCustomerId: stripeCustomerId ?? undefined,
      stripeSubscriptionId: stripeSubscriptionId ?? undefined,
      trialEndDate: null, // clear trial; they've paid
    },
  })

  console.log(
    `✅ Org ${orgId} activated: tier=${tier}, status=${status}, ` +
      `customer=${stripeCustomerId}, sub=${stripeSubscriptionId}`
  )
}

/**
 * customer.subscription.updated
 * Sync tier and status from the updated subscription.
 */
async function handleSubscriptionUpdated(
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id

  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  })
  if (!org) {
    console.warn(`subscription.updated: org not found for customer ${customerId}`)
    return
  }

  const tier = await getTierFromSubscription(stripe, subscription)
  const status = mapStripeStatus(subscription.status)

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionTier: tier ?? org.subscriptionTier,
      subscriptionStatus: status,
      stripeSubscriptionId: subscription.id,
    },
  })

  console.log(
    `🔄 Org ${org.id} sub updated: tier=${tier}, status=${status}`
  )
}

/**
 * customer.subscription.deleted
 * Mark the org as CANCELLED.
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id

  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  })
  if (!org) {
    console.warn(`subscription.deleted: org not found for customer ${customerId}`)
    return
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      subscriptionStatus: "CANCELLED",
    },
  })

  console.log(`❌ Org ${org.id} subscription cancelled`)
}

/**
 * Map Stripe subscription status to our status enum.
 */
function mapStripeStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "ACTIVE"
    case "past_due":
    case "unpaid":
      return "ACTIVE" // still active but with payment issues
    case "canceled":
    case "incomplete_expired":
      return "CANCELLED"
    case "incomplete":
      return "TRIAL"
    default:
      return "TRIAL"
  }
}

/**
 * Disable body parsing — required for raw body access in Stripe webhook verification.
 * Note: In Next.js App Router, the body is not pre-parsed, but we explicitly
 * mark this route as dynamic to prevent static optimization.
 */
export const dynamic = "force-dynamic"
