import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/db"
import { getStripe, PRICE_ID_MAP } from "@/lib/stripe"
import { createCheckoutSession, getAppBaseUrl } from "@/lib/checkout"
import { sendCompleteSetupEmail, sendOwnerSetupEmail } from "@/lib/email"
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
      case "invoice.payment_failed": {
        await handlePaymentFailed(event.data.object)
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
 * slugify — mirrors the register route so org slugs stay consistent.
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "") // remove apostrophes
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .slice(0, 60) // keep it reasonable
}

/**
 * Resolve the organization that owns a completed checkout.
 *
 * Order of resolution:
 * 1. session.client_reference_id — an org id (app pricing path). If it resolves,
 *    use that org exactly as before.
 * 2. The Stripe customer email (CRM path, where the customer typically has no
 *    org yet): match an existing user/org by email first, then create the
 *    customer's org + owner user deterministically.
 *
 * Idempotent: a replayed webhook for the same email reuses the org/user created
 * by the first pass (the stripeEvent table additionally dedupes identical event
 * ids at the top of POST).
 */
async function resolveOrgForCheckout(
  session: Stripe.Checkout.Session
): Promise<{
  org: {
    id: string
    subscriptionTier: string
    subscriptionStatus: string
    stripeCustomerId: string | null
  }
} | null> {
  const orgId = session.client_reference_id
  if (orgId) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } })
    if (org) return { org }
  }

  const email = (session.customer_email ?? session.customer_details?.email ?? "").trim().toLowerCase()
  if (!email) {
    console.warn(
      `checkout.session.completed: unable to resolve org ` +
        `(client_reference_id=${orgId ?? "none"}, no customer email on session)`
    )
    return null
  }

  // Match an existing user/org by email first — never duplicate.
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { organizationId: true },
  })
  if (existingUser) {
    const org = await prisma.organization.findUnique({
      where: { id: existingUser.organizationId },
    })
    if (org) return { org }
  }

  // No existing org — provision one deterministically from the customer email.
  const customerName = (session.customer_details?.name ?? "").trim() || email.split("@")[0] || "Operion Customer"
  const orgName = `${customerName}'s Organization`
  const baseSlug = slugify(orgName) || "operion-customer"
  let slug = baseSlug
  let suffix = 1
  while (await prisma.organization.findUnique({ where: { slug } })) {
    suffix += 1
    slug = `${baseSlug}-${suffix}`
  }

  const org = await prisma.organization.create({
    data: {
      name: orgName,
      slug,
      subscriptionStatus: "TRIAL", // flipped to ACTIVE by the shared activation block below
    },
  })
  await prisma.user.create({
    data: {
      name: customerName,
      email,
      role: "OWNER",
      organizationId: org.id,
    },
  })
  console.log(`🏗️ Provisioned org ${org.id} + owner for checkout customer ${email}`)
  return { org }
}

/**
 * checkout.session.completed
 * Resolve the org (client_reference_id → existing org, else provision from the
 * customer email) and activate the subscription.
 */
async function handleCheckoutCompleted(
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const resolved = await resolveOrgForCheckout(session)
  if (!resolved) {
    console.warn("checkout.session.completed: no org resolved; nothing activated")
    return
  }
  const { org } = resolved
  const orgId = org.id

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

  // ── Clean up sample data if transitioning from TRIAL ──────────
  if (org.subscriptionStatus === "TRIAL") {
    try {
      await prisma.task.deleteMany({ where: { organizationId: orgId, isSample: true } })
      await prisma.meeting.deleteMany({ where: { organizationId: orgId, isSample: true } })
      await prisma.document.deleteMany({ where: { organizationId: orgId, isSample: true } })
      await prisma.contact.deleteMany({ where: { organizationId: orgId, isSample: true } })
      await prisma.project.deleteMany({ where: { organizationId: orgId, isSample: true } })
      await prisma.entity.deleteMany({ where: { organizationId: orgId, isSample: true } })
      console.log(`🧹 Sample data cleaned for org ${orgId}`)
    } catch (cleanupErr) {
      console.error(`Failed to clean sample data for org ${orgId}:`, cleanupErr)
    }
  }

  console.log(
    `✅ Org ${orgId} activated: tier=${tier}, status=${status}, ` +
      `customer=${stripeCustomerId}, sub=${stripeSubscriptionId}`
  )

  // ── Session A (setup fee) → email the Session B link ─────────────
  // The customer paid the one-time setup fee (billed immediately) but may have
  // abandoned the flow before completing the subscription. Create Session B
  // (30-day-trial subscription, first charge day 31) and email the link so the
  // purchase still completes. Idempotent via the stripeEvent dedup at the top
  // of POST — a replayed event never re-provisions or re-emails.
  if (session.mode === "payment") {
    await emailSessionBLink(session)
  }

  // ── CRM-sold owners: one-time set-password invite ──────────────────
  // A customer provisioned by the checkout webhook has no password and no way
  // to sign in. Email them a one-time /accept-invite link (invite token) so
  // they can set a password and log in normally. Idempotent: skipped when the
  // owner already has a password or an invite was already sent (both Session A
  // and Session B complete for the same customer), and a failure never fails
  // the webhook.
  await sendOwnerInviteIfNeeded(orgId)
}

