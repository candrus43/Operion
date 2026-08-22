// ─────────────────────────────────────────────────────────────────────────────
// Core structured-answer engine (Executive Intelligence Refresh — Phase 2).
//
// Shared by /api/ai/ask (AI workspace + contextual panel) and /api/ai/chat.
// Builds an org-scoped context prompt, calls GPT with a strict JSON schema for
// { answer, sources, caveats }, then resolves the sources server-side.
// Never trusts an LLM-invented id — see ./records.ts.
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from "openai"
import { loadAiPool, resolveContextRef, resolveSources } from "./records"
import type { AiAnswerCard, AiContextRef, AiMessage, AiSourceType } from "./types"
import { tryDocumentMetadataAnswer } from "./document-answers"

const MODEL = "gpt-4o-mini"
const MAX_TOKENS = 1000
const DAY = 86_400_000
/** Whole days from now until `d` (positive = future, negative = past). */
function daysUntil(d: Date | null): number | null {
  return d ? Math.floor((d.getTime() - Date.now()) / DAY) : null
}

/** LLM-internal source declaration (raw, pre-resolution). */
interface LlmSource { type: AiSourceType; title: string }
interface LlmAnswer { answer: string; sources: LlmSource[]; caveats: string[] }

const llmSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["entity", "project", "task", "contact", "document", "meeting"] },
          title: { type: "string" },
        },
        required: ["type", "title"],
      },
    },
    caveats: { type: "array", items: { type: "string" } },
  },
  required: ["answer", "sources", "caveats"],
}

interface EngineParams {
  orgId: string
  question: string
  context?: AiContextRef | null
  history?: AiMessage[]
}

/** Build a compact org summary injected into the system prompt. */
function orgSummary(orgId: string, pool: Awaited<ReturnType<typeof loadAiPool>>): string {
  const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)
  const lines: string[] = []

  if (pool.entities.length) {
    lines.push("ENTITIES:")
    pool.entities.slice(0, 60).forEach(e => lines.push(`- ${e.name} (${e.type.replace(/_/g, " ")})`))
  }
  if (pool.projects.length) {
    lines.push("PROJECTS (status · progress · target):")
    pool.projects.slice(0, 40).forEach(p =>
      lines.push(`- ${p.name} [status=${p.status}, phase=${p.phase.replace(/_/g, " ")}, progress=${p.progress}%, target=${fmt(p.targetDate) ?? "n/a"}]${p.entity?.name ? ` · entity: ${p.entity.name}` : ""}`))
  }
  if (pool.tasks.length) {
    lines.push("TASKS (status · priority · due):")
    pool.tasks.slice(0, 50).forEach(t =>
      lines.push(`- ${t.title} [status=${t.status}, priority=${t.priority}, due=${fmt(t.dueDate) ?? "n/a"}, assignee=${t.assignee?.name ?? "unassigned"}]${t.project?.name ? ` · project: ${t.project.name}` : ""}${t.entity?.name ? ` · entity: ${t.entity.name}` : ""}`))
  }
  if (pool.contacts.length) {
    lines.push("CONTACTS:")
    pool.contacts.slice(0, 60).forEach(c => lines.push(`- ${c.name}${c.company ? ` (${c.company})` : ""}${c.position ? ` · ${c.position}` : ""}`))
  }
  if (pool.documents.length) {
    lines.push("DOCUMENTS (expiry · attention · full-text-available):")
    pool.documents.slice(0, 80).forEach(d => {
      const exp = d.expiryDate ? `${fmt(d.expiryDate)} (${daysUntil(d.expiryDate)} days)` : "no expiry"
      const att = d.attention ? ` · attention=${d.attention}` : ""
      const ctn = d.content ? ` · full-text stored (${d.content.length} chars)` : ` · metadata only (no full text)`
      lines.push(`- ${d.name} (${d.type.replace(/_/g, " ")}) [expiry=${exp}${att}${ctn}]${d.entity?.name ? ` · entity: ${d.entity.name}` : ""}${d.project?.name ? ` · project: ${d.project.name}` : ""}`)
    })
  }
  if (pool.meetings.length) {
    lines.push("MEETINGS:")
    pool.meetings.slice(0, 30).forEach(m => lines.push(`- ${m.title} (${fmt(m.date)})`))
  }

  const summary = lines.length ? lines.join("\n") : "No records yet."
  return `You are Operion AI, an executive chief of staff for ${pool.orgName} (org id ${orgId}).

CURRENT ORG DATA (titles exactly match records — use them verbatim when citing sources):
${summary}

The user is asking across this organization. Answer directly and specifically, referencing real records by their EXACT titles.`
}

