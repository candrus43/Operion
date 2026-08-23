"use client"

import { createContext, useCallback, useContext, useState } from "react"
import { Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { AiConversation } from "./ai-conversation"

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

/**
 * Global floating AI assistant for the dashboard.
 *
 * Renders a persistent, unobtrusive trigger button (bottom-right) on every
 * dashboard page and a slide-out chat panel. The panel embeds the same
 * `AiConversation` used by the full AI workspace, and because it lives inside
 * the persistent dashboard shell, chat state survives client-side navigation
 * between dashboard pages.
 */
export function AIPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const openPanel = useCallback(() => setIsOpen(true), [])
  const closePanel = useCallback(() => setIsOpen(false), [])
  const togglePanel = useCallback(() => setIsOpen((prev) => !prev), [])

  return (
    <AIPanelContext.Provider value={{ isOpen, openPanel, closePanel, togglePanel }}>
      {children}

      {/* Backdrop overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[45] bg-black/50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={closePanel}
        aria-hidden="true"
      />

      {/* Slide-out panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-[50] flex h-full flex-col bg-[#0b0b0d] shadow-2xl transition-transform duration-300 ease-in-out",
          "w-full sm:w-[420px] sm:max-w-full border-l border-white/[0.06]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-label="Operion AI Assistant"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
              <Sparkles className="h-[18px] w-[18px] text-violet-400" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">Operion AI</h2>
              <p className="text-[11px] text-muted-foreground/70">
                Full context of your portfolio
              </p>
            </div>
          </div>
          <button
            onClick={closePanel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[#1a1a1a] hover:text-white"
            aria-label="Close AI assistant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conversation */}
        <div className="min-h-0 flex-1 flex flex-col px-5 py-4">
          <AiConversation
            compact
            hideContextChip
            openInWorkspaceHref="/ai"
            placeholder="Ask anything across your portfolio…"
          />
        </div>
      </div>

      {/* Floating trigger button */}
      <button
        onClick={togglePanel}
        className={cn(
          "fixed bottom-5 right-5 z-[60] flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:bg-violet-400 hover:scale-105 active:scale-95",
          isOpen && "pointer-events-none opacity-0"
        )}
        aria-label="Open AI assistant"
        aria-expanded={isOpen}
      >
        <Sparkles className="h-5 w-5" />
      </button>
    </AIPanelContext.Provider>
  )
}
