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
  /** Id of the persisted conversation when the ask was persisted (workspace). */
  conversationId?: string | null
}

/** A persisted conversation as listed in the workspace sidebar. */
export interface AiConversationSummary {
  id: string
  title: string
  messageCount: number
  createdAt: string
  updatedAt: string
}

/** A persisted conversation with its full message transcript. */
export interface AiConversationDetail {
  id: string
  title: string
  messages: AiChatMessage[]
  createdAt: string
  updatedAt: string
}

/** A persisted chat entry (reopened conversation or live chat). */
export interface AiChatMessage {
  role: "user" | "assistant"
  content?: string
  card?: AiAnswerCard | null
}

/** A saved/pinned insight shown in the workspace. */
export interface AiInsightSummary {
  id: string
  title: string | null
  question: string
  answer: string
  sources: AiSource[]
  createdAt: string
}
