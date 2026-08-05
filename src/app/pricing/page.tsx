"use client"

import { useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { Sparkles, Check, ArrowRight, Building2, Users, Briefcase, Search, Zap, Mail } from "lucide-react"
import { toast } from "sonner"

export default function PricingPage() {
  const { data: session } = useSession()
  const [checkingOut, setCheckingOut] = useState<string | null>(null)

  async function redirectToCheckout(plan: "SOLO" | "TEAM") {
    if (!session) {
      window.location.href = "/login?redirect=/pricing"
      return
    }
    setCheckingOut(plan)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, mode: "monthly" }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/login?redirect=/pricing"
          return
        }
        toast.error(data.error || "Checkout failed")
        setCheckingOut(null)
        return
      }
      if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setCheckingOut(null)
    }
  }

  const plans = [
  {
    name: "Solo",
    setupFee: "$2,500",
    setupPeriod: "one-time",
    plan: "SOLO" as const,
    price: "$249",
    period: "/month",
    description: "For solo operators managing a small portfolio.",
    features: [
      { text: "1 user seat", included: true },
      { text: "Unlimited entities", included: true },
      { text: "AI daily briefing", included: true },
      { text: "Task & project management", included: true },
      { text: "Document & contact center", included: true },
      { text: "AI chat & task suggestions", included: false },
      { text: "Document search", included: false },
      { text: "EA workspace", included: false },
      { text: "Advanced permissions", included: false },
      { text: "Priority support", included: false },
    ],
    highlighted: false,
  },
  {
    name: "Team",
    setupFee: "$5,000",
    setupPeriod: "one-time",
    plan: "TEAM" as const,
    price: "$499",
    period: "/month",
    description: "For owners and teams running multiple entities.",
    features: [
      { text: "Up to 5 user seats", included: true },
      { text: "Up to 25 entities", included: true },
      { text: "AI daily briefing", included: true },
      { text: "AI chat & task suggestions", included: true },
      { text: "Document search", included: true },
      { text: "EA workspace", included: true },
      { text: "Advanced permissions", included: true },
      { text: "Priority support", included: true },
      { text: "Task & project management", included: true },
      { text: "Document & contact center", included: true },
    ],
    highlighted: true,
  },
]

const features = [
  {
    icon: Zap,
    title: "AI-Powered",
    description: "Get daily briefings, smart task suggestions, and priority recommendations.",
  },
  {
    icon: Building2,
    title: "Multi-Entity",
    description: "Manage businesses, hotels, properties, and investments in one place.",
  },
  {
    icon: Search,
    title: "Unified Search",
    description: "Search across tasks, projects, documents, and contacts instantly.",
  },
  {
    icon: Users,
    title: "Team Ready",
    description: "Invite EAs, managers, and staff with role-based permissions.",
  },
  {
    icon: Briefcase,
    title: "EA Workspace",
    description: "Dedicated command center for executive assistants to manage priorities.",
  },
  {
    icon: Sparkles,
    title: "14-Day Trial",
    description: "Try all features free. No credit card required.",
  },
]

  return (
    <div className="min-h-screen bg-[#08080a]">
      <nav className="border-b border-white/[0.06] px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-medium"><img src="/logo.svg" alt="Operion" className="h-7 w-7" /> Operion</Link>
          <div className="flex items-center gap-5 text-sm text-muted-foreground"><Link href="/blog" className="hover:text-foreground">Blog</Link><Link href="/login" className="hover:text-foreground">Sign in</Link></div>
        </div>
      </nav>
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
            <img src="/logo.svg" className="h-6 w-6" alt="Operion" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start with a 14-day free trial — no credit card required. Prefer to skip the trial? Buy your setup below.
          </p>
          <div className="pt-4">
            <Link
              href="/register?redirect=/home"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium h-11 px-8 transition-colors hover:bg-primary/90"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl glass shadow-2xl flex flex-col${
                plan.highlighted ? " ring-2 ring-primary/30 lg:scale-[1.04]" : ""
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <span className="inline-flex items-center rounded-full bg-primary text-primary-foreground text-xs px-3 py-0.5 font-medium">
                    Most popular
                  </span>
                </div>
              )}
              <div className="p-6 pb-4">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="mt-3 space-y-0.5">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Setup</span>
                    <div>
                      <span className="text-3xl font-bold tracking-tight">{plan.setupFee}</span>
                      <span className="text-sm text-muted-foreground ml-1">{plan.setupPeriod}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly</span>
                    <div>
                      <span className="text-2xl font-bold tracking-tight">{plan.price}</span>
                      <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-6 pb-4 space-y-3 flex-1">
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature.text}
                      className={`flex items-center gap-2.5 text-sm ${
                        feature.included
                          ? "text-foreground"
                          : "text-muted-foreground/40 line-through"
                      }`}
                    >
                      <Check
                        className={`h-4 w-4 shrink-0 ${
                          feature.included ? "text-emerald-400" : "text-muted-foreground/30"
                        }`}
                      />
                      {feature.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="px-6 pb-6 space-y-2">
                {plan.plan ? (
                  <>
                    <button
                      onClick={() => redirectToCheckout(plan.plan!)}
                      disabled={checkingOut === plan.plan}
                      className={`inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-10 px-4 w-full transition-colors disabled:opacity-50 ${
                        plan.highlighted
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-[#262626] bg-white/[0.04] hover:bg-[#222]"
                      }`}
                    >
                      {checkingOut === plan.plan ? "Redirecting..." : `Buy Now — ${plan.setupFee} setup`}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <p className="text-xs text-muted-foreground text-center">
                      Setup billed today · monthly starts in 30 days
                    </p>
                    <Link
                      href="/register?redirect=/home"
                      className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-10 px-4 w-full border border-[#262626] bg-white/[0.04] hover:bg-[#222]"
                    >
                      Start Free Trial — no card required
                    </Link>
                  </>
                ) : (
                  <a
                    href="mailto:Hello@operion.online"
                    className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium h-10 px-4 w-full transition-colors border border-[#262626] bg-white/[0.04] hover:bg-[#222]"
                  >
                    <Mail className="h-4 w-4" />
                    Contact us
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Feature comparison */}
        <div className="mt-24 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-center mb-10">
            Everything you need to run your portfolio
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((item) => (
              <div
                key={item.title}
                className="rounded-xl glass border border-white/[0.06] p-5"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 mb-3">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <div className="rounded-2xl glass border border-white/[0.06] p-10 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight mb-2">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6">
              Join entrepreneurs who trust Operion as their AI Chief of Staff.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register?redirect=/home"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium h-11 px-8 w-full sm:w-auto transition-colors hover:bg-primary/90"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#262626] bg-white/[0.04] text-sm font-medium h-11 px-8 w-full sm:w-auto transition-colors hover:bg-[#222]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-8 text-center space-x-6">
          <Link
            href="/login"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to login
          </Link>
          <Link
            href="/terms"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
        </div>
      </div>
    </div>
  )
}
