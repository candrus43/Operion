"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

function Progress({ className, value = 0, max = 100, ...props }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-[#1a1a1a]",
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{
          width: `${pct}%`,
          background: pct >= 80
            ? "linear-gradient(90deg, #22c55e, #16a34a)"
            : pct >= 40
            ? "linear-gradient(90deg, #3b82f6, #2563eb)"
            : pct > 0
            ? "linear-gradient(90deg, #f59e0b, #d97706)"
            : "transparent",
        }}
      />
    </div>
  )
}

export { Progress }
