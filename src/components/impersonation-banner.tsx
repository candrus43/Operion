"use client"

import { useSession } from "next-auth/react"
import { Eye } from "lucide-react"

export function ImpersonationBanner() {
  const { data: session } = useSession()

  const isImpersonating = (session?.user as any)?.isImpersonating === true

  if (!isImpersonating) return null

  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-950/60 border-b border-amber-900/40">
      <Eye className="h-4 w-4 text-amber-400 shrink-0" />
      <p className="text-sm text-amber-200 truncate">
        Viewing as Demo —{" "}
        <span className="font-medium text-amber-100">
          {session?.user?.name || session?.user?.email}
        </span>
      </p>
    </div>
  )
}
