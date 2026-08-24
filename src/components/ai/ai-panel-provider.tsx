"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { ChevronLeft, Maximize2, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AiConversation } from "./ai-conversation"
import { PANEL_PAGE_META, panelPageKindFromPath } from "@/lib/ai/suggestions"
import { sourceTypeLabel } from "@/lib/ai/labels"
import type { AiConversationSummary, AiResolvedContext, AiSourceType } from "@/lib/ai/types"

interface AIPanelContextType {
  isOpen: boolean
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
}

const AIPanelContext = createContext<AIPanelContextType | null>(null)

/** Access the global floating AI panel from anywhere inside the dashboard. */
export function useAIPanel() {
  const ctx = useContext(AIPanelContext)
  if (!ctx) {
    throw new Error("useAIPanel must be used within an AIPanelProvider")
  }
  return ctx
}

const SECTION_TO_TYPE: Record<string, AiSourceType> = {
  projects: "project",
  tasks: "task",
  entities: "entity",
  documents: "document",
  contacts: "contact",
  meetings: "meeting",
}

/**
 * Derive a record scope from a detail-page path (e.g. /projects/abc123 →
 * { type: "project", id: "abc123" }). List pages ("new", "edit", or no id)
 * return null — those stay section-level.
 */
function parseRecordScope(pathname: string): { type: AiSourceType; id: string } | null {
  const segs = pathname.split("/").filter(Boolean)
  if (segs.length < 2) return null
  const type = SECTION_TO_TYPE[segs[0]]
  const id = segs[1]
  if (!type || !id || id === "new" || id === "edit") return null
  return { type, id }
}

/**
 * Global floating AI assistant for the dashboard.
 *
 * Renders a single, unobtrusive circular trigger (bottom-right) on every
 * dashboard page and a compact right-hand quick panel. The panel:
 *  - never dims or blocks the underlying page (subtle, inert tint only),
 *  - is page-aware (section-level suggestions + auto-scoped on detail pages),
 *  - embeds the same `AiConversation` used by the full workspace, so chat
 *    state survives client-side navigation.
 * The dedicated /ai workspace remains for deeper research and long threads.
 */
