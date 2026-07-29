import { cn } from "@/lib/utils"
import Link from "next/link"
import { TrendingUp, AlertTriangle, Zap, ArrowUpRight } from "lucide-react"

interface HealthScoreProps {
  score: number
  deductions: string[]
  /** Tasks completed in the current week */
  weeklyCompleted: number
  className?: string
}

export function HealthScore({ score, deductions, weeklyCompleted, className }: HealthScoreProps) {
  // Color based on score
  const scoreColor =
    score >= 80 ? "text-emerald-400" :
    score >= 60 ? "text-amber-400" :
    "text-red-400"

  const ringColor =
    score >= 80 ? "#22c55e" :
    score >= 60 ? "#f59e0b" :
    "#ef4444"

  const ringBgColor =
    score >= 80 ? "rgba(34,197,94,0.1)" :
    score >= 60 ? "rgba(245,158,11,0.1)" :
    "rgba(239,68,68,0.1)"

  const size = 72
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference

  return (
    <div className={cn("rounded-xl bg-[#111111] border border-white/[0.04] p-5", className)}>
      <div className="flex items-start gap-4">
        {/* Score ring */}
        <div className="relative shrink-0">
          <svg
            width={size}
            height={size}
            className="transform -rotate-90"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* Score text centered in ring */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn("text-lg font-bold", scoreColor)}>{score}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-1">Portfolio Health</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {score >= 90 ? "Everything is running smoothly" :
             score >= 70 ? "Most things are on track" :
             score >= 50 ? "A few items need attention" :
             "Needs immediate attention"}
          </p>

          {/* Deductions */}
          {deductions.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {deductions.map((d, i) => {
                const deductionRoute = d.includes("overdue task")
                  ? "/tasks?status=overdue"
                  : d.includes("stalled project")
                  ? "/projects"
                  : d.includes("unassigned task")
                  ? "/tasks?assignee=none"
                  : null

                if (deductionRoute) {
                  return (
                    <Link
                      key={i}
                      href={deductionRoute}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/70 transition-colors group cursor-pointer"
                    >
                      <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                      <span>{d}</span>
                      <ArrowUpRight className="h-3 w-3 text-muted-foreground/20 group-hover:text-foreground/40 transition-colors shrink-0" />
                    </Link>
                  )
                }

                return (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                    <span>{d}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Momentum streak */}
      <div className="mt-4 pt-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs text-muted-foreground">
            {weeklyCompleted > 0
              ? `On track this week · ${weeklyCompleted} task${weeklyCompleted > 1 ? "s" : ""} completed`
              : "No tasks completed this week yet"}
          </span>
        </div>
      </div>
    </div>
  )
}
