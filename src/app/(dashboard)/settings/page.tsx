"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { LogoUploader } from "./logo-uploader"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Download, Loader2 } from "lucide-react"

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const [exporting, setExporting] = useState(false)

  if (status === "loading") return null
  if (!session?.user) redirect("/login")

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
