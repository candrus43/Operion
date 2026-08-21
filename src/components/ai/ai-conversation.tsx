"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Send, Loader2, Bot, User, ExternalLink, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnswerCard } from "./answer-card"
import { sourceTypeLabel } from "@/lib/ai/labels"
import type { AiAnswerCard, AiResolvedContext } from "@/lib/ai/types"

interface ChatEntry {
  role: "user" | "assistant"
  content?: string
  card?: AiAnswerCard
  error?: string
}

interface AiConversationProps {
  /** Initial record context (null = global across the org). */
  initialContext?: AiResolvedContext | null
  /** If provided, render a "Open in AI workspace" footer link. */
  openInWorkspaceHref?: string
  placeholder?: string
  /** Compact styling for panel embedding. */
  compact?: boolean
  /** Hide the context chip (used by the full workspace where context is intrinsic). */
  hideContextChip?: boolean
}

export function AiConversation({
  initialContext = null,
  openInWorkspaceHref,
  placeholder = "Ask anything about your portfolio…",
  compact = false,
  hideContextChip = false,
}: AiConversationProps) {
  const [context, setContext] = useState<AiResolvedContext | null>(initialContext)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatEntry[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Load context-driven (or global) suggestions when the context changes.
  useEffect(() => {
    let active = true
    const ctx = context
    const query = ctx ? `?type=${encodeURIComponent(ctx.type)}&id=${encodeURIComponent(ctx.id)}` : ""
    fetch(`/api/ai/suggestions${query}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return
        if (data?.context && data.context.title) {
          setContext(data.context as AiResolvedContext)
        }
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : [])
      })
      .catch(() => {})
    return () => { active = false }
  }, [context?.type, context?.id])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, loading])

  const sendMessage = useCallback(async (raw: string) => {
    const text = raw.trim()
    if (!text || loading) return

    const userEntry: ChatEntry = { role: "user", content: text }
    const nextMessages = [...messages, userEntry]
    setMessages(nextMessages)
    setInput("")
    setLoading(true)

    // Send only the plain-text transcript as history (cards are views, not input).
    const history = nextMessages
      .filter((m) => m.role === "user" || (m.role === "assistant" && typeof m.content === "string"))
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content || "" }))

    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          context: context ? { type: context.type, id: context.id } : null,
          history,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = data?.message || "Sorry, I hit an error. Please try again."
        setMessages([...nextMessages, { role: "assistant", error: msg }])
        return
      }
      if (data?.context) setContext(data.context as AiResolvedContext)
      if (Array.isArray(data?.suggestions)) setSuggestions(data.suggestions)
      setMessages([
        ...nextMessages,
        { role: "assistant", card: data.card as AiAnswerCard },
      ])
    } catch {
      setMessages([...nextMessages, { role: "assistant", error: "Unable to reach the AI service. Please try again." }])
    } finally {
      setLoading(false)
    }
  }, [messages, loading, context])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-4 h-full")}>
      {/* Context chip */}
      {context && !hideContextChip && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-2.5 py-1 text-[12px] text-violet-300">
            <Sparkles className="h-3 w-3" />
            <span className="uppercase tracking-wide text-[10px] text-violet-400/70">{sourceTypeLabel[context.type]}</span>
            <span className="font-medium">“{context.title}”</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground/50 hover:text-foreground"
            onClick={() => { setContext(null); setSuggestions([]) }}
            aria-label="Clear AI context"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Messages + empty state */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-6" : "min-h-[40vh] py-10")}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/[0.05] ring-1 ring-violet-500/[0.08] mb-4">
              <Bot className="h-7 w-7 text-violet-400/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground/80 mb-1">
              {context ? `Ask about ${context.type}s` : "Ask anything across your portfolio"}
            </h3>
            <p className="text-sm text-muted-foreground/60 max-w-xs">
              I&apos;ll answer with sources you can click straight into the app.
            </p>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex items-start gap-3 flex-row-reverse">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20 mt-0.5">
                <User className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex max-w-[80%] flex-col items-end">
                <div className="rounded-[20px] rounded-tr-md bg-blue-500/[0.08] border border-blue-500/[0.12] px-5 py-3.5 text-[15px] text-foreground/95 whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
            </div>
          ) : m.card ? (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 mt-0.5">
                <Sparkles className="h-4 w-4 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <AnswerCard card={m.card} />
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20 mt-0.5">
                <Sparkles className="h-4 w-4 text-violet-400" />
              </div>
              <div className="rounded-xl bg-red-500/5 border border-red-500/15 px-4 py-3 text-sm text-red-300/90 max-w-[80%]">
                {m.error}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
            </div>
            <div className="rounded-xl bg-[#0f0f0f] border border-white/[0.06] px-4 py-3 text-sm text-violet-300/70">
              Thinking…
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Context-driven suggestions */}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 shrink-0">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-white/[0.06] hover:border-white/[0.1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
            >
              <Sparkles className="h-3 w-3 text-violet-400/60" />
              <span className="max-w-[260px] truncate">{s}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0">
        <div className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={loading}
            className={cn(
              "pr-12 bg-[#0f0f0f] border-white/[0.06] rounded-2xl focus-visible:ring-violet-500/20 focus-visible:border-white/[0.1] placeholder:text-muted-foreground/40",
              compact ? "py-3 text-[14px]" : "py-6 text-[15px]"
            )}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Send question"
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-xl transition-all duration-200",
              input.trim()
                ? "bg-violet-500 hover:bg-violet-400 text-white shadow-sm shadow-violet-500/20"
                : "bg-white/[0.04] text-muted-foreground/40"
            )}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {openInWorkspaceHref && (
          <Link
            href={openInWorkspaceHref}
            className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] text-violet-400/80 hover:text-violet-300 transition-colors"
          >
            Open full AI workspace
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    </div>
  )
}
