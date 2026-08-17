import Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { auth } from "@/lib/auth"

/**
 * Shared Stripe Checkout helpers for the two-session purchase flow
 * (owner decision 2026-08-15):
 *
 *   Session A — SETUP:    mode=payment, ONLY the one-time setup fee line item,
 *                         billed immediately at checkout.
 *   Session B — SUBSCRIPTION: mode=subscription, ONLY the monthly price line
 *                         item, with trial_period_days=30 so the first
 *                         recurring charge lands on day 31.
 *
 * Both the app pricing path and the CRM payment-link path start with Session A;
 * Session B is created by the /complete-subscription success page (or, for an
 * abandoned flow, by the webhook which emails the Session B link).
 */

export const PLAN_CONFIG = {
  Founder: {
    tier: "SOLO",
    monthlyPriceId: "price_1TyY65ADHNbdtKNS9M83pmJc", // $249/mo — Operion Solo — Monthly (live)
    setupPriceId: "price_1TyY95ADHNbdtKNSdZYrvGV7", // $2,500 one-time — Operion Solo — Setup (live)
  },
  Studio: {
    tier: "TEAM",
    monthlyPriceId: "price_1TyYB3ADHNbdtKNSacUZufAC", // $499/mo — Operion Team — Monthly (live)
    setupPriceId: "price_1TyYD6ADHNbdtKNSgbvfZQ6A", // $5,000 one-time — Operion Team — Setup (live)
  },
} as const

export type Plan = keyof typeof PLAN_CONFIG
export type CheckoutStep = "setup" | "subscription"

export function isPlan(value: unknown): value is Plan {
  return value === "Founder" || value === "Studio"
}

/**
 * The public app origin used for checkout success/cancel URLs.
 * NEXTAUTH_URL is always configured in this environment; request origin is the
 * fallback for local development.
 */
export function getAppBaseUrl(request?: Request): string {
  const fromEnv = process.env.NEXTAUTH_URL
  if (fromEnv) return fromEnv.replace(/\/$/, "")
  if (request) return new URL(request.url).origin
  return "https://operion.ctonew.app"
}

/**
 * Resolve the org reference carried on the Stripe session for webhook
 * provisioning:
 *   1. An explicit client_reference_id in the body (server-to-server callers
 *      such as the CRM payment-link route and the complete-subscription page)
 *      always wins.
 *   2. Otherwise, the authenticated user's org (app pricing path).
 */
export async function resolveClientReferenceId(
  body: Record<string, unknown>
): Promise<string | undefined> {
  if (typeof body.client_reference_id === "string" && body.client_reference_id.trim()) {
    return body.client_reference_id.trim()
  }
  const session = await auth()
  const sessionOrgId = (session?.user as { organizationId?: string } | undefined)?.organizationId
  if (typeof sessionOrgId === "string" && sessionOrgId) {
    return sessionOrgId
  }
  return undefined
}

export interface CreateCheckoutSessionParams {
  plan: Plan
  step: CheckoutStep
  customerEmail?: string
  clientReferenceId?: string
  /** Override the base URL (tests, webhook fallback). Defaults to the app URL. */
  baseUrl?: string
}

/**
 * Create a Stripe Checkout session for one step of the two-session flow.
 *
 * Session A (step="setup"): mode=payment, only the setup fee. success_url is
 * the /complete-subscription page which immediately creates Session B and
 * redirects (with a visible fallback link). cancel_url is /pricing.
 *
 * Session B (step="subscription"): mode=subscription, only the monthly price,
 * trial_period_days=30 (first recurring charge lands day 31). success_url is
 * /home, cancel_url is /pricing — the same conventions the previous
 * subscription session used.
 *
 * Both sessions carry customer_email and client_reference_id exactly as the
 * old /api/checkout did, plus metadata { plan: <SOLO|TEAM>, step } so the
 * webhook can record the correct tier without extra lookups.
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  const config = PLAN_CONFIG[params.plan]
  const baseUrl = (params.baseUrl || getAppBaseUrl()).replace(/\/$/, "")

  const common: Stripe.Checkout.SessionCreateParams = {
    client_reference_id: params.clientReferenceId || undefined,
    customer_email: params.customerEmail || undefined,
    metadata: { plan: config.tier, step: params.step },
  }

  if (params.step === "setup") {
    const successParams = new URLSearchParams({ plan: params.plan })
    if (params.clientReferenceId) {
      successParams.set("client_reference_id", params.clientReferenceId)
    }
    if (params.customerEmail) {
      successParams.set("customer_email", params.customerEmail)
    }
    return stripe.checkout.sessions.create({
      ...common,
      mode: "payment",
      line_items: [{ price: config.setupPriceId, quantity: 1 }],
      success_url: `${baseUrl}/complete-subscription?${successParams.toString()}`,
      cancel_url: `${baseUrl}/pricing`,
    })
  }

  return stripe.checkout.sessions.create({
    ...common,
    mode: "subscription",
    line_items: [{ price: config.monthlyPriceId, quantity: 1 }],
    subscription_data: { trial_period_days: 30 },
    success_url: `${baseUrl}/home?checkout=success`,
    cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
  })
}
