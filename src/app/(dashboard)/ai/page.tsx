"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { History, Pin, Plus, Sparkles, Trash2, Pencil, Check, X, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { AiConversation } from "@/components/ai/ai-conversation"
import type { ChatEntry } from "@/components/ai/ai-conversation"
import { AnswerCard } from "@/components/ai/answer-card"
import type { AiResolvedContext, AiConversationSummary, AiInsightSummary, AiAnswerCard } from "@/lib/ai/types"

const VALID_TYPES = ["entity", "project", "task", "contact", "document", "meeting"] as const

/** Parse `?context=<type>:<id>` from the URL into a resolved context ref. */
function parseContextSearch(raw: string | null): AiResolvedContext | null {
  if (!raw) return null
  const idx = raw.indexOf(":")
  if (idx === -1) return null
  const type = raw.slice(0, idx) as (typeof VALID_TYPES)[number]
  const id = raw.slice(idx + 1)
  if (!(VALID_TYPES as readonly string[]).includes(type) || !id) return null
  return { type, id, title: "" }
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function AIWorkspacePage() {
  return (
    <Suspense fallback={<AIWorkspaceShell context={null} />}>
      <AIWorkspaceInner />
    </Suspense>
  )
}

function AIWorkspaceInner() {
  const searchParams = useSearchParams()
  const context = parseContextSearch(searchParams.get("context"))
  return <AIWorkspaceShell context={context} />
}

interface OpenedConversation {
  id: string | null // null = brand-new session
  messages: ChatEntry[]
}

function AIWorkspaceShell({ context }: { context: AiResolvedContext | null }) {
  const [conversations, setConversations] = useState<AiConversationSummary[]>([])
  const [insights, setInsights] = useState<AiInsightSummary[]>([])
  const [opened, setOpened] = useState<OpenedConversation>({ id: null, messages: [] })
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [openedInsight, setOpenedInsight] = useState<AiInsightSummary | null>(null)
  const [loadingList, setLoadingList] = useState(true)

  const refreshList = useCallback(async () => {
    try {
      const [cRes, iRes] = await Promise.all([
        fetch("/api/ai/conversations"),
        fetch("/api/ai/insights"),
      ])
      if (cRes.ok) {
        const d = await cRes.json()
        if (Array.isArray(d?.conversations)) setConversations(d.conversations)
      }
      if (iRes.ok) {
        const d = await iRes.json()
        if (Array.isArray(d?.insights)) setInsights(d.insights)
      }
    } catch {
      // Non-fatal
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => {
    refreshList()
  }, [refreshList])

  const openConversation = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}`)
      if (!res.ok) return
      const d = await res.json()
      const convo = d?.conversation
      if (!convo) return
      const msgs: ChatEntry[] = (convo.messages ?? []).map(
        (m: { role: string; content?: string; card?: AiAnswerCard | null }) =>
          m.role === "assistant" ? { role: "assistant", card: m.card ?? undefined } : { role: "user", content: m.content }
      )
      setOpened({ id: convo.id, messages: msgs })
      setHighlightId(convo.id)
      setOpenedInsight(null)
    } catch {
      // Non-fatal
    }
  }, [])

  const startNew = useCallback(() => {
    setOpened({ id: null, messages: [] })
    setHighlightId(null)
    setOpenedInsight(null)
  }, [])

  const handleConversationChange = useCallback((id: string | null) => {
    // A brand-new conversation was created server-side: highlight + refresh the
    // list, but do NOT feed the id back as a prop (that would reset the chat).
    if (id) {
      setHighlightId(id)
      refreshList()
    }
  }, [refreshList])

  const deleteConversation = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" })
      if (res.ok) {
        if (opened.id === id) startNew()
        if (highlightId === id) setHighlightId(null)
        refreshList()
      }
    } catch {
      // Non-fatal
    }
  }, [opened.id, highlightId, refreshList, startNew])

  const deleteInsight = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/ai/insights/${id}`, { method: "DELETE" })
      if (res.ok) {
        if (openedInsight?.id === id) setOpenedInsight(null)
        refreshList()
      }
    } catch {
      // Non-fatal
    }
  }, [openedInsight?.id, refreshList])

  const renameInsight = useCallback(async (id: string, title: string) => {
    try {
      const res = await fetch(`/api/ai/insights/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      if (res.ok) refreshList()
    } catch {
      // Non-fatal
    }
  }, [refreshList])

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-9rem)] min-h-0">
      {/* ── Sidebar: recent conversations + saved insights ── */}
      <aside className="w-full lg:w-80 shrink-0 flex lg:flex-col gap-6 max-h-80 overflow-y-auto lg:max-h-none lg:overflow-y-auto">
        {/* Recent conversations */}
        <section className="min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              <History className="h-3.5 w-3.5" />
              Recent conversations
            </h2>
            <button
              onClick={startNew}
              className="inline-flex items-center gap-1 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors"
            >
              <Plus className="h-3 w-3" />
              New
            </button>
          </div>
          <div className="space-y-1.5">
            {conversations.length === 0 && !loadingList && (
              <p className="text-[12px] text-muted-foreground/50 px-1 py-2">
                No conversations yet. Ask something below and it will be saved here.
              </p>
            )}
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={cn(
                  "group flex items-center gap-2 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors",
                  highlightId === c.id
                    ? "border-violet-500/30 bg-violet-500/[0.06]"
                    : "border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]"
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-foreground/80">{c.title}</p>
                  <p className="text-[11px] text-muted-foreground/50">
                    {c.messageCount} {c.messageCount === 1 ? "message" : "messages"} · {timeAgo(c.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => deleteConversation(c.id, e)}
                  aria-label="Delete conversation"
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-red-300 transition-opacity"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Saved insights */}
        <section className="min-w-0">
          <h2 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
            <Pin className="h-3.5 w-3.5" />
            Saved insights
          </h2>
          <div className="space-y-1.5">
            {insights.length === 0 && (
              <p className="text-[12px] text-muted-foreground/50 px-1 py-2">
                Pin an answer with “Save insight” to keep it here for quick reference.
              </p>
            )}
            {insights.map((ins) => (
              <InsightItem
                key={ins.id}
                insight={ins}
                active={openedInsight?.id === ins.id}
                onOpen={() => { setOpenedInsight(ins); setOpened({ id: null, messages: [] }); setHighlightId(null) }}
                onDelete={(e) => deleteInsight(ins.id, e)}
                onRename={(title) => renameInsight(ins.id, title)}
              />
            ))}
          </div>
        </section>
      </aside>

      {/* ── Main chat ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <AiConversation
          initialContext={context}
          persist
          conversationId={opened.id}
          initialMessages={opened.messages}
          onConversationChange={handleConversationChange}
          onActivity={refreshList}
          onInsightSaved={refreshList}
        />
      </div>
    </div>
  )
}

interface InsightItemProps {
  insight: AiInsightSummary
  active: boolean
  onOpen: () => void
  onDelete: (e: React.MouseEvent) => void
  onRename: (title: string) => void
}

function InsightItem({ insight, active, onOpen, onDelete, onRename }: InsightItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(insight.title ?? insight.question)
  const [saving, setSaving] = useState(false)

  const title = insight.title || insight.question

  const commitRename = async () => {
    const t = draft.trim()
    if (t && t !== title) {
      setSaving(true)
      await onRename(t)
      setSaving(false)
    }
    setEditing(false)
  }

  const card: AiAnswerCard = { answer: insight.answer, sources: insight.sources, caveats: [] }

  return (
    <div
      className={cn(
        "rounded-xl border transition-colors",
        active ? "border-violet-500/30 bg-violet-500/[0.06]" : "border-white/[0.05] bg-white/[0.02]"
      )}
    >
      <div
        onClick={onOpen}
        className="group flex items-center gap-2 px-3 py-2.5 cursor-pointer"
      >
        <Pin className="h-3.5 w-3.5 text-violet-400/60 shrink-0" />
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditing(false) }}
                className="w-full min-w-0 rounded-md border border-white/[0.1] bg-[#0f0f0f] px-2 py-1 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
              <button onClick={commitRename} disabled={saving} className="text-violet-400 hover:text-violet-300"><Check className="h-3.5 w-3.5" /></button>
              <button onClick={() => setEditing(false)} className="text-muted-foreground/50 hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <>
              <p className="truncate text-[13px] text-foreground/80">{title}</p>
              <p className="truncate text-[11px] text-muted-foreground/50">{timeAgo(insight.createdAt)}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
          <button onClick={(e) => { e.stopPropagation(); setEditing(true); setDraft(insight.title ?? insight.question) }} aria-label="Rename insight" className="text-muted-foreground/40 hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} aria-label="Remove insight" className="text-muted-foreground/40 hover:text-red-300">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {active && (
        <div className="px-3 pb-3">
          <AnswerCard card={card} />
        </div>
      )}
    </div>
  )
}
