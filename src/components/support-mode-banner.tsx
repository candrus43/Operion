"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Shield, Clock, X, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SupportModeBanner() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState<string>("")

  const isSupportMode = session?.user?.isSupportMode === true
  const supportPermissions = session?.user?.supportPermissions
  const supportExpiresAt = session?.user?.supportExpiresAt
  const isReadOnly = supportPermissions === "READ"

  // Calculate time remaining
  useEffect(() => {
    if (!isSupportMode || !supportExpiresAt) return

    const updateTimer = () => {
      const now = Date.now()
      const expires = new Date(supportExpiresAt).getTime()
      const diff = expires - now

      if (diff <= 0) {
        setTimeLeft("Expired")
        // Auto-exit support mode when expired
        update({ isSupportMode: false })
        router.push("/home")
        return
      }

      const hours = Math.floor(diff / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`)
      } else {
        setTimeLeft(`${minutes}m`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [isSupportMode, supportExpiresAt, update, router])

  if (!isSupportMode) return null

  const handleExit = async () => {
    await update({ isSupportMode: false })
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-blue-950/60 border-b border-blue-900/40">
      <div className="flex items-center gap-2.5 min-w-0">
        <Shield className="h-4 w-4 text-blue-400 shrink-0" />
        <p className="text-sm text-blue-200 truncate">
          Support mode{" "}
          <span className="font-medium text-blue-100">
            {isReadOnly ? "· Read-only" : "· Read/Write"}
          </span>
          {timeLeft && (
            <span className="text-blue-300/70 ml-2">
              Expires in {timeLeft}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          onClick={handleExit}
          variant="ghost"
          size="sm"
          className="text-blue-300 hover:text-blue-100 hover:bg-blue-900/30 h-8 text-xs"
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          Exit Support Mode
        </Button>
      </div>
    </div>
  )
}
