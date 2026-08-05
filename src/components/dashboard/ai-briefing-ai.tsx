"use client"

import { useCallback, useEffect, useState } from "react"
import { Sparkles, AlertTriangle, Calendar, ShieldAlert, Lightbulb, RefreshCw } from "lucide-react"
import { Greeting } from "./greeting"

type Item = { title: string; detail: string; sourceEntity: string; sourceItem: string; urgency: string }
type Deadline = { title: string; detail: string; date: string; sourceEntity: string; sourceItem: string }
type Risk = { title: string; detail: string; sourceEntity: string; sourceItem: string }
type Action = { action: string; reason: string; sourceItem: string }
type Briefing = { criticalItems: Item[]; upcomingDeadlines: Deadline[]; risks: Risk[]; recommendedActions: Action[] }
type ApiData = { briefing: Briefing; cached?: boolean; fallback?: boolean; generatedAt?: string }

const EMPTY: Briefing = { criticalItems: [], upcomingDeadlines: [], risks: [], recommendedActions: [] }
const config = {
  critical: { label: "Critical Items", icon: AlertTriangle, accent: "text-rose-400", bg: "bg-rose-500/[0.04]", border: "border-rose-500/10", ring: "ring-rose-500/20" },
  deadlines: { label: "Upcoming Deadlines", icon: Calendar, accent: "text-sky-400", bg: "bg-sky-500/[0.04]", border: "border-sky-500/10", ring: "ring-sky-500/20" },
  risks: { label: "Risks to Watch", icon: ShieldAlert, accent: "text-amber-400", bg: "bg-amber-500/[0.04]", border: "border-amber-500/10", ring: "ring-amber-500/20" },
  actions: { label: "Recommended Actions", icon: Lightbulb, accent: "text-emerald-400", bg: "bg-emerald-500/[0.04]", border: "border-emerald-500/10", ring: "ring-emerald-500/20" },
} as const

function ago(timestamp?: string) {
  if (!timestamp) return "just now"
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000))
  return minutes < 1 ? "just now" : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`
}
function SkeletonLoader() {
  return <div className="rounded-2xl glass border border-white/[0.06] p-6 md:p-8 space-y-4 animate-pulse"><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-xl bg-white/[0.04]" /><div className="space-y-2"><div className="h-5 w-36 bg-white/[0.04] rounded" /><div className="h-3 w-40 bg-white/[0.04] rounded" /></div></div><div className="flex items-center gap-2 text-xs text-white/40"><span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />Analyzing your portfolio…</div><div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3, 4].map(i => <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-2"><div className="h-3 w-20 bg-white/[0.04] rounded" /><div className="h-4 w-full bg-white/[0.04] rounded" /><div className="h-4 w-2/3 bg-white/[0.04] rounded" /></div>)}</div></div>
}

function SectionCard({ kind, items }: { kind: keyof typeof config; items: (Item | Deadline | Risk | Action)[] }) {
  const style = config[kind]; const Icon = style.icon
  return <div className={`rounded-xl ${style.bg} border ${style.border} p-4`}><div className="flex items-center gap-2.5 mb-3"><div className={`flex h-7 w-7 items-center justify-center rounded-lg ${style.bg} ring-1 ${style.ring}`}><Icon className={`h-3.5 w-3.5 ${style.accent}`} /></div><h4 className={`text-xs font-semibold uppercase tracking-wider ${style.accent}`}>{style.label}</h4></div>{items.length ? <div className="space-y-3">{items.slice(0, 3).map((item, i) => { const isAction = kind === "actions"; const value = isAction ? item as Action : item as Item | Deadline | Risk; return <div key={i} className="rounded-lg border border-white/[0.06] bg-black/10 p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-white/85">{isAction ? (value as Action).action : (value as Item).title}</p>{kind === "critical" && <span className="shrink-0 rounded-full bg-rose-400/10 px-2 py-0.5 text-[10px] text-rose-300">{(value as Item).urgency}</span>}{kind === "deadlines" && <span className="shrink-0 rounded-full bg-sky-400/10 px-2 py-0.5 text-[10px] text-sky-300">{(value as Deadline).date}</span>}</div><p className="mt-1 text-xs leading-relaxed text-white/55">{isAction ? (value as Action).reason : (value as Item | Deadline | Risk).detail}</p><p className="mt-2 text-[10px] text-white/30">{isAction ? `Source: ${(value as Action).sourceItem}` : `Source: ${(value as Item | Deadline | Risk).sourceEntity} · ${(value as Item | Deadline | Risk).sourceItem}`}</p></div> })}</div> : <p className="py-3 pl-[2.25rem] text-sm italic text-white/30">Nothing to report</p>}</div>
}

export function AIBriefingAI({ userName }: { userName: string }) {
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [networkError, setNetworkError] = useState(false)
  const load = useCallback(async () => { setLoading(true); setNetworkError(false); try { const response = await fetch("/api/ai/briefing", { method: "POST" }); if (!response.ok) throw new Error("Briefing unavailable"); const result = await response.json() as ApiData; setData({ ...result, briefing: result.briefing || EMPTY }) } catch { setNetworkError(true) } finally { setLoading(false) } }, [])
  // Fetch once on mount; the timeout avoids blocking the initial paint.
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])
  if (loading && !data) return <SkeletonLoader />
  if (networkError && !data) return <div className="rounded-2xl border border-rose-500/10 bg-rose-500/[0.04] p-6 text-sm text-white/60">Unable to load your briefing. <button onClick={() => void load()} className="ml-2 text-white/90 underline">Retry</button></div>
  const briefing = data?.briefing || EMPTY
  return <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#0d0d10] via-[#111118] to-[#0e0e18] p-6 md:p-8"><div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-violet-500/[0.04] blur-3xl" /><div className="relative"><div className="mb-6 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20"><Sparkles className="h-5 w-5 text-violet-300" /></div><div><h2 className="text-lg font-semibold tracking-tight text-white"><Greeting firstName={userName?.split(" ")[0] || "there"} /></h2><p className="mt-0.5 text-xs text-white/40">Your AI briefing &bull; {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p></div></div>{data?.fallback && <div className="mb-4 rounded-lg border border-amber-400/10 bg-amber-400/[0.04] px-3 py-2 text-xs text-amber-200/60">Limited briefing — AI unavailable</div>}<div className="grid gap-3 sm:grid-cols-2"><SectionCard kind="critical" items={briefing.criticalItems} /><SectionCard kind="deadlines" items={briefing.upcomingDeadlines} /><SectionCard kind="risks" items={briefing.risks} /><SectionCard kind="actions" items={briefing.recommendedActions} /></div><div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-4"><p className="text-[11px] text-white/25">{data?.cached ? `Cached · updated ${ago(data.generatedAt)}` : data?.fallback ? "Limited briefing — AI unavailable" : `Updated ${ago(data?.generatedAt)}`} </p><button disabled={loading} onClick={() => void load()} className="flex items-center gap-1.5 text-[11px] text-white/40 transition-colors hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />Refresh briefing</button></div><p className="mt-2 text-right text-[10px] text-white/20">Manually refresh for latest briefing</p></div></div>
}
