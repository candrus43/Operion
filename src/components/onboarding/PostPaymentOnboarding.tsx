"use client"

import { useState, useEffect } from "react"
import { OnboardingWizard } from "./OnboardingWizard"
import { Building2, Plus } from "lucide-react"
import Link from "next/link"

/**
 * Client-side wrapper that shows either the OnboardingWizard modal
 * or a static empty state ("Get started by creating your first entity").
 * The wizard is shown once; after dismissal it is stored in localStorage
 * and the static empty state is rendered instead.
 */
export function PostPaymentOnboarding({ userName }: { userName: string }) {
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem("operion_onboarding_dismissed")
    if (dismissed !== "true") {
      setShowWizard(true)
    }
  }, [])

  function handleDismiss() {
    setShowWizard(false)
  }

  const firstName = userName?.split(" ")[0] || "there"

  return (
    <>
      {showWizard && (
        <OnboardingWizard open={showWizard} onDismiss={handleDismiss} />
      )}

      {/* Empty state dashboard — shown behind the wizard and after dismissal */}
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-3xl scale-150" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 ring-1 ring-white/[0.06]">
            <Building2 className="h-9 w-9 text-blue-400" />
          </div>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Welcome, {firstName}
        </h1>
        <p className="text-muted-foreground max-w-md mb-2">
          Your subscription is active. Let&apos;s build out your workspace.
        </p>
        <p className="text-sm text-muted-foreground/60 max-w-md mb-10">
          Get started by creating your first entity — it can be an LLC, a
          property, an investment portfolio, or anything you manage.
        </p>

        <Link
          href="/entities/new"
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 text-black text-sm font-medium h-11 px-6 hover:bg-amber-400 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create your first entity
        </Link>

        <div className="mt-8 grid gap-3 w-full max-w-lg">
          <Link
            href="/entities"
            className="rounded-xl bg-[#111111] border border-white/[0.04] p-4 text-left hover:bg-[#151515] hover:border-white/[0.08] transition-all flex items-center gap-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Building2 className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Browse Entities</p>
              <p className="text-xs text-muted-foreground">View and manage your business entities</p>
            </div>
          </Link>

          <Link
            href="/settings/team"
            className="rounded-xl bg-[#111111] border border-white/[0.04] p-4 text-left hover:bg-[#151515] hover:border-white/[0.08] transition-all flex items-center gap-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Invite your team</p>
              <p className="text-xs text-muted-foreground">Add collaborators to your workspace</p>
            </div>
          </Link>
        </div>
      </div>
    </>
  )
}
