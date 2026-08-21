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
