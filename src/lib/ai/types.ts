// ─────────────────────────────────────────────────────────────────────────────
// Shared AI answer-card types (Executive Intelligence Refresh — Phase 2).
//
// The AI chat + workspace + contextual panel all return a single structured
// shape described by `AiAnswerCard`. Sources are ALWAYS deep-links into the
// app (resolved server-side from real org-scoped records — never an
// LLM-invented id). See ./records.ts for the server-side resolution.
// ─────────────────────────────────────────────────────────────────────────────

export type AiSourceType = "entity" | "project" | "task" | "contact" | "document" | "meeting"

/** A deep-linkable source record the answer drew on. */
export interface AiSource {
  type: AiSourceType
  id: string
  title: string
  /** Internal app deep-link (e.g. /tasks/:id). Meetings link to /calendar. */
  url: string
}

/** The structured AI answer: direct answer + sources + caveats/unknowns. */
export interface AiAnswerCard {
  answer: string
  sources: AiSource[]
  caveats: string[]
}

/** A contextual record reference passed from a detail page / URL. */
export interface AiContextRef {
  type: AiSourceType
  id: string
}

/** Resolved context (with the human-readable title) returned to the client. */
export interface AiResolvedContext {
  type: AiSourceType
  id: string
  title: string
}

/** The raw (pre-resolution) source the LLM emits in its JSON. */
export interface AiDeclaredSource {
  type: AiSourceType
  title: string
}

export interface AiMessage {
  role: "user" | "assistant"
  content: string
}

/** Response body of /api/ai/ask (used by the AI workspace + contextual panel). */
export interface AskAiResponse {
  card: AiAnswerCard
  context: AiResolvedContext | null
  suggestions: string[]
}
