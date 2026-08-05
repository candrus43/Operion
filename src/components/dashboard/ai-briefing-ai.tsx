"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"
import { Greeting } from "./greeting"

const FALLBACK = `1. Critical Items
Review overdue and high-priority tasks first.

2. Upcoming Deadlines
Check your Tasks and Calendar views for deadlines in the next seven days.

3. Risks to Watch
Unassigned, blocked, or overdue work may put active projects at risk.

4. Recommended Actions
Prioritize the oldest overdue item, confirm owners for critical work, and review upcoming meetings.`

function BriefingBody({ text }: { text: string }) {
  return <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</div>
}

export function AIBriefingAI({ userName }: { userName: string }) {
  const [briefing, setBriefing] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch("/api/ai/briefing", { method: "POST" })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Briefing unavailable")))
      .then(data => { if (active && data.briefing) setBriefing(data.briefing) })
      .catch(() => { if (active) setBriefing(FALLBACK) })
    return () => { active = false }
  }, [])

  if (!briefing) {
    return <div className="rounded-2xl glass border border-white/[0.06] p-6 space-y-4 animate-pulse"><div className="h-6 w-48 bg-white/[0.04] rounded" /><div className="h-4 w-3/4 bg-white/[0.04] rounded" /><div className="h-4 w-2/3 bg-white/[0.04] rounded" /><div className="h-4 w-1/2 bg-white/[0.04] rounded" /></div>
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#111111] via-[#151518] to-[#111122] p-6 md:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.03] via-transparent to-blue-500/[0.03]" />
      <div className="relative">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20"><Sparkles className="h-4.5 w-4.5 text-amber-400" /></div>
          <div><h2 className="text-lg font-semibold tracking-tight"><Greeting firstName={userName?.split(" ")[0] || "there"} /></h2><p className="text-xs text-muted-foreground/80 mt-0.5">Your AI briefing</p></div>
        </div>
        <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4"><BriefingBody text={briefing} /></div>
      </div>
    </div>
  )
}
