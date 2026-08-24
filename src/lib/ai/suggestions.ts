// ─────────────────────────────────────────────────────────────────────────────
// Context-driven AI suggestions (Executive Intelligence Refresh — Phase 2).
//
// Deterministic, record-type-aware questions surfaced in the AI workspace and
// the contextual panel. They answer "what is this owner most likely to want to
// know next, given this record?" — distinct from the generic global prompts on
// the empty workspace.
// ─────────────────────────────────────────────────────────────────────────────

import type { AiSourceType } from "./types"

/** Suggestions shown when there is no active context (global orientation). */
export const GLOBAL_SUGGESTIONS: string[] = [
  "What needs my attention today?",
  "Which projects are behind schedule?",
  "What am I waiting on?",
  "Summarize the current week's risks.",
]

// ─────────────────────────────────────────────────────────────────────────────
// Quick-panel page-kind metadata (Executive AI Panel — Phase 3).
//
// The floating quick panel is page-aware: it detects which section of the app
// the owner is in and surfaces a short contextual greeting, a focused set of
// suggested questions, and a contextual composer placeholder. Record detail
// pages instead scope the assistant to the specific record (handled separately
// through the `?type&id` context path — see /api/ai/suggestions).
// ─────────────────────────────────────────────────────────────────────────────
export type PanelPageKind =
  | "projects"
  | "tasks"
  | "entities"
  | "documents"
  | "contacts"
  | "meetings"
  | "global"

export interface PanelPageMeta {
  /** Label shown in the panel header ("Viewing: Projects"). */
  label: string
  /** Short contextual greeting for the compact empty state. */
  greeting: string
  /** Composer placeholder when scoped to this section. */
  placeholder: string
  /** Contextual suggested questions for this section. */
  suggestions: string[]
}

export const PANEL_PAGE_META: Record<PanelPageKind, PanelPageMeta> = {
  projects: {
    label: "Projects",
    greeting: "Here’s how I can help with your projects.",
    placeholder: "Ask about these projects…",
    suggestions: [
      "Which projects need attention?",
      "Show projects at risk.",
      "What has changed this week?",
      "Which projects have no recent activity?",
    ],
  },
  tasks: {
    label: "Tasks",
    greeting: "Here’s how I can help with your tasks.",
    placeholder: "Ask about these tasks…",
    suggestions: [
      "What should I work on first?",
      "Which tasks are blocked?",
      "What is overdue?",
      "What is waiting on someone else?",
    ],
  },
  entities: {
    label: "Entities",
    greeting: "Here’s how I can help with your entities.",
    placeholder: "Ask about these entities…",
    suggestions: [
      "Which entity needs attention?",
      "Compare activity across entities.",
      "Where are the most open risks?",
      "Summarize this portfolio.",
    ],
  },
  documents: {
    label: "Documents",
    greeting: "Here’s how I can help with your documents.",
    placeholder: "Ask about these documents…",
    suggestions: [
      "Find an agreement.",
      "Summarize recent documents.",
      "Which documents are connected to active risks?",
      "Find documents related to this entity.",
    ],
  },
  contacts: {
    label: "Contacts",
    greeting: "Here’s how I can help with your contacts.",
    placeholder: "Ask about these contacts…",
    suggestions: [
      "Who is connected to this project?",
      "Who are we waiting on?",
      "Show contacts involved in active risks.",
      "Summarize recent activity involving this contact.",
    ],
  },
  meetings: {
    label: "Meetings",
    greeting: "Here’s how I can help with your meetings.",
    placeholder: "Ask about these meetings…",
    suggestions: [
      "What was covered in my recent meetings?",
      "Which meetings have open action items?",
      "What decisions were made this week?",
      "Summarize notes from my last meetings.",
    ],
  },
  global: {
    label: "Your portfolio",
    greeting: "Here’s what I can help with across Operion.",
    placeholder: "Ask anything across your portfolio…",
    suggestions: GLOBAL_SUGGESTIONS,
  },
}

/** Resolve a quick-panel page kind by top-level dashboard path (client-safe). */
export function panelPageKindFromPath(pathname: string): PanelPageKind {
  const seg = (pathname.split("/").filter(Boolean)[0] ?? "").toLowerCase()
  switch (seg) {
    case "projects":
      return "projects"
    case "tasks":
      return "tasks"
    case "entities":
      return "entities"
    case "documents":
      return "documents"
    case "contacts":
      return "contacts"
    case "meetings":
      return "meetings"
    default:
      return "global"
  }
}

/** Build a list of context-driven questions for a specific record. */
export function getContextSuggestions(
  type: AiSourceType,
  title: string,
): string[] {
  switch (type) {
    case "entity":
      return [
        `What's the overall status of ${title}?`,
        `Which tasks are open for ${title}?`,
        `What projects are active for ${title}?`,
        `Summarize recent activity for ${title}.`,
      ]
    case "project":
      return [
        `What's the status of ${title}?`,
        `What might block ${title}?`,
        `What are the next steps for ${title}?`,
        `Summarize the open tasks in ${title}.`,
      ]
    case "task":
      return [
        `What's the next best action for "${title}"?`,
        `What could block "${title}"?`,
        `Who is best placed to pick up "${title}"?`,
        `Summarize the discussion around "${title}".`,
      ]
    case "contact":
      return [
        `What do we know about ${title}?`,
        `Which tasks or projects involve ${title}?`,
        `Summarize our relationship with ${title}.`,
      ]
    case "document":
      return [
        `Summarize "${title}".`,
        `What are the key takeaways from "${title}"?`,
        `What obligations or deadlines does "${title}" create?`,
      ]
    case "meeting":
      return [
        `What was covered in "${title}"?`,
        `What action items came out of "${title}"?`,
        `What decisions were made in "${title}"?`,
      ]
  }
}
