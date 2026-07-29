"use client"

import { createContext, useContext, useState, useCallback } from "react"
import { Sparkles } from "lucide-react"
import { ChatPanel } from "@/components/ai/chat-panel"
import { cn } from "@/lib/utils"

interface AIPanelContextType {
  isOpen: boolean
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
}

const AIPanelContext = createContext<AIPanelContextType | null>(null)

export function useAIPanel() {
  const ctx = useContext(AIPanelContext)
  if (!ctx) {
    throw new Error("useAIPanel must be used within an AIPanelProvider")
  }
  return ctx
}

export function AIPanelProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  const openPanel = useCallback(() => setIsOpen(true), [])
  const closePanel = useCallback(() => setIsOpen(false), [])
  const togglePanel = useCallback(() => setIsOpen((prev) => !prev), [])

  return (
    <AIPanelContext.Provider value={{ isOpen, openPanel, closePanel, togglePanel }}>
      {children}

      {/* Floating trigger button */}
      <button
        onClick={togglePanel}
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-2xl bg-violet-500 hover:bg-violet-600 text-white shadow-lg shadow-violet-500/20 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="Open AI Assistant"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      {/* Backdrop overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-30 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closePanel}
      />

      {/* Slide-out panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-40 bg-[#0d0d0d] border-l border-white/[0.06] shadow-2xl transition-transform duration-300 ease-in-out",
          "w-full sm:w-[400px] sm:max-w-full",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <ChatPanel isOpen={isOpen} onClose={closePanel} />
      </div>
    </AIPanelContext.Provider>
  )
}
