"use client"

import { useState } from "react"
import { useSession, signIn } from "next-auth/react"
import { redirect } from "next/navigation"
import { LogoUploader } from "./logo-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Download, Loader2, CreditCard, ExternalLink, Link, Unlink, Check } from "lucide-react"
import { toast } from "sonner"

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const [exporting, setExporting] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectingMicrosoft, setDisconnectingMicrosoft] = useState(false)

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

  const handleGoogleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const res = await fetch("/api/connections/google/disconnect", {
        method: "POST",
      })
      if (!res.ok) throw new Error("Disconnect failed")
      toast.success("Google account disconnected")
      await update()
    } catch (err) {
      console.error("Disconnect failed:", err)
      toast.error("Failed to disconnect Google account")
    } finally {
      setDisconnecting(false)
    }
  }

  const handleMicrosoftDisconnect = async () => {
    setDisconnectingMicrosoft(true)
    try {
      const res = await fetch("/api/connections/microsoft/disconnect", {
        method: "POST",
      })
      if (!res.ok) throw new Error("Disconnect failed")
      toast.success("Microsoft account disconnected")
      await update()
    } catch (err) {
      console.error("Microsoft disconnect failed:", err)
      toast.error("Failed to disconnect Microsoft account")
    } finally {
      setDisconnectingMicrosoft(false)
    }
  }

  const googleConnected = session.user.googleConnected ?? false
  const microsoftConnected = session.user.microsoftConnected ?? false

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

      {/* Connected Accounts Section */}
      <Card className="border-[#262626] bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-lg">Connected Accounts</CardTitle>
          <CardDescription>
            Connect your Google or Microsoft account to enable email, calendar, and file
            integrations across Operion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Google */}
          <div className="flex items-center justify-between rounded-lg border border-[#262626] bg-[#0d0d0d] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1a1a]">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
                    fill="#EA4335"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Google</p>
                <p className="text-xs text-muted-foreground">
                  {googleConnected
                    ? "Gmail, Calendar, Drive"
                    : "Connect to access Gmail, Calendar & Drive"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {googleConnected ? (
                <>
                  <Badge
                    variant="outline"
                    className="border-green-500/30 bg-green-500/10 text-green-400"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                  <Button
                    onClick={handleGoogleDisconnect}
                    disabled={disconnecting}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                  >
                    {disconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => signIn("google")}
                  variant="outline"
                  size="sm"
                  className="border-[#262626] bg-[#1a1a1a] hover:bg-[#222]"
                >
                  <Link className="mr-2 h-4 w-4" />
                  Connect Google
                </Button>
              )}
            </div>
          </div>

          {/* Microsoft */}
          <div className="flex items-center justify-between rounded-lg border border-[#262626] bg-[#0d0d0d] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1a1a]">
                <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none">
                  <path d="M10 1H1V10H10V1Z" fill="#F25022"/>
                  <path d="M20 1H11V10H20V1Z" fill="#7FBA00"/>
                  <path d="M20 11H11V20H20V11Z" fill="#00A4EF"/>
                  <path d="M10 11H1V20H10V11Z" fill="#FFB900"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Microsoft</p>
                <p className="text-xs text-muted-foreground">
                  {microsoftConnected
                    ? "Outlook, Calendar, OneDrive"
                    : "Connect to access Outlook, Calendar & OneDrive"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {microsoftConnected ? (
                <>
                  <Badge
                    variant="outline"
                    className="border-green-500/30 bg-green-500/10 text-green-400"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Connected
                  </Badge>
                  <Button
                    onClick={handleMicrosoftDisconnect}
                    disabled={disconnectingMicrosoft}
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                  >
                    {disconnectingMicrosoft ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                  </Button>
                </>
              ) : (
                <a
                  href="/api/auth/signin/microsoft?callbackUrl=/settings"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-[#262626] bg-[#1a1a1a] hover:bg-[#222] h-9 px-3"
                >
                  <Link className="mr-2 h-4 w-4" />
                  Connect Microsoft
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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
