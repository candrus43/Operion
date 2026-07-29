"use client"

import { useEffect, useState, useRef } from "react"
import { Building2, Users, FolderKanban, CheckSquare, Sparkles, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { TripleProgressRing } from "./progress-ring"

export interface DiscoveryItem {
  id: string
  icon: "entity" | "contact" | "project" | "task" | "scanning" | "complete"
  text: string
}

interface DiscoveryFeedProps {
  items: DiscoveryItem[]
  entityProgress: number
  contactProgress: number
  taskProgress: number
  /** Called after the final item has animated in */
  onComplete?: () => void
  /** Total number of entities being created */
  entityTotal?: number
  contactTotal?: number
  taskTotal?: number
}

export function DiscoveryFeed({
  items,
  entityProgress,
  contactProgress,
  taskProgress,
  onComplete,
  entityTotal = 0,
  contactTotal = 0,
  taskTotal = 0,
}: DiscoveryFeedProps) {
  const [visibleCount, setVisibleCount] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const completedRef = useRef(false)

  useEffect(() => {
    if (visibleCount >= items.length) {
      if (!completedRef.current) {
        completedRef.current = true
        const timer = setTimeout(() => onComplete?.(), 1200)
        return () => clearTimeout(timer)
      }
      return
    }

    const timer = setTimeout(() => {
      setVisibleCount(prev => prev + 1)
    }, visibleCount === 0 ? 400 : 600)

    return () => clearTimeout(timer)
  }, [visibleCount, items.length, onComplete])

  useEffect(() => {
    if (containerRef.current && visibleCount > 0) {
      const lastItem = containerRef.current.children[visibleCount - 1] as HTMLElement
      if (lastItem) {
        lastItem.scrollIntoView({ behavior: "smooth", block: "nearest" })
      }
    }
  }, [visibleCount])

  const iconMap = {
    entity: { icon: Building2, color: "text-blue-400", bg: "bg-blue-500/10" },
    contact: { icon: Users, color: "text-green-400", bg: "bg-green-500/10" },
    project: { icon: FolderKanban, color: "text-amber-400", bg: "bg-amber-500/10" },
    task: { icon: CheckSquare, color: "text-violet-400", bg: "bg-violet-500/10" },
    scanning: { icon: Sparkles, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    complete: { icon: Sparkles, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Progress rings */}
      <div className="pt-4">
        <TripleProgressRing
          entityProgress={entityProgress}
          contactProgress={contactProgress}
          taskProgress={taskProgress}
          entityLabel={entityTotal > 0 ? `${entityTotal} entities` : "Entities"}
          contactLabel={contactTotal > 0 ? `${contactTotal} contacts` : "Contacts"}
          taskLabel={taskTotal > 0 ? `${taskTotal} tasks` : "Tasks"}
        />
      </div>

      {/* Discovery feed */}
      <div
        ref={containerRef}
        className="w-full max-w-md space-y-2 max-h-[280px] overflow-y-auto pr-2"
      >
        {items.slice(0, visibleCount).map((item, idx) => {
          const { icon: Icon, color, bg } = iconMap[item.icon]
          const isLatest = idx === visibleCount - 1

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-500",
                isLatest ? "animate-slide-in" : "opacity-70"
              )}
              style={{
                animationDelay: "0ms",
              }}
            >
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", bg)}>
                {item.icon === "scanning" ? (
                  <Loader2 className={cn("h-4 w-4 animate-spin", color)} />
                ) : (
                  <Icon className={cn("h-4 w-4", color)} />
                )}
              </div>
              <span className="text-sm text-muted-foreground">{item.text}</span>
            </div>
          )
        })}
      </div>

      {/* Completion message */}
      {visibleCount >= items.length && (
        <div className="text-center animate-fade-in pt-2">
          <p className="text-lg font-semibold text-foreground">
            Your command center is ready
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Redirecting to your dashboard...
          </p>
        </div>
      )}
    </div>
  )
}
