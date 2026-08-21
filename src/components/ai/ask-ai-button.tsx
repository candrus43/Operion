"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Sparkles } from "lucide-react"
import { AiConversation } from "./ai-conversation"
import type { AiSourceType } from "@/lib/ai/types"

interface AskAiButtonProps {
  type: AiSourceType
  id: string
  title: string
  /** Optional label override (e.g. "Ask AI"). Defaults to "Ask AI". */
  label?: string
  variant?: "outline" | "ghost" | "secondary"
  size?: "sm" | "default" | "icon"
}

/**
 * Contextual AI affordance for detail pages. Opens a slide-out panel pre-seeded
 * with the record's context so the AI answers with that record in mind. The
 * panel surfaces context-driven suggestions and deep-links back to the record.
 */
export function AskAiButton({
  type,
  id,
  title,
  label = "Ask AI",
  variant = "outline",
  size = "sm",
}: AskAiButtonProps) {
  const [open, setOpen] = useState(false)

  const workspaceHref = `/ai?context=${encodeURIComponent(type)}:${encodeURIComponent(id)}`

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-4">
        <SheetHeader className="pr-8">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Ask Operion AI
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0 flex flex-col">
          <AiConversation
            initialContext={{ type, id, title }}
            openInWorkspaceHref={workspaceHref}
            placeholder={`Ask about “${title}”…`}
            compact
          />
        </div>
      </SheetContent>

      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className="gap-1.5"
        aria-label={`Ask AI about ${title}`}
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        {label}
      </Button>
    </Sheet>
  )
}
