"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { LogoUploader } from "./logo-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Download, Loader2, CreditCard, ExternalLink } from "lucide-react"

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const [exporting, setExporting] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  if (status === "loading") return null
  if (!session?.user) redirect("/login")

  const stripeCustomerId = session.user.stripeCustomerId
  const subscriptionStatus = session.user.subscriptionStatus
  const hasSubscription = Boolean(stripeCustomerId)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/export", { method: "POST" })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `operion-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Export failed:", err)
    } finally {
      setExporting(false)
    }
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      if (!res.ok) {
        const data = await res.json()
        console.error("Portal error:", data.error)
        return
      }
      const { url } = await res.json()
      window.location.href = url
    } catch (err) {
      console.error("Portal redirect failed:", err)
      setPortalLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization&apos;s branding and preferences.
        </p>
      </div>

      <Separator className="bg-[#262626]" />

      {/* Branding Section */}
      <Card className="border-[#262626] bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-lg">Branding</CardTitle>
          <CardDescription>
            Customize how Operion appears to you and your team. Upload your company logo to
            replace the default brand icon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogoUploader initialLogoUrl={null} />
        </CardContent>
      </Card>

      {/* Billing Section */}
      {hasSubscription && (
        <Card className="border-[#262626] bg-[#111111]">
          <CardHeader>
            <CardTitle className="text-lg">Billing</CardTitle>
            <CardDescription>
              Manage your subscription, payment methods, and view invoices. Your plan is{" "}
              <span className="text-white font-medium">
                {subscriptionStatus === "ACTIVE" ? "active" : subscriptionStatus?.toLowerCase() ?? "active"}
              </span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleManageBilling}
              disabled={portalLoading}
              variant="outline"
              className="border-[#262626] bg-[#1a1a1a] hover:bg-[#222]"
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              {portalLoading ? "Opening portal..." : "Manage Billing"}
              {!portalLoading && <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Export Section */}
      <Card className="border-[#262626] bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-lg">Data Export</CardTitle>
          <CardDescription>
            Download all your organization data as a JSON file. Includes entities, projects,
            tasks, contacts, and document metadata.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleExport}
            disabled={exporting}
            variant="outline"
            className="border-[#262626] bg-[#1a1a1a] hover:bg-[#222]"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {exporting ? "Exporting..." : "Export My Data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
