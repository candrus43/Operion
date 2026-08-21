"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Sparkles } from "lucide-react"
import { AiConversation } from "@/components/ai/ai-conversation"
import type { AiResolvedContext } from "@/lib/ai/types"

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

function AIWorkspaceShell({ context }: { context: AiResolvedContext | null }) {
  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 ring-1 ring-violet-500/20">
          <Sparkles className="h-[18px] w-[18px] text-violet-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Executive AI Workspace</h1>
          <p className="text-xs text-muted-foreground/70">
            Ask across your entire portfolio, or dive into any record with full context.
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <AiConversation initialContext={context} />
      </div>
    </div>
  )
}