/** Human-readable detail for a contextual record, so the AI reasons about it. */
function contextDetail(pool: Awaited<ReturnType<typeof loadAiPool>>, type: AiSourceType, title: string): string | null {
  const fmt = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)
  switch (type) {
    case "entity": {
      const e = pool.entities.find(x => x.name === title)
      return e ? `ENTITY "${e.name}" (${e.type.replace(/_/g, " ")})` : null
    }
    case "project": {
      const p = pool.projects.find(x => x.name === title)
      if (!p) return null
      const tasks = pool.tasks.filter(t => t.project?.name === title)
      return `PROJECT "${p.name}" · status=${p.status}, phase=${p.phase.replace(/_/g, " ")}, progress=${p.progress}%, target=${fmt(p.targetDate) ?? "n/a"}\n${p.description ? `Description: ${p.description}\n` : ""}Open tasks: ${tasks.length ? tasks.map(t => `"${t.title}" (${t.status}, ${t.priority})`).join(", ") : "none"}`
    }
    case "task": {
      const t = pool.tasks.find(x => x.title === title)
      if (!t) return null
      return `TASK "${t.title}" · status=${t.status}, priority=${t.priority}, due=${fmt(t.dueDate) ?? "n/a"}, assignee=${t.assignee?.name ?? "unassigned"}${t.project?.name ? `, project=${t.project.name}` : ""}${t.entity?.name ? `, entity=${t.entity.name}` : ""}\n${t.description ? `Description: ${t.description}\n` : ""}${t.notes ? `Notes: ${t.notes}\n` : ""}`
    }
    case "contact": {
      const c = pool.contacts.find(x => x.name === title)
      return c ? `CONTACT "${c.name}"${c.company ? ` · ${c.company}` : ""}${c.position ? ` · ${c.position}` : ""}${c.entity?.name ? ` · entity ${c.entity.name}` : ""}` : null
    }
    case "document": {
      const d = pool.documents.find(x => x.name === title)
      if (!d) return null
      const lines = [`DOCUMENT "${d.name}" (${d.type.replace(/_/g, " ")})`]
      if (d.entity?.name) lines.push(`Entity: ${d.entity.name}`)
      if (d.project?.name) lines.push(`Project: ${d.project.name}`)
      if (d.expiryDate) lines.push(`Expires: ${fmt(d.expiryDate)} (${daysUntil(d.expiryDate)} days from now)`)
      if (d.attention) lines.push(`Attention flag: ${d.attention}`)
      if (d.notes) lines.push(`Notes: ${d.notes}`)
      if (d.content) lines.push(`Full text stored (${d.content.length} chars):\n${d.content.slice(0, 4000)}`)
      else lines.push("NO full text stored — only metadata (name, type, entity, project, dates) and any notes are available.")
      return lines.join("\n")
    }
    case "meeting": {
      const m = pool.meetings.find(x => x.title === title)
      return m ? `MEETING "${m.title}" (${fmt(m.date)})` : null
    }
  }
}

/**
 * Generate a structured AI answer card for an org-scoped question.
 *
 * Returns the card plus the resolved context (or null) so callers can render the
 * context chip / suggestions.
 */
export async function generateStructuredAnswer(params: EngineParams): Promise<{ card: AiAnswerCard; context: { type: AiSourceType; id: string; title: string } | null }> {
  const pool = await loadAiPool(params.orgId)

  // Resolve the context ref against real org records (foreign/unknown → null).
  let resolvedContext: { type: AiSourceType; id: string; title: string } | null = null
  let contextSnippet: string | null = null
  if (params.context) {
    resolvedContext = resolveContextRef(params.context, pool)
    if (resolvedContext) {
      contextSnippet = contextDetail(pool, resolvedContext.type, resolvedContext.title)
    }
  }

  // ── Deterministic document-metadata path (Phase 4c) ──
  // Metadata-answerable prompts (expiry/renewals, type, entity, attention,
  // missing-docs, single-document facts) are answered from REAL org-scoped rows
  // here — fast, honest, and never fabricated — before any LLM call. Prompts
  // that need full-text reasoning (e.g. "summarize the purchase agreement")
  // return null and fall through to the LLM, which now has document content in
  // its context pool when it exists.
  const metaAnswer = tryDocumentMetadataAnswer(pool, params.question, params.context ?? null)
  if (metaAnswer) {
    return {
      card: metaAnswer.card,
      context: metaAnswer.context ?? resolvedContext,
    }
  }

  const system = orgSummary(params.orgId, pool)
  const contextBlock = contextSnippet
    ? `\n\nCONTEXT (the user is asking ABOUT THIS RECORD specifically):\n${contextSnippet}`
    : ""

  const history = (params.history ?? []).slice(-8).map(m => ({ role: m.role, content: m.content }))

  const userPrompt =
    `${contextBlock}\n\nThe list of records above is authoritative. Answer: ${params.question}\n\n` +
    `Return JSON matching this shape: { "answer": "...", "sources": [{ "type": "task|project|entity|contact|document|meeting", "title": "<EXACT record title>" }], "caveats": ["..."] }. ` +
    `- "answer": the direct, specific answer (markdown OK, concise).\n` +
    `- "sources": the real records from the data above that support the answer, using EXACT titles. Only include records that actually appear in the provided data. If a claim references no record, leave sources empty.\n` +
    `- "caveats": anything unknown or that would need more research (empty array if none).`

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.3,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: "system", content: system },
      ...history,
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_schema", json_schema: { name: "structured_answer", strict: true, schema: llmSchema } },
  })

  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error("Empty AI response")
  const parsed = JSON.parse(raw) as LlmAnswer
  const sources = resolveSources(parsed.sources ?? [], parsed.answer ?? "", pool)

  return {
    card: {
      answer: (parsed.answer ?? "").trim() || "I couldn't form a clear answer from the data available.",
      sources,
      caveats: Array.isArray(parsed.caveats) ? parsed.caveats : [],
    },
    context: resolvedContext,
  }
}
