"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, Send, Loader2, Bot, User, ExternalLink, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnswerCard } from "./answer-card"
import { sourceTypeLabel } from "@/lib/ai/labels"
import { PANEL_PAGE_META, type PanelPageKind } from "@/lib/ai/suggestions"
import type { AiAnswerCard, AiChatMessage, AiResolvedContext, AiConversationSummary } from "@/lib/ai/types"

export interface ChatEntry {
  role: "user" | "assistant"
  content?: string
  card?: AiAnswerCard
  error?: string
}

interface AiConversationProps {
  /** Initial record context (null = global across the org). */
  initialContext?: AiResolvedContext | null
  /**
   * Controlled context. When provided, the component is scoped entirely by this
   * value (used by the floating quick panel so it can re-scope on navigation and
   * let the user expand back to the whole portfolio). When undefined, the
   * component manages its own context internally (workspace).
   */
  controlledContext?: AiResolvedContext | null
  /** Called whenever the resolved context title changes (panel scope label). */
  onScopeResolved?: (ctx: AiResolvedContext | null) => void
  /** Page kind for the quick panel — drives section-level suggestions/placeholder. */
  pageKind?: PanelPageKind
  /** Recent persisted conversations surfaced in the compact empty state. */
  recentConversations?: AiConversationSummary[]
  /** If provided, render a "Open in AI workspace" footer link. */
  openInWorkspaceHref?: string
  placeholder?: string
  /** Compact styling for panel embedding. */
  compact?: boolean
  /** Hide the context chip (used by the full workspace where context is intrinsic). */
  hideContextChip?: boolean
  /** Persist messages to a server-side conversation (workspace only). */
  persist?: boolean
  /** Active persisted conversation id (reopened conversation). */
  conversationId?: string | null
  /** Preloaded transcript for a reopened conversation. */
  initialMessages?: ChatEntry[]
  /** Called whenever the active persisted conversation id changes. */
  onConversationChange?: (id: string | null) => void
  /** Called after an exchange is persisted (let the workspace refresh its list). */
  onActivity?: () => void
  /** Called after an insight is saved (let the workspace refresh its list). */
  onInsightSaved?: () => void
}

