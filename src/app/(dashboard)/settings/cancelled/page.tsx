"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Download, RotateCcw, Home, HeartCrack } from "lucide-react"
import { toast } from "sonner"

export default function CancelledPage() {
  const router = useRouter()
  const [reactivating, setReactivating] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleReactivate = async () => {
    setReactivating(true)
    try {
      const res = await fetch("/api/stripe/reactivate", { method: "POST" })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to reactivate subscription")
        return
      }

      toast.success("Subscription reactivated!")
      router.push("/settings")
    } catch (err) {
      console.error("Reactivate failed:", err)
      toast.error("Failed to reactivate subscription")
    } finally {
      setReactivating(false)
    }
  }

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
      toast.success("Data exported successfully")
    } catch (err) {
      console.error("Export failed:", err)
      toast.error("Failed to export data")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg border-[#262626] glass">
        <CardContent className="space-y-8 p-8 text-center">
          {/* Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <HeartCrack className="h-8 w-8 text-red-400" />
          </div>

          {/* Message */}
          <div className="space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              We&apos;re sorry to see you go
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              Your subscription has been cancelled. You&apos;ll continue to have
              access to Operion until the end of your billing period, after
              which your data will be retained for 30 days before permanent deletion.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleReactivate}
              disabled={reactivating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {reactivating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              {reactivating ? "Reactivating..." : "Reactivate Subscription"}
            </Button>

            <div className="flex gap-3">
              <Button
                onClick={handleExport}
                disabled={exporting}
                variant="outline"
                className="flex-1 border-[#262626] bg-white/[0.04] hover:bg-[#222] text-white"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                {exporting ? "Exporting..." : "Export My Data"}
              </Button>

              <Button
                onClick={() => router.push("/home")}
                variant="outline"
                className="flex-1 border-[#262626] bg-white/[0.04] hover:bg-[#222] text-white"
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
