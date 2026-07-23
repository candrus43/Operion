"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Monitor, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DemoBanner() {
  const { data: session, status } = useSession()

  if (status !== "authenticated") return null
  if (session?.user?.email !== "navid@movement.com") return null

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-violet-950/40 border-b border-violet-900/30">
      <div className="flex items-center gap-2.5 min-w-0">
        <Monitor className="h-3.5 w-3.5 text-violet-400 shrink-0" />
        <p className="text-xs text-violet-200/80">
          You&apos;re exploring the demo. Data is read-only.{" "}
          <span className="text-violet-100 font-medium">
            Like what you see?
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white border-0"
          asChild
        >
          <Link href="/register">
            Start your 14-day free trial
            <ArrowRight className="ml-1.5 h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
