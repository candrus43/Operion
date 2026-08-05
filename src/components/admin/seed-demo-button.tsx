"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Database } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SeedDemoButton() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<"idle" | "ok" | "error">("idle")

  // Only show for super admin
  if ((session?.user as any)?.isSuperAdmin !== true) return null

  const handleSeed = async () => {
    setLoading(true)
    setResult("idle")
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
      })
      if (res.ok) {
        setResult("ok")
      } else {
        setResult("error")
      }
    } catch {
      setResult("error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleSeed}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2 border-violet-700/30 text-violet-300 hover:bg-violet-950/30 hover:text-violet-200 h-9 text-xs"
    >
      <Database className="h-3.5 w-3.5" />
      {loading ? "Seeding..." : result === "ok" ? "✓ Demo seeded" : result === "error" ? "✗ Failed" : "Seed Demo Data"}
    </Button>
  )
}
