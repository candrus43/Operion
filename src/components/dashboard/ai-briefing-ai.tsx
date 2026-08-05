"use client"

import { useEffect, useState } from "react"
import { Sparkles, AlertTriangle, Calendar, ShieldAlert, Lightbulb, ArrowRight } from "lucide-react"
import { Greeting } from "./greeting"

const FALLBACK = `1. Critical Items
Review overdue and high-priority tasks first.

2. Upcoming Deadlines
Check your Tasks and Calendar views for deadlines in the next seven days.

3. Risks to Watch
Unassigned, blocked, or overdue work may put active projects at risk.

4. Recommended Actions
Prioritize the oldest overdue item, confirm owners for critical work, and review upcoming meetings.`

interface Section {
  heading: string
  body: string
}

function parseBriefing(text: string): Section[] {
  const sections: Section[] = []
  const lines = text.split("\n")
  let currentHeading = ""
  let currentBody: string[] = []

  for (const line of lines) {
    const match = line.match(/^(\d+)\.\s+(.+)/)
    if (match) {
      if (currentHeading) {
        sections.push({ heading: currentHeading, body: currentBody.join("\n").trim() })
      }
      currentHeading = match[2]
      currentBody = []
    } else if (currentHeading && line.trim()) {
      currentBody.push(line.trim())
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, body: currentBody.join("\n").trim() })
  }
  return sections
}

const sectionConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; accent: string; bg: string; border: string; ring: string }> = {
  "Critical Items": { icon: AlertTriangle, accent: "text-rose-400", bg: "bg-rose-500/[0.04]", border: "border-rose-500/10", ring: "ring-rose-500/20" },
  "Upcoming Deadlines": { icon: Calendar, accent: "text-sky-400", bg: "bg-sky-500/[0.04]", border: "border-sky-500/10", ring: "ring-sky-500/20" },
  "Risks to Watch": { icon: ShieldAlert, accent: "text-amber-400", bg: "bg-amber-500/[0.04]", border: "border-amber-500/10", ring: "ring-amber-500/20" },
  "Recommended Actions": { icon: Lightbulb, accent: "text-emerald-400", bg: "bg-emerald-500/[0.04]", border: "border-emerald-500/10", ring: "ring-emerald-500/20" },
}

function getSectionStyle(heading: string) {
  for (const [key, config] of Object.entries(sectionConfig)) {
    if (heading.toLowerCase().includes(key.toLowerCase())) return config
  }
  return { icon: ArrowRight, accent: "text-violet-400", bg: "bg-violet-500/[0.04]", border: "border-violet-500/10", ring: "ring-violet-500/20" }
}

function SectionCard({ heading, body }: Section) {
  const style = getSectionStyle(heading)
  const Icon = style.icon

  return (
    <div className={`rounded-xl ${style.bg} border ${style.border} p-4 group hover:border-white/[0.08] transition-colors`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${style.bg} ring-1 ${style.ring}`}>
          <Icon className={`h-3.5 w-3.5 ${style.accent}`} />
        </div>
        <h4 className={`text-xs font-semibold uppercase tracking-wider ${style.accent}`}>{heading}</h4>
      </div>
      <p className="text-sm leading-relaxed text-white/70 pl-[2.25rem]">{body}</p>
    </div>
  )
}

function SkeletonLoader() {
  return (
    <div className="rounded-2xl glass border border-white/[0.06] p-6 md:p-8 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-white/[0.04]" />
        <div className="space-y-2">
          <div className="h-5 w-36 bg-white/[0.04] rounded" />
          <div className="h-3 w-24 bg-white/[0.04] rounded" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-2">
            <div className="h-3 w-20 bg-white/[0.04] rounded" />
            <div className="h-4 w-full bg-white/[0.04] rounded" />
            <div className="h-4 w-2/3 bg-white/[0.04] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function AIBriefingAI({ userName }: { userName: string }) {
  const [briefing, setBriefing] = useState<string | null>(null)
  const [sections, setSections] = useState<Section[]>([])

  useEffect(() => {
    let active = true
    fetch("/api/ai/briefing", { method: "POST" })
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Briefing unavailable")))
      .then(data => {
        if (!active) return
        const text = data.briefing || FALLBACK
        setBriefing(text)
        setSections(parseBriefing(text))
      })
      .catch(() => {
        if (!active) return
        setBriefing(FALLBACK)
        setSections(parseBriefing(FALLBACK))
      })
    return () => { active = false }
  }, [])

  if (!briefing) return <SkeletonLoader />

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#0d0d10] via-[#111118] to-[#0e0e18] p-6 md:p-8">
      {/* Ambient aurora */}
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-violet-500/[0.04] blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-500/[0.03] blur-3xl" />
      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
            <Sparkles className="h-5 w-5 text-violet-300" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">
              <Greeting firstName={userName?.split(" ")[0] || "there"} />
            </h2>
            <p className="text-xs text-white/40 mt-0.5">Your AI briefing &bull; {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</p>
          </div>
        </div>

        {/* Section cards */}
        {sections.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.map((section, i) => (
              <SectionCard key={i} heading={section.heading} body={section.body} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/70">{briefing}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/[0.05]">
          <p className="text-[11px] text-white/25">Powered by GPT-4o &bull; Refreshes every 5 minutes</p>
          <button
            onClick={() => {
              setSections([])
              setBriefing(null)
              fetch("/api/ai/briefing", { method: "POST" })
                .then(r => r.json())
                .then(data => {
                  const text = data.briefing || FALLBACK
                  setBriefing(text)
                  setSections(parseBriefing(text))
                })
                .catch(() => {
                  setBriefing(FALLBACK)
                  setSections(parseBriefing(FALLBACK))
                })
            }}
            className="text-[11px] text-white/30 hover:text-white/50 transition-colors"
          >
            Refresh briefing
          </button>
        </div>
      </div>
    </div>
  )
}
