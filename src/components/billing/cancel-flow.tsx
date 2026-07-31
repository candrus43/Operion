"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Pause,
  ArrowDown,
  Calendar,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
} from "lucide-react"
import { toast } from "sonner"

type Step = "offers" | "reason" | "cancelling"

interface CancelFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscriptionTier?: string
  subscriptionStatus?: string
}

const REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_using", label: "Not using it enough" },
  { value: "missing_features", label: "Missing features" },
  { value: "switching", label: "Switching to another tool" },
  { value: "other", label: "Other" },
]

export function CancelFlow({
  open,
  onOpenChange,
  subscriptionTier,
}: CancelFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("offers")
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [feedback, setFeedback] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const reset = () => {
    setStep("offers")
    setSelectedReason(null)
    setFeedback("")
    setIsLoading(false)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const handlePause = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error("Could not open billing portal")
      }
    } catch {
      toast.error("Failed to open billing portal")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDowngrade = () => {
    // Redirect to pricing page for downgrade
    router.push("/pricing")
    handleOpenChange(false)
  }

  const handleScheduleCall = () => {
    // Navigate to support/contact page
    router.push("/support")
    handleOpenChange(false)
  }

  const handleContinueToCancel = () => {
    setStep("reason")
  }

  const handleBack = () => {
    setStep("offers")
    setSelectedReason(null)
    setFeedback("")
  }

  const handleConfirmCancel = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: selectedReason,
          feedback: feedback.trim() || undefined,
          cancelImmediately: false,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to cancel subscription")
        return
      }

      toast.success("Subscription cancelled")
      handleOpenChange(false)
      router.push("/settings/cancelled")
    } catch (err) {
      console.error("Cancel failed:", err)
      toast.error("Failed to cancel subscription")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-[#262626] bg-[#111111] text-white sm:max-w-md">
        {step === "offers" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">
                Before you go...
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                We&apos;d love to keep you around. Here are some options that might
                work better for you.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {/* Pause */}
              <button
                onClick={handlePause}
                disabled={isLoading}
                className="w-full flex items-center gap-4 rounded-lg border border-[#262626] bg-[#1a1a1a] p-4 text-left hover:bg-[#222] transition-colors disabled:opacity-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                  <Pause className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    Pause your subscription
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Temporarily pause billing for 1-3 months. Your data stays safe.
                  </p>
                </div>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {/* Downgrade */}
              {subscriptionTier === "TEAM" && (
                <button
                  onClick={handleDowngrade}
                  className="w-full flex items-center gap-4 rounded-lg border border-[#262626] bg-[#1a1a1a] p-4 text-left hover:bg-[#222] transition-colors"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                    <ArrowDown className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">
                      Downgrade to Solo
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Switch to the Solo plan at $249/month. Keep all features for
                      a single user.
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}

              {/* Schedule Call */}
              <button
                onClick={handleScheduleCall}
                className="w-full flex items-center gap-4 rounded-lg border border-[#262626] bg-[#1a1a1a] p-4 text-left hover:bg-[#222] transition-colors"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/10">
                  <Calendar className="h-5 w-5 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    Schedule a call with us
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Talk to our team — we might be able to help with whatever is
                    not working.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <Separator className="bg-[#262626]" />

            {/* Continue to cancel */}
            <button
              onClick={handleContinueToCancel}
              className="w-full text-xs text-muted-foreground hover:text-red-400 transition-colors py-1"
            >
              Continue to cancel
            </button>
          </>
        )}

        {step === "reason" && (
          <>
            <DialogHeader>
              <button
                onClick={handleBack}
                className="mb-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-white transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
                Back
              </button>
              <DialogTitle className="text-xl">
                Help us improve
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                We&apos;d appreciate knowing why you&apos;re leaving. Your feedback helps
                us make Operion better for everyone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {/* Reason choices */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Why are you cancelling?
                </Label>
                <div className="space-y-1.5">
                  {REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      onClick={() => setSelectedReason(reason.value)}
                      className={`w-full flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                        selectedReason === reason.value
                          ? "border-blue-500/50 bg-blue-500/10 text-white"
                          : "border-[#262626] bg-[#1a1a1a] text-muted-foreground hover:bg-[#222] hover:text-white"
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          selectedReason === reason.value
                            ? "border-blue-500 bg-blue-500"
                            : "border-[#333]"
                        }`}
                      >
                        {selectedReason === reason.value && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      {reason.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional feedback */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Anything else you&apos;d like to share?{" "}
                  <span className="text-xs text-muted-foreground/60">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Tell us what we could do better..."
                  className="min-h-[80px] border-[#262626] bg-[#0d0d0d] text-white placeholder:text-muted-foreground focus-visible:ring-blue-500/30 resize-none"
                />
              </div>

              {/* Cancel button */}
              <Button
                onClick={handleConfirmCancel}
                disabled={isLoading}
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "Cancelling..." : "Cancel My Subscription"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Your access will continue until the end of your current billing
                period.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
