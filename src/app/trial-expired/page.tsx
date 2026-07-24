"use client"

import Link from "next/link"
import { Sparkles, ShieldAlert, Zap, Users, Check, ArrowRight } from "lucide-react"

const STRIPE_LINKS = {
  starter: "https://buy.stripe.com/eVqdR909v2TpefK08k1wY0d",
  professional: "https://buy.stripe.com/7sY8wPbSdeC7efK08k1wY0e",
}

export default function TrialExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#080808]">
      <div className="w-full max-w-2xl space-y-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
            <ShieldAlert className="h-7 w-7 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Your 14-day free trial has ended
            </h1>
            <p className="text-muted-foreground mt-2 text-lg leading-relaxed max-w-md mx-auto">
              Upgrade now to keep full access to your AI Chief of Staff, all your entities, and your team workspace.
            </p>
          </div>
        </div>

        {/* Plans */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Starter */}
          <div className="relative rounded-2xl bg-[#111111] border border-white/[0.06] p-6 flex flex-col">
            <div className="mb-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-xs font-medium text-muted-foreground mb-3">
                <Zap className="h-3 w-3" />
                Starter
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">$149</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Single user, up to 3 entities, core AI briefing
              </p>
            </div>

            <ul className="space-y-2.5 mb-6 flex-1">
              {[
                "1 user seat",
                "Up to 3 entities",
                "AI daily briefing",
                "Task & project management",
                "Document & contact center",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={STRIPE_LINKS.starter}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 w-full"
            >
              Upgrade to Starter
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>

          {/* Professional */}
          <div className="relative rounded-2xl bg-[#111111] border border-amber-500/20 p-6 flex flex-col ring-1 ring-amber-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-semibold text-black">
              RECOMMENDED
            </div>

            <div className="mb-5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400 mb-3">
                <Sparkles className="h-3 w-3" />
                Professional
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">$349</span>
                <span className="text-muted-foreground text-sm">/month per seat</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Unlimited entities, full AI assistant, EA workspace
              </p>
            </div>

            <ul className="space-y-2.5 mb-6 flex-1">
              {[
                "Unlimited user seats",
                "Unlimited entities",
                "AI chat & task suggestions",
                "Document search",
                "EA command center",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={STRIPE_LINKS.professional}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-amber-500 hover:bg-amber-400 text-black h-11 px-8 w-full"
            >
              Upgrade to Professional
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Questions?{" "}
            <a
              href="mailto:hello@operion.ai"
              className="text-foreground hover:underline font-medium"
            >
              Contact us
            </a>
          </p>
          <Link
            href="/home"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Return to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
