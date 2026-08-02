"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ImpersonationBanner() {
  const { data: session, update } = useSession()
  const router = useRouter()

  const isImpersonating = (session?.user as any)?.isImpersonating === true

  if (!isImpersonating) return null

  const handleReturnToAdmin = async () => {
    await update({ isImpersonating: false })
    router.push("/admin")
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-amber-950/60 border-b border-amber-900/40">
      <div className="flex items-center gap-2.5 min-w-0">
        <Eye className="h-4 w-4 text-amber-400 shrink-0" />
        <p className="text-sm text-amber-200 truncate">
          Viewing as Demo —{" "}
          <span className="font-medium text-amber-100">
            {session?.user?.name || session?.user?.email}
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          onClick={handleReturnToAdmin}
          variant="ghost"
          size="sm"
          className="text-amber-300 hover:text-amber-100 hover:bg-amber-900/30 h-8 text-xs"
        >
          <LogOut className="h-3.5 w-3.5 mr-1.5" />
          Return to Admin
        </Button>
      </div>
    </div>
  )
}
