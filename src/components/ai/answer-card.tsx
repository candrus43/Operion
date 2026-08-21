"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Link from "next/link"
import { AlertTriangle, BookOpen, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { sourceTypeLabel } from "@/lib/ai/labels"
import type { AiAnswerCard, AiSource } from "@/lib/ai/types"

const sourceIconDot: Record<string, string> = {
  entity: "bg-emerald-400",
  project: "bg-sky-400",
  task: "bg-violet-400",
  contact: "bg-rose-400",
  document: "bg-amber-400",
  meeting: "bg-blue-400",
}

/**
 * Renders a structured AI answer card: direct answer + deep-link sources +
 * caveats. Reused by the AI workspace, the contextual panel, and anywhere an
 * AiAnswerCard needs to be shown.
 */
export function AnswerCard({ card }: { card: AiAnswerCard }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0f0f0f] overflow-hidden">
      {/* Answer */}
      <div className="px-5 py-4">
        <div className="prose-chat">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children, ...p }) => <p className="text-[15px] leading-relaxed text-foreground/90 mb-2.5 last:mb-0" {...p}>{children}</p>,
              h1: ({ children, ...p }) => <h1 className="text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0" {...p}>{children}</h1>,
              h2: ({ children, ...p }) => <h2 className="text-base font-semibold text-foreground/95 mt-4 mb-2 first:mt-0" {...p}>{children}</h2>,
              h3: ({ children, ...p }) => <h3 className="text-[15px] font-semibold text-foreground/90 mt-3 mb-1.5 first:mt-0" {...p}>{children}</h3>,
              ul: ({ children, ...p }) => <ul className="space-y-1.5 my-2 pl-4 list-disc marker:text-violet-400/50" {...p}>{children}</ul>,
              ol: ({ children, ...p }) => <ol className="space-y-1.5 my-2 pl-4 list-decimal marker:text-violet-400/50" {...p}>{children}</ol>,
              li: ({ children, ...p }) => <li className="text-[15px] leading-relaxed text-foreground/85" {...p}>{children}</li>,
              strong: ({ children, ...p }) => <strong className="font-semibold text-foreground" {...p}>{children}</strong>,
              code: ({ className, children, ...p }) => (
                <code className={cn("bg-white/[0.06] text-foreground/80 px-1.5 py-0.5 rounded-md text-[13px] font-mono", className)} {...p}>{children}</code>
              ),
              a: ({ children, href, ...p }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 underline decoration-violet-400/30 underline-offset-2" {...p}>{children}</a>
              ),
            }}
          >
            {card.answer}
          </ReactMarkdown>
        </div>
      </div>

      {/* Sources */}
      {card.sources.length > 0 && (
        <div className="border-t border-white/[0.05] px-5 py-3.5">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50 mb-2.5">
            <BookOpen className="h-3.5 w-3.5" />
            Sources
          </p>
          <div className="flex flex-wrap gap-2">
            {card.sources.map((s, i) => (
              <SourceLink key={`${s.type}:${s.id}:${i}`} source={s} />
            ))}
          </div>
        </div>
      )}

      {/* Caveats / unknowns */}
      {card.caveats.length > 0 && (
        <div className="border-t border-white/[0.05] bg-amber-500/[0.03] px-5 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-amber-400/70 mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Caveats &amp; unknowns
          </p>
          <ul className="space-y-1">
            {card.caveats.map((c, i) => (
              <li key={i} className="text-[13px] text-foreground/70 flex gap-2">
                <span className="text-amber-400/60 mt-[3px]">•</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SourceLink({ source }: { source: AiSource }) {
  return (
    <Link
      href={source.url}
      className="inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5 text-[13px] text-foreground/80 hover:bg-white/[0.06] hover:border-white/[0.12] hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
    >
      <span className={cn("h-2 w-2 rounded-full shrink-0", sourceIconDot[source.type] ?? "bg-zinc-400")} />
      <span className="min-w-0 max-w-[220px] truncate">{source.title}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50 shrink-0">{sourceTypeLabel[source.type]}</span>
      <ExternalLink className="h-3 w-3 text-muted-foreground/40 shrink-0" />
    </Link>
  )
}
