"use client"

import { useState, useEffect } from "react"
import { X, ArrowRight, Clock, AlertTriangle, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TrialStatus {
  status: string
  trialStartDate: string | null
  trialEndDate: string | null
  daysRemaining: number | null
}

const STRIPE_LINKS = {
  starter: "https://buy.stripe.com/eVqdR909v2TpefK08k1wY0d",
  professional: "https://buy.stripe.com/7sY8wPbSdeC7efK08k1wY0e",
}

export function TrialBanner() {
  const [trial, setTrial] = useState<TrialStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrial = async () => {
      try {
        const res = await fetch("/api/trial-status")
        if (res.ok) {
          const data = await res.json()
          setTrial(data)
        }
      } catch {
        // Silently fail — don't disrupt the UX for a trial check
      } finally {
        setLoading(false)
      }
    }
    fetchTrial()
  }, [])

  if (loading || !trial || dismissed) return null

  const { status, daysRemaining } = trial

  // Don't show anything for ACTIVE or CANCELLED
  if (status === "ACTIVE" || status === "CANCELLED") return null

  // EXPIRED — red banner, not dismissible
  if (status === "EXPIRED") {
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-red-950/60 border-b border-red-900/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-200">
            Your trial has ended.{" "}
            <span className="font-medium text-red-100">Upgrade to restore access.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={STRIPE_LINKS.professional}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md text-xs font-medium h-8 px-4 bg-red-600 hover:bg-red-500 text-white transition-colors"
          >
            Upgrade Now
            <ArrowRight className="ml-1.5 h-3 w-3" />
          </a>
        </div>
      </div>
    )
  }

  // TRIAL with ≤3 days — amber warning
  if (status === "TRIAL" && daysRemaining !== null && daysRemaining <= 3) {
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-amber-950/60 border-b border-amber-900/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200">
            {daysRemaining === 0
              ? "Your trial ends today."
              : `Your trial ends in ${daysRemaining} day${daysRemaining === 1 ? "" : "s"}.`}{" "}
            <span className="font-medium text-amber-100">Upgrade to keep access.</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={STRIPE_LINKS.starter}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md text-xs font-medium h-8 px-4 border border-amber-700/50 bg-amber-900/20 text-amber-200 hover:bg-amber-900/40 transition-colors"
          >
            Upgrade
            <ArrowRight className="ml-1.5 h-3 w-3" />
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-amber-500/60 hover:text-amber-300 hover:bg-amber-900/20"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  // TRIAL with >3 days — subtle banner, dismissible
  if (status === "TRIAL" && daysRemaining !== null && daysRemaining > 3) {
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-[#0d0d0d] border-b border-white/[0.04]">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            14-day free trial ·{" "}
            <span className="text-foreground/70 font-medium">{daysRemaining} days left</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={STRIPE_LINKS.starter}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md h-7 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Upgrade
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground/40 hover:text-muted-foreground"
            onClick={() => setDismissed(true)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return null
}