/**
 * Email a one-time set-password invite to an org owner who was provisioned by
 * the checkout webhook with no password (CRM path). Reuses the existing
 * invite-token mechanics (/accept-invite page + User.inviteToken + PENDING
 * status), so no new page or middleware change is needed.
 *
 * Idempotency: an owner who already has a password (registered normally,
 * accepted an earlier invite, or completed setup between Session A and
 * Session B) never receives a second invite; an owner who already has an
 * invite token (invite sent when the first of the two checkout sessions
 * completed) is skipped when the second session completes.
 */
async function sendOwnerInviteIfNeeded(orgId: string) {
  try {
    const owner = await prisma.user.findFirst({
      where: { organizationId: orgId, role: "OWNER" },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        inviteToken: true,
      },
      orderBy: { createdAt: "asc" },
    })
    if (!owner) {
      console.warn(`owner-invite: no OWNER user found for org ${orgId}`)
      return
    }
    if (owner.passwordHash) {
      console.log(`owner-invite: owner ${owner.email} already has a password — invite skipped`)
      return
    }
    if (owner.inviteToken) {
      console.log(`owner-invite: invite already sent to ${owner.email} — invite skipped`)
      return
    }

    const inviteToken = randomBytes(32).toString("hex")
    await prisma.user.update({
      where: { id: owner.id },
      data: { inviteToken, status: "PENDING" },
    })

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    })
    const sent = await sendOwnerSetupEmail({
      email: owner.email,
      name: owner.name,
      orgName: org?.name ?? "your workspace",
      inviteToken,
    })
    console.log(
      `📧 Owner set-password invite emailed to ${owner.email} (org ${orgId}): ` +
        `${sent ? "sent" : "send failed"}`
    )
  } catch (err) {
    // Never fail the webhook for an email problem — the owner can also use the
    // standard forgot-password flow to set a password.
    console.error(`owner-invite: failed to send invite for org ${orgId}:`, err)
  }
}

/**
 * Build a Session B (subscription) link for a customer who completed Session A
 * (setup fee) and email it to them. Reuses the same session-creation helper as
 * the /api/checkout/subscribe route so both paths produce identical sessions.
 */
async function emailSessionBLink(session: Stripe.Checkout.Session) {
  const email = (session.customer_email ?? session.customer_details?.email ?? "").trim()
  if (!email) {
    console.warn(
      "checkout.session.completed (setup): no customer email on session — skipping Session B email"
    )
    return
  }

  // metadata.plan carries the DB tier (SOLO/TEAM); default to Founder for any
  // legacy session without metadata.
  const tier = session.metadata?.plan
  const plan = tier === "TEAM" ? "Studio" : "Founder"

  try {
    const subSession = await createCheckoutSession({
      plan,
      step: "subscription",
      customerEmail: email,
      clientReferenceId:
        typeof session.client_reference_id === "string"
          ? session.client_reference_id
          : undefined,
      baseUrl: getAppBaseUrl(),
    })
    if (!subSession.url) {
      console.error("Session B created without a URL for setup customer", subSession.id)
      return
    }
    const sent = await sendCompleteSetupEmail({ email, plan, checkoutUrl: subSession.url })
    console.log(
      `📧 Session B link emailed to ${email} (session ${subSession.id}): ${sent ? "sent" : "send failed"}`
    )
  } catch (err) {
    // Never fail the webhook for an email problem — the customer can also
    // reach Session B from the /complete-subscription success page.
    console.error("Failed to create/email Session B link:", err)
  }
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
 * invoice.payment_failed
 * Log payment failure and create a notification for the org owner.
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id

  if (!customerId) {
    console.warn("invoice.payment_failed: no customer ID")
    return
  }

  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
    include: {
      users: {
        where: { role: "OWNER" },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!org) {
    console.warn(`invoice.payment_failed: org not found for customer ${customerId}`)
    return
  }

  // Create a notification for the org owner about the failed payment
  const ownerId = org.users[0]?.id
  if (ownerId) {
    await prisma.notification.create({
      data: {
        organizationId: org.id,
        userId: ownerId,
        type: "RENEWAL",
        title: "Payment Failed",
        message: `Your latest invoice payment failed. Please update your payment method to avoid service interruption.`,
        link: "/pricing",
      },
    })
  }

  console.log(`💳 Payment failed for org ${org.id} (customer ${customerId})`)
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
