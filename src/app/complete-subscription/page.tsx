"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { AuthShell } from "@/components/auth/auth-shell"
import { ArrowRight, CheckCircle2, Loader2, ShieldAlert } from "lucide-react"

const PLAN_LABELS: Record<string, { price: string; setup: string }> = {
  Founder: { price: "$249/mo", setup: "$2,500 setup" },
  Studio: { price: "$499/mo", setup: "$5,000 setup" },
}

/**
 * Session A success landing (two-session checkout flow).
 *
 * Session A (setup fee, paid just now) redirected here. This page immediately
 * creates Session B — the 30-day-trial subscription — via /api/checkout/subscribe
 * and redirects the customer to Stripe. If the auto-redirect fails, a visible
 * "Complete subscription" button retries the same call.
 *
 * Works without a session: CRM-sold customers have not signed in yet. The plan,
 * email and org reference are carried on the success_url query string that
 * Session A was created with.
 */
export default function CompleteSubscriptionPage() {
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan")
  const customerEmail = searchParams.get("customer_email")
  const clientReferenceId = searchParams.get("client_reference_id")

  const [state, setState] = useState<"idle" | "creating" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  const planLabel = plan && PLAN_LABELS[plan] ? PLAN_LABELS[plan] : null

  const createSubscription = useCallback(async () => {
    if (!plan || !PLAN_LABELS[plan]) return
    setState("creating")
    setError(null)
    try {
      const res = await fetch("/api/checkout/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          customerEmail: customerEmail || undefined,
          client_reference_id: clientReferenceId || undefined,
        }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Unable to start your subscription")
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start your subscription")
      setState("error")
    }
  }, [plan, customerEmail, clientReferenceId])

  // Auto-create Session B on arrival — the redirect should be seamless.
  useEffect(() => {
    if (state === "idle" && plan && PLAN_LABELS[plan]) {
      createSubscription()
    }
  }, [state, plan, createSubscription])

  if (!plan || !planLabel) {
    return (
      <AuthShell>
        <div className="w-full max-w-md rounded-2xl glass border border-white/[0.06] p-8 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 mb-4">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold">This link is incomplete</h1>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            We couldn&apos;t find your plan details. Your setup payment was
            received — we&apos;ve also emailed you a link to complete your
            subscription.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium h-10 px-4"
            >
              Back to pricing
            </Link>
            <Link href="/home" className="text-xs text-muted-foreground hover:text-foreground">
              Already subscribed? Go to your dashboard
            </Link>
          </div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="w-full max-w-md rounded-2xl glass border border-white/[0.06] p-8 text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 mb-4">
          {state === "error" ? (
            <ShieldAlert className="h-6 w-6 text-amber-400" />
          ) : (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          )}
        </div>

        <h1 className="text-xl font-semibold">
          {state === "error" ? "Almost there" : "You're almost there"}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Your <strong className="text-foreground">{plan}</strong> setup fee
          ({planLabel.setup}) was charged today. Complete your subscription to
          activate your workspace — your 30-day trial starts now and monthly
          billing ({planLabel.price}) begins on day 31.
        </p>

        <div className="mt-6">
          {state === "creating" ? (
            <div className="inline-flex items-center justify-center gap-2 rounded-md bg-primary/60 text-primary-foreground text-sm font-medium h-10 px-4 w-full cursor-wait">
              <Loader2 className="h-4 w-4 animate-spin" />
              Preparing your subscription…
            </div>
          ) : (
            <button
              onClick={createSubscription}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium h-10 px-4 w-full transition-colors hover:bg-primary/90"
            >
              Complete subscription
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {state === "error" && error && (
            <p className="text-xs text-red-400 mt-3">{error}</p>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            If the redirect doesn&apos;t happen automatically, use the button
            above. It&apos;s safe to keep this page open.
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-white/[0.06] text-xs text-muted-foreground flex justify-center gap-4">
          <Link href="/pricing" className="hover:text-foreground">Back to pricing</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
        </div>
      </div>
    </AuthShell>
  )
}