export function AiConversation({
  initialContext = null,
  controlledContext,
  onScopeResolved,
  pageKind,
  recentConversations,
  openInWorkspaceHref,
  placeholder: placeholderProp,
  compact = false,
  hideContextChip = false,
  persist = false,
  conversationId = null,
  initialMessages,
  onConversationChange,
  onActivity,
  onInsightSaved,
}: AiConversationProps) {
  const [context, setContext] = useState<AiResolvedContext | null>(initialContext)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [messages, setMessages] = useState<ChatEntry[]>(initialMessages ?? [])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationId ?? null)
  const [savedCards, setSavedCards] = useState<Set<number>>(new Set())
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isControlled = controlledContext !== undefined
  const effectiveContext = isControlled ? controlledContext : context

  const pageMeta = pageKind ? PANEL_PAGE_META[pageKind] : undefined
  const placeholder =
    placeholderProp ??
    (effectiveContext
      ? `Ask about this ${sourceTypeLabel[effectiveContext.type].toLowerCase()}…`
      : pageMeta?.placeholder ?? "Ask anything about your portfolio…")

  // Reset the transcript when the workspace switches/clears the active
  // conversation (keyed on conversationId so ongoing "new" sessions survive
  // their first message creating an id).
  useEffect(() => {
    setActiveConversationId(conversationId ?? null)
    setMessages(initialMessages ?? [])
    setSavedCards(new Set())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  // Load the active scope's title + suggestions when the effective context or
  // page kind changes. Section-level (panel) pages use deterministic prompts;
  // record-scoped pages pull context-aware questions from the API.
  useEffect(() => {
    let active = true
    const ctx = effectiveContext
    if (!ctx && pageMeta) {
      setSuggestions(pageMeta.suggestions)
      return () => { active = false }
    }
    const query = ctx ? `?type=${encodeURIComponent(ctx.type)}&id=${encodeURIComponent(ctx.id)}` : ""
    fetch(`/api/ai/suggestions${query}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return
        if (data?.context && data.context.title) {
          if (isControlled) onScopeResolved?.(data.context as AiResolvedContext)
          else setContext(data.context as AiResolvedContext)
        }
        if (Array.isArray(data?.suggestions)) {
          setSuggestions(data.suggestions)
        } else if (!ctx && pageMeta) {
          setSuggestions(pageMeta.suggestions)
        }
      })
      .catch(() => {})
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveContext?.type, effectiveContext?.id, pageKind])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, loading])

  const resizeComposer = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [])

  const sendMessage = useCallback(async (raw: string) => {
    const text = raw.trim()
    if (!text || loading) return

    const userEntry: ChatEntry = { role: "user", content: text }
    const nextMessages = [...messages, userEntry]
    setMessages(nextMessages)
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
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
          context: effectiveContext ? { type: effectiveContext.type, id: effectiveContext.id } : null,
          history,
          persistConversation: persist,
          conversationId: persist ? activeConversationId : null,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = data?.message || "Sorry, I hit an error. Please try again."
        setMessages([...nextMessages, { role: "assistant", error: msg }])
        return
      }
      if (data?.context && data.context.title) {
        if (isControlled) onScopeResolved?.(data.context as AiResolvedContext)
        else setContext(data.context as AiResolvedContext)
      }
      if (Array.isArray(data?.suggestions)) setSuggestions(data.suggestions)
      setMessages([
        ...nextMessages,
        { role: "assistant", card: data.card as AiAnswerCard },
      ])
      // Track a newly created persisted conversation so follow-ups append to it.
      if (persist && data?.conversationId && data.conversationId !== activeConversationId) {
        setActiveConversationId(data.conversationId)
        onConversationChange?.(data.conversationId)
      }
      if (persist) onActivity?.()
    } catch {
      setMessages([...nextMessages, { role: "assistant", error: "Unable to reach the AI service. Please try again." }])
    } finally {
      setLoading(false)
    }
  }, [messages, loading, effectiveContext, persist, activeConversationId, isControlled, onScopeResolved, onConversationChange, onActivity])

  const handleSaveInsight = useCallback(async (index: number, question: string, card: AiAnswerCard) => {
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question || "",
          answer: card.answer,
          sources: card.sources,
          conversationId: activeConversationId,
        }),
      })
      if (res.ok) {
        setSavedCards((prev) => new Set(prev).add(index))
        onInsightSaved?.()
      }
    } catch {
      // Non-blocking: the user can retry from the same card.
    }
  }, [activeConversationId, onInsightSaved])

  /** The user question immediately preceding message index i (for saving). */
  const questionForIndex = useCallback((i: number): string => {
    for (let j = i - 1; j >= 0; j--) {
      if (messages[j].role === "user") return messages[j].content ?? ""
    }
    return ""
  }, [messages])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
    // Shift+Enter falls through and inserts a newline.
  }

  return (
    <div className={cn("flex flex-col", compact ? "gap-3" : "gap-4 h-full")}>
      {/* Context chip (workspace + non-panel embeds) */}
      {effectiveContext && !hideContextChip && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-2.5 py-1 text-[12px] text-violet-300">
            <Sparkles className="h-3 w-3" />
            <span className="uppercase tracking-wide text-[10px] text-violet-400/70">{sourceTypeLabel[effectiveContext.type]}</span>
            <span className="font-medium">“{effectiveContext.title}”</span>
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
        {messages.length === 0 && compact ? (
          <div className="flex flex-col gap-3 pt-0.5">
            <p className="text-[14px] font-medium text-foreground/90 leading-snug">
              {effectiveContext
                ? `Ask about this ${sourceTypeLabel[effectiveContext.type].toLowerCase()}.`
                : pageMeta?.greeting ?? "Here’s what I can help with across Operion."}
            </p>

            {/* Small source/context indicator */}
            <div className="inline-flex w-fit items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[11px] text-muted-foreground/70">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400/70" />
              {effectiveContext
                ? `${sourceTypeLabel[effectiveContext.type]} · ${effectiveContext.title || "…"}`
                : pageMeta?.label ?? "Your portfolio"}
            </div>

            {/* Recent conversations / briefings */}
            {recentConversations && recentConversations.length > 0 && (
              <div className="pt-1">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
                  Recent conversations
                </p>
                <div className="space-y-1.5">
                  {recentConversations.map((c) => (
                    <Link
                      key={c.id}
                      href="/ai"
                      className="group flex items-center gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 transition-colors hover:border-white/[0.1] hover:bg-white/[0.05]"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-400/60" />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-foreground/80 group-hover:text-foreground">
                        {c.title || "Untitled conversation"}
                      </span>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/40" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center min-h-[40vh] py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/[0.05] ring-1 ring-violet-500/[0.08] mb-4">
              <Bot className="h-7 w-7 text-violet-400/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground/80 mb-1">
              {effectiveContext ? `Ask about ${effectiveContext.type}s` : "Ask anything across your portfolio"}
            </h3>
            <p className="text-sm text-muted-foreground/60 max-w-xs">
              I&apos;ll answer with sources you can click straight into the app.
            </p>
          </div>
        ) : null}

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
                <AnswerCard
                  card={m.card}
                  question={questionForIndex(i)}
                  onSave={persist ? (q, card) => handleSaveInsight(i, q, card) : undefined}
                  saved={savedCards.has(i)}
                />
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

      {/* Composer */}
      <div className="shrink-0">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); resizeComposer() }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={placeholder}
            disabled={loading}
            className={cn(
              "block w-full resize-none overflow-y-auto pr-12 bg-[#0f0f0f] border-white/[0.06] rounded-2xl focus-visible:ring-violet-500/20 focus-visible:border-white/[0.1] placeholder:text-muted-foreground/40 focus-visible:outline-none",
              compact ? "py-3 text-[14px]" : "py-4 text-[15px]"
            )}
          />
          <Button
            size="icon"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Send question"
            className={cn(
              "absolute right-2 bottom-2 h-9 w-9 rounded-xl transition-all duration-200",
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