export function AIPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const openPanel = useCallback(() => setIsOpen(true), [])
  const closePanel = useCallback(() => setIsOpen(false), [])
  const togglePanel = useCallback(() => setIsOpen((prev) => !prev), [])

  const pathname = usePathname() ?? ""
  const pageKind = useMemo(() => panelPageKindFromPath(pathname), [pathname])
  const pathRecord = useMemo(() => parseRecordScope(pathname), [pathname])

  // Record scope with an "expand to portfolio" override (null = whole portfolio).
  const [activeRecord, setActiveRecord] = useState<{ type: AiSourceType; id: string } | null>(pathRecord)
  const [scopeTitle, setScopeTitle] = useState<string | null>(null)

  // Re-scope whenever the user navigates to a different page.
  useEffect(() => {
    setActiveRecord(pathRecord)
    setScopeTitle(null)
  }, [pathRecord])

  // Recent conversations surface in the compact empty state.
  const [recent, setRecent] = useState<AiConversationSummary[]>([])
  useEffect(() => {
    if (!isOpen) return
    let active = true
    fetch("/api/ai/conversations")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && Array.isArray(d?.conversations)) setRecent(d.conversations.slice(0, 3))
      })
      .catch(() => {})
    return () => { active = false }
  }, [isOpen])

  const handleScopeResolved = useCallback((ctx: AiResolvedContext | null) => {
    setScopeTitle(ctx?.title ?? null)
  }, [])

  const expandScope = useCallback(() => {
    setActiveRecord(null)
    setScopeTitle(null)
  }, [])

  const isRecordScoped = activeRecord !== null
  const pageMeta = PANEL_PAGE_META[pageKind]

  const headerLabel = isRecordScoped
    ? `Viewing: ${scopeTitle || sourceTypeLabel[activeRecord.type]}`
    : pageKind === "global"
      ? "Across your portfolio"
      : `Viewing: ${pageMeta.label}`

  const placeholder = isRecordScoped
    ? scopeTitle
      ? `Ask about “${scopeTitle}”…`
      : `Ask about this ${sourceTypeLabel[activeRecord.type].toLowerCase()}…`
    : pageMeta?.placeholder ?? "Ask anything across your portfolio…"

  const workspaceHref = isRecordScoped
    ? `/ai?context=${encodeURIComponent(activeRecord.type)}:${encodeURIComponent(activeRecord.id)}`
    : "/ai"

  return (
    <AIPanelContext.Provider value={{ isOpen, openPanel, closePanel, togglePanel }}>
      {children}

      {/* Inert, extremely subtle tint — never blocks or dims the page. */}
      <div
        className={cn(
          "fixed inset-0 z-[45] pointer-events-none bg-black/10 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        aria-hidden="true"
      />

      {/* Quick panel — desktop ~420px, tablet ~half, mobile full-screen. */}
      <div
        className={cn(
          "fixed top-0 right-0 z-[50] flex h-full flex-col bg-[#0b0b0c] border-l border-white/[0.07] shadow-2xl transition-transform duration-300 ease-in-out",
          "w-full sm:w-[min(50vw,430px)] md:w-[420px] md:max-w-[440px] max-w-full",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Operion AI Assistant"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 shrink-0 border-b border-white/[0.06] px-4 py-3.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={closePanel}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1a1a1a] hover:text-white md:hidden"
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-500/10 ring-1 ring-violet-500/20">
                  <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <h2 className="text-[15px] font-semibold tracking-tight truncate">Operion AI</h2>
              </div>
              <p className="flex items-center gap-1.5 pl-8 text-[11px] text-muted-foreground/70 min-w-0">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/70" />
                <span className="truncate">{headerLabel}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isRecordScoped && (
              <button
                onClick={expandScope}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1a1a1a] hover:text-white"
                title="Expand to your entire portfolio"
                aria-label="Expand to entire portfolio"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={closePanel}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1a1a1a] hover:text-white"
              aria-label="Close AI assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Conversation */}
        <div className="min-h-0 flex-1 flex flex-col px-4 py-3">
          <AiConversation
            compact
            hideContextChip
            pageKind={pageKind}
            controlledContext={isRecordScoped ? { type: activeRecord.type, id: activeRecord.id, title: scopeTitle ?? "" } : null}
            onScopeResolved={handleScopeResolved}
            recentConversations={recent}
            openInWorkspaceHref={workspaceHref}
            placeholder={placeholder}
          />
        </div>
      </div>

      {/* Compact circular trigger — one global affordance across all pages. */}
      <div className="group fixed bottom-5 right-5 z-[60]">
        <button
          onClick={togglePanel}
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#151518]/95 text-violet-300 backdrop-blur transition-all duration-200",
            "shadow-[0_0_0_1px_rgba(139,92,246,0.2),0_0_14px_-2px_rgba(124,58,237,0.35),0_0_22px_-6px_rgba(59,130,246,0.28),0_10px_28px_-10px_rgba(0,0,0,0.7)]",
            "hover:border-violet-400/40 hover:text-violet-200 hover:shadow-[0_0_0_1px_rgba(139,92,246,0.45),0_0_18px_-2px_rgba(124,58,237,0.5),0_0_26px_-6px_rgba(59,130,246,0.35)]",
            isOpen && "pointer-events-none opacity-0 scale-95"
          )}
          aria-label="Ask Operion AI"
          aria-expanded={isOpen}
        >
          <Sparkles className="h-4 w-4" />
          <span className="pointer-events-none absolute right-[calc(100%+10px)] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/[0.08] bg-[#151518]/95 px-2.5 py-1.5 text-[12px] text-foreground/90 opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
            Ask Operion AI
          </span>
        </button>
      </div>
    </AIPanelContext.Provider>
  )
}
