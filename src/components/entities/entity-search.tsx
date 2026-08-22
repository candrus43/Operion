"use client"

import { useState, useMemo, type ReactNode } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Building2,
  Search,
  Hotel,
  Fuel,
  Store,
  Landmark,
  MoreHorizontal,
  BriefcaseBusiness,
  Home,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { EntitySignals } from "@/lib/entity-signals"

const entityTypeConfig: Record<string, { icon: typeof Building2; color: string; label: string }> = {
  BUSINESS: { icon: Store, color: "bg-violet-500/10 text-violet-400 border-violet-500/20", label: "Business" },
  HOTEL: { icon: Hotel, color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Hotel" },
  GAS_STATION: { icon: Fuel, color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Gas Station" },
  COMMERCIAL_PROPERTY: { icon: Building2, color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Commercial" },
  INVESTMENT: { icon: Landmark, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Investment" },
  OTHER: { icon: BriefcaseBusiness, color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", label: "Other" },
}

const typeFilters = ["ALL", "BUSINESS", "HOTEL", "GAS_STATION", "COMMERCIAL_PROPERTY", "INVESTMENT", "OTHER"]

// ── Signal formatting helpers (client-safe) ────────────────────────────────
function shortDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function relativeTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return shortDate(iso)
}

interface Entity {
  id: string
  name: string
  type: string
  _count: { projects: number; tasks: number; contacts: number; documents: number }
}

export default function EntitySearch({ entities, signals = {} }: { entities: Entity[]; signals?: EntitySignals }) {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("ALL")

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return entities.filter((e) => {
      const matchesType = typeFilter === "ALL" || e.type === typeFilter
      const matchesSearch = !q || e.name.toLowerCase().includes(q) || (entityTypeConfig[e.type]?.label || "").toLowerCase().includes(q)
      return matchesType && matchesSearch
    })
  }, [entities, search, typeFilter])

  return (
    <>
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search entities..."
          className="pl-9 glass border-0"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Type filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {typeFilters.map((type) => {
          const label = type === "ALL" ? "All types" : entityTypeConfig[type]?.label || type
          return <button key={type} onClick={() => setTypeFilter(type)} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs transition-all", typeFilter === type ? "border-violet-400/40 bg-violet-400/15 text-violet-200 shadow-[0_0_18px_rgba(167,139,250,0.12)]" : "border-white/[0.08] bg-white/[0.025] text-white/45 hover:border-white/20 hover:text-white/80")}>{label}</button>
        })}
      </div>

      {/* Entity Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((entity) => {
          const config = entityTypeConfig[entity.type] || entityTypeConfig.OTHER
          const Icon = config.icon
          const sig = signals[entity.id]

          // Only render signals that actually have data — nothing fabricated.
          const signalPills: ReactNode[] = []
          if (sig) {
            if (sig.attentionCount > 0) {
              signalPills.push(
                <span key="attention" className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-medium text-rose-300" title="Items needing attention">
                  {sig.attentionCount} need attention
                </span>
              )
            }
            if (sig.blockedCount > 0) {
              signalPills.push(
                <span key="blocked" className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[10px] font-medium text-orange-300" title="Blocked tasks">
                  {sig.blockedCount} blocked
                </span>
              )
            }
            if (sig.awaitingReviewCount > 0) {
              signalPills.push(
                <span key="awaiting" className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-[10px] font-medium text-purple-300" title="Tasks awaiting review/approval">
                  {sig.awaitingReviewCount} to review
                </span>
              )
            }
            if (sig.nearestDeadline) {
              const d = shortDate(sig.nearestDeadline.date)
              signalPills.push(
                <span key="deadline" className={cn("rounded-full border px-2.5 py-1 text-[10px] font-medium", sig.nearestDeadline.overdue ? "border-rose-500/20 bg-rose-500/10 text-rose-300" : "border-sky-400/15 bg-sky-400/[0.07] text-sky-200/70")} title={sig.nearestDeadline.kind === "document" ? "Document expires" : "Task due"}>
                  {sig.nearestDeadline.kind === "document" ? "Doc " : "Due "}{d}{sig.nearestDeadline.overdue ? " (overdue)" : ""}
                </span>
              )
            }
            if (sig.activeProjectCount > 0) {
              signalPills.push(
                <span key="projects" className="rounded-full border border-emerald-500/15 bg-emerald-500/[0.07] px-2.5 py-1 text-[10px] text-emerald-200/80" title="Active projects">
                  {sig.activeProjectCount} active
                </span>
              )
            }
            if (sig.lastActivity) {
              signalPills.push(
                <span key="activity" className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/50" title="Last activity">
                  {relativeTime(sig.lastActivity)}
                </span>
              )
            }
            if (sig.leader) {
              signalPills.push(
                <span key="leader" className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/50" title="Responsible leader">
                  {sig.leader}
                </span>
              )
            }
          }

          return (
            <Link key={entity.id} href={`/entities/${entity.id}`}>
              <Card className="glass card-glow hover:bg-white/[0.07] transition-all cursor-pointer group overflow-hidden relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl ring-1 shadow-lg", config.color)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-base group-hover:text-white transition-colors">
                          {entity.name}
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] px-1.5 py-0 mt-1 border", config.color)}
                        >
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-sky-400/15 bg-sky-400/[0.07] px-2.5 py-1 text-[10px] text-sky-200/70">{entity._count.projects} projects</span>
                    <span className="rounded-full border border-amber-400/15 bg-amber-400/[0.07] px-2.5 py-1 text-[10px] text-amber-200/70">{entity._count.tasks} tasks</span>
                    <span className="rounded-full border border-violet-400/15 bg-violet-400/[0.07] px-2.5 py-1 text-[10px] text-violet-200/70">{entity._count.documents} docs</span>
                  </div>
                  {signalPills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">{signalPills}</div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No entities found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {search ? "No entities match your search." : "Create your first entity to start managing your portfolio."}
          </p>
        </div>
      )}
    </>
  )
}
