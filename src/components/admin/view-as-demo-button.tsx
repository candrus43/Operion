"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ViewAsDemoButton() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const isSuperAdmin = (session?.user as any)?.isSuperAdmin === true
  const isImpersonating = (session?.user as any)?.isImpersonating === true

  // Only show if super admin and not already impersonating
  if (!isSuperAdmin || isImpersonating) return null

  const handleClick = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/impersonate", { method: "POST" })
      if (!res.ok) {
        const err = await res.json()
        console.error("Impersonation failed:", err.error)
        return
      }
      const data = await res.json()
      if (data.success && data.impersonation) {
        await update(data.impersonation)
        router.push("/home")
      }
    } catch (err) {
      console.error("Impersonation error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      variant="outline"
      size="sm"
      className="gap-2 border-amber-700/30 text-amber-300 hover:bg-amber-950/30 hover:text-amber-200 h-9 text-xs"
    >
      <Eye className="h-3.5 w-3.5" />
      {loading ? "Loading..." : "View as Demo"}
    </Button>
  )
}
