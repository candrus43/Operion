"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Users,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

const STORAGE_KEY = "operion_onboarding_dismissed"

interface OnboardingWizardProps {
  open: boolean
  onDismiss: () => void
}

type Step = 1 | 2 | 3

export function OnboardingWizard({ open, onDismiss }: OnboardingWizardProps) {
  const [step, setStep] = useState<Step>(1)
  const router = useRouter()

  // Reset to step 1 when opened
  useEffect(() => {
    if (open) setStep(1)
  }, [open])

  function handleDismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true")
    }
    onDismiss()
  }

  function handleFinalDismiss() {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true")
    }
    onDismiss()
    router.push("/entities")
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleDismiss() }}>
      <DialogContent className="sm:max-w-lg border-white/[0.06] bg-[#0d0d0d] p-0 gap-0 overflow-hidden">
        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-6">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-300",
                s <= step ? "bg-amber-500" : "bg-white/[0.06]"
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="flex flex-col items-center text-center px-8 py-10">
            {/* Icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-2xl scale-150" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-blue-500/20 ring-1 ring-white/[0.06]">
                <Sparkles className="h-7 w-7 text-amber-400" />
              </div>
            </div>

            <h2 className="text-xl font-bold tracking-tight mb-2">
              You&apos;re all set!
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-1">
              Your trial period is over and your subscription is now active.
              Welcome to Operion — your AI-powered command center.
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-sm mb-8">
              Let&apos;s get your workspace ready in two quick steps.
            </p>

            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 text-black text-sm font-medium h-10 px-6 hover:bg-amber-400 transition-colors"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={handleDismiss}
              className="mt-4 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline underline-offset-4"
            >
              I&apos;ll set up later
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center text-center px-8 py-10">
            {/* Icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-2xl scale-150" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
                <Building2 className="h-7 w-7 text-blue-400" />
              </div>
            </div>

            <h2 className="text-xl font-bold tracking-tight mb-2">
              Create your first entity
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-1">
              An entity is anything you manage — an LLC, a property, an
              investment portfolio, or a consulting practice.
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-sm mb-8">
              Each entity gets its own projects, tasks, documents, and contacts
              to keep everything organized.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={handleFinalDismiss}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 text-black text-sm font-medium h-10 px-6 hover:bg-amber-400 transition-colors"
              >
                Go to Entities
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm font-medium h-10 px-4 hover:bg-white/[0.06] transition-colors"
              >
                Next step
              </button>
            </div>

            <button
              onClick={handleDismiss}
              className="mt-4 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline underline-offset-4"
            >
              Skip for now
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col items-center text-center px-8 py-10">
            {/* Icon */}
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl scale-150" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <Users className="h-7 w-7 text-emerald-400" />
              </div>
            </div>

            <h2 className="text-xl font-bold tracking-tight mb-2">
              Add your team
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-1">
              Invite your executive assistant, operations manager, or other
              team members to collaborate in your workspace.
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-sm mb-8">
              You can assign tasks, share documents, and keep everyone on the
              same page — all from one place.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  handleDismiss()
                  router.push("/settings/team")
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 text-black text-sm font-medium h-10 px-6 hover:bg-amber-400 transition-colors"
              >
                Invite Team
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={handleDismiss}
                className="inline-flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm font-medium h-10 px-4 hover:bg-white/[0.06] transition-colors"
              >
                <Check className="h-4 w-4" />
                Done
              </button>
            </div>

            <button
              onClick={() => setStep(2)}
              className="mt-4 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline underline-offset-4"
            >
              ← Back
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Check if the onboarding wizard should be shown.
 * Call on the client side only.
 */
export function hasOnboardingBeenDismissed(): boolean {
  if (typeof window === "undefined") return true
  return localStorage.getItem(STORAGE_KEY) === "true"
}
