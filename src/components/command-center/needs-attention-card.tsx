"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ArrowUpRight, CheckSquare, FolderKanban } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NeedsAttentionItem, NeedsAttentionReason } from "@/lib/needs-attention"

// ── Reason → color / label maps (AA contrast on dark) ────────────────────────
const REASON_META: Record<NeedsAttentionReason, { label: string; cls: string }> = {
  BLOCKED: { label: "Blocked", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  OVERDUE: { label: "Overdue", cls: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  CRITICAL: { label: "Critical", cls: "bg-red-500/10 text-red-400 border-red-500/20" },
  WAITING_ON: { label: "Waiting", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  HIGH: { label: "High", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  OPEN: { label: "Open", cls: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
}

export function needsAttentionSummary(items: NeedsAttentionItem[]): { label: string; count: number }[] {
  const order: NeedsAttentionReason[] = ["BLOCKED", "OVERDUE", "CRITICAL", "WAITING_ON", "HIGH", "OPEN"]
  return order
    .map((r) => ({ label: REASON_META[r].label.toLowerCase(), count: items.filter((i) => i.reason === r).length }))
    .filter((s) => s.count > 0)
}

interface NeedsAttentionCardProps {
  items: NeedsAttentionItem[]
  /** Optional entity name to disambiguate on cross-entity (contact) pages. */
  showEntity?: boolean
  className?: string
}

/**
 * The Needs-Attention briefing block used by entity + contact command centers.
 * Summarizes open / overdue / blocked / critical items scoped to the record,
 * each deep-linking back to the source task/project.
 */
export function NeedsAttentionCard({ items, showEntity = false, className }: NeedsAttentionCardProps) {
  const summary = needsAttentionSummary(items)

  return (
    <Card className={cn("glass", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Needs Attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 mb-3">
              <CheckSquare className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">All clear</p>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Nothing open, overdue, or blocked right now.
            </p>
          </div>
        ) : (
          <>
            {summary.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {summary.map((s) => (
                  <Badge key={s.label} variant="outline" className={cn("text-[10px] px-2 py-0.5", REASON_META[Object.keys(REASON_META).find((k) => REASON_META[k as NeedsAttentionReason].label.toLowerCase() === s.label) as NeedsAttentionReason]?.cls)}>
                    {s.count} {s.label}
                  </Badge>
                ))}
              </div>
            )}
            <div className="space-y-1.5">
              {items.map((item) => {
                const meta = REASON_META[item.reason]
                return (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    href={item.url}
                    className="flex items-start gap-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] p-2.5 transition-colors group"
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.kind === "task" ? (
                        <CheckSquare className="h-4 w-4 text-muted-foreground/60" />
                      ) : (
                        <FolderKanban className="h-4 w-4 text-muted-foreground/60" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/90 group-hover:text-white transition-colors truncate">
                        {item.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span className={cn("text-[10px] px-1.5 py-0 border rounded", meta.cls)}>{meta.label}</span>
                        {showEntity && item.entityName && (
                          <span className="text-[10px] text-muted-foreground/60">{item.entityName}</span>
                        )}
                        {item.dueDate && (
                          <span className="text-[10px] text-muted-foreground/60">
                            {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/20 group-hover:text-foreground/40 transition-colors shrink-0 mt-1" />
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
