// ─────────────────────────────────────────────────────────────────────────────
// Deterministic document-metadata answerer (Executive Intelligence — Phase 4c).
//
// Operion documents are, in practice, METADATA records: name, type, entity,
// project, optional expiry/attention/notes — and, when the owner or a TXT
// upload provides it, a `content` body. This module answers the prompts that
// are answerable from that real metadata with ZERO LLM inference, so things
// like "which contracts renew in 90 days?" or "is this insurance expired?"
// return grounded, citation-linked results computed from the org-scoped rows in
// the AI pool.
//
// Honesty contract:
//   - Every answer is derived only from the pool rows handed in (already scoped
//     to the requesting org by loadAiPool).
//   - When only metadata is available we SAY so in caveats and never invent
//     clause/content details.
//   - Prompts that genuinely need full-text reasoning (e.g. "summarize this
//     purchase agreement") return null when content IS present so the LLM path
//     can use it; when content is absent they return an honest "no full text
//     stored" answer instead of fabricating a summary.
// ─────────────────────────────────────────────────────────────────────────────

import type { AiAnswerCard, AiContextRef, AiSource } from "./types"
import { sourceUrl } from "./records"
import type { AiPool } from "./records"

const DAY = 86_400_000
function daysUntil(d: Date): number { return Math.floor((d.getTime() - Date.now()) / DAY) }
function fmt(d: Date): string { return d.toISOString().slice(0, 10) }

type Doc = AiPool["documents"][number]

// ── Small helpers ────────────────────────────────────────────────────────────
function docSource(d: Doc): AiSource {
  return { type: "document", id: d.id, title: d.name, url: sourceUrl("document", d.id) }
}
function entitySource(id: string, name: string | null): AiSource {
  return { type: "entity", id, title: name || "Entity", url: sourceUrl("entity", id) }
}
function typeLabel(t: string): string { return t.replace(/_/g, " ") }
function localDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/** Detect a requested document type from the question (or null). */
function detectType(q: string): string | null {
  const low = q.toLowerCase()
  if (/purchase agreement/.test(low)) return "PURCHASE_AGREEMENT"
  if (/contract/.test(low)) return "CONTRACT"
  if (/lease/.test(low)) return "LEASE"
  if (/insurance/.test(low)) return "INSURANCE"
  if (/licens/.test(low)) return "LICENSE"
  if (/financial statement/.test(low)) return "FINANCIAL_STATEMENT"
  if (/tax/.test(low)) return "TAX"
  return null
}

/** Extract an expiry window in days (default 90) from "within N days" phrasing. */
function detectWindowDays(q: string): number {
  const low = q.toLowerCase()
  if (/this\s+month/.test(low)) return 30
  if (/this\s+quarter/.test(low) || /this\s+year/.test(low)) return 90
  const m = q.match(/within\s+(\d+)\s+days|next\s+(\d+)\s+days|\b(\d+)\s+days?\b/)
  if (m) {
    const n = parseInt(m[1] || m[2] || m[3] || "", 10)
    if (!Number.isNaN(n) && n > 0) return n
  }
  return 90
}

function expiryStatus(d: Doc): string | null {
  if (!d.expiryDate) return null
  const n = daysUntil(d.expiryDate)
  if (n < 0) return `expired on ${localDate(d.expiryDate)}`
  if (n <= 30) return `expiring soon — ${localDate(d.expiryDate)}, in ${n} day${n === 1 ? "" : "s"}`
  return `valid until ${localDate(d.expiryDate)}, in ${n} day${n === 1 ? "" : "s"}`
}

/** Human summary of a single document; null doc → null. */
function describeDoc(d: Doc): string {
  const lines = [
    `"${d.name}" — ${typeLabel(d.type)}${d.entity?.name ? ` (entity: ${d.entity.name})` : ""}${d.project?.name ? ` (project: ${d.project.name})` : ""}`,
  ]
  const es = expiryStatus(d)
  if (es) lines.push(`   Expiry: ${es}`)
  if (d.attention) lines.push(`   Attention: ${d.attention}`)
  if (d.notes) lines.push(`   Notes: ${d.notes}`)
  if (d.content) lines.push(`   Full text stored (${d.content.length} chars) — I can summarize it.`)
  else lines.push(`   Metadata only — no full document text stored for this document.`)
  return lines.join("\n")
}

// ── Single-document answers (context = this document) ──────────────────────
function singleDocumentAnswer(doc: Doc, q: string): { card: AiAnswerCard; source: AiSource } | null {
  const low = q.toLowerCase()
  const source = docSource(doc)
  const isSummarize = /summar|abstract|read this|what's? in this|content|full text|analyze/.test(low)
  const isExpiryQ = /expir|renew|expires?|past.due|due|valid|expired|watch/.test(low)
  const isWhatIs = /what is|describe|tell me about|about this|overview|info about|key facts/.test(low)

  // Summarize requests: use the LLM when full text exists; otherwise honest.
  if (isSummarize) {
    if (doc.content) return null // let the LLM summarize from the pooled content
    const who = doc.entity?.name ? ` for ${doc.entity.name}` : ""
    const meta: string[] = [`Type: ${typeLabel(doc.type)}${doc.entity?.name ? ` · Entity: ${doc.entity.name}` : ""}${doc.project?.name ? ` · Project: ${doc.project.name}` : ""}`]
    if (doc.expiryDate) meta.push(`Expiry: ${localDate(doc.expiryDate)} (${daysUntil(doc.expiryDate)} days${daysUntil(doc.expiryDate) < 0 ? " — past due" : ""})`)
    if (doc.attention) meta.push(`Attention: ${doc.attention}`)
    if (doc.notes) meta.push(`Notes: ${doc.notes}`)
    return {
      card: {
        answer:
          `I can't summarize the contents of "${doc.name}"${who} because no full document text is stored — only its metadata.\n\n` +
          `Here's what we know about it:\n- ${meta.join("\n- ")}`,
        sources: [source],
        caveats: [
          "No full-text content is stored for this document (only metadata), so I can't read, quote, or summarize its clauses. Add the document text (e.g. paste it in the edit form) to enable content Q&A.",
        ],
      },
      source,
    }
  }

  // Expiry / renewal facts about this document.
  if (isExpiryQ) {
    if (!doc.expiryDate) {
      return {
        card: {
          answer: `No expiry date is set for "${doc.name}".`,
          sources: [source],
          caveats: ["No expiry date was recorded for this document, so I can't compute expiry status. Set one while editing the document to get renewal tracking."],
        },
        source,
      }
    }
    const es = expiryStatus(doc)!
    const n = daysUntil(doc.expiryDate)
    const extra: string[] = []
    if (doc.attention) extra.push(`It also carries an attention flag: ${doc.attention}.`)
    if (n <= 30) extra.push("This will surface as needing attention in your briefings.")
    return {
      card: {
        answer: `"${doc.name}" is ${es}.${extra.length ? " " + extra.join(" ") : ""}`,
        sources: [source],
        caveats: ["Answered from document metadata (the recorded expiry date); I did not read the document's contents."],
      },
      source,
    }
  }

  // Summarize requests: use the LLM when full text exists; otherwise honest.
  if (isSummarize) {
    if (doc.content) return null // let the LLM summarize from the pooled content
    const who = doc.entity?.name ? ` for ${doc.entity.name}` : ""
    const meta: string[] = [`Type: ${typeLabel(doc.type)}${doc.entity?.name ? ` · Entity: ${doc.entity.name}` : ""}${doc.project?.name ? ` · Project: ${doc.project.name}` : ""}`]
    if (doc.expiryDate) meta.push(`Expiry: ${localDate(doc.expiryDate)} (${daysUntil(doc.expiryDate)} days${daysUntil(doc.expiryDate) < 0 ? " — past due" : ""})`)
    if (doc.attention) meta.push(`Attention: ${doc.attention}`)
    if (doc.notes) meta.push(`Notes: ${doc.notes}`)
    return {
      card: {
        answer:
          `I can't summarize the contents of "${doc.name}"${who} because no full document text is stored — only its metadata.\n\n` +
          `Here's what we know about it:\n- ${meta.join("\n- ")}`,
        sources: [source],
        caveats: [
          "No full-text content is stored for this document (only metadata), so I can't read, quote, or summarize its clauses. Add the document text (e.g. paste it in the edit form) to enable content Q&A.",
        ],
      },
      source,
    }
  }

  // General "what is this" / key facts.
  if (isWhatIs) {
    return {
      card: {
        answer: describeDoc(doc),
        sources: [source],
        caveats: doc.content ? [] : ["Metadata only — no full document text stored, so I can't read inside the document."],
      },
      source,
    }
  }

  return null
}

// ── Org-wide answers (no surrounding document) ──────────────────────────────
function orgWideAnswer(pool: AiPool, q: string): { card: AiAnswerCard; sources: AiSource[] } | null {
  const low = q.toLowerCase()

  // "which/none of the <type> docs are expiring within N days / this quarter"
  // Also handles "which contracts renew this quarter" (renew ~ expiry window).
  const wantsExpiryWindow = /expir|renew|expires|past.due|due|expired/.test(low) &&
    /within|day|days|soon|this|next|quarter|month/.test(low)
  if (wantsExpiryWindow) {
    const type = detectType(low)
    const window = detectWindowDays(low)
    const matched = pool.documents.filter(d => {
      if (!d.expiryDate) return false
      if (type && d.type !== type) return false
      const n = daysUntil(d.expiryDate)
      return n >= 0 && n <= window
    })
    const expired = pool.documents.filter(d => {
      if (!d.expiryDate) return false
      if (type && d.type !== type) return false
      return daysUntil(d.expiryDate) < 0
    })
    if (matched.length === 0 && expired.length === 0) {
      return {
        card: {
          answer: `No ${type ? typeLabel(type) + " " : ""}documents expire within the next ${window} days.`,
          sources: [],
          caveats: ["Answered from document expiry metadata only — I did not read document contents."],
        },
        sources: [],
      }
    }
    const lines: string[] = []
    if (matched.length) {
      lines.push(`Here are the documents expiring within ${window} days:`)
      matched.forEach(d => lines.push(`- ${describeDoc(d)}`))
    }
    if (expired.length) {
      lines.push(`Already expired:`)
      expired.forEach(d => lines.push(`- ${describeDoc(d)}`))
    }
    lines.push(`\n${matched.length} expiring within ${window} days${expired.length ? `, ${expired.length} already expired` : ""}.`)
    return {
      card: {
        answer: lines.join("\n"),
        sources: [...matched, ...expired].map(docSource).slice(0, 12),
        caveats: ["Answered from document expiry metadata only — I did not read document contents."],
      },
      sources: [...matched, ...expired].map(docSource).slice(0, 12),
    }
  }

  // "which entities are missing required documents / have no documents"
  if (/missing.*document|document.*missing|no document|required document/.test(low)) {
    const withDocs = new Set(pool.documents.map(d => d.entity?.id).filter(Boolean) as string[])
    const missing = pool.entities.filter(e => !withDocs.has(e.id))
    if (missing.length === 0) {
      return {
        card: {
          answer: `Every entity in ${pool.orgName} currently has at least one document on file.`,
          sources: [],
          caveats: ["No required-document checklist is defined by entity type, so this only flags entities with zero documents on file — it can't tell you which specific documents are missing."],
        },
        sources: [],
      }
    }
    return {
      card: {
        answer: `These entities have no documents on file: ${missing.map(e => e.name).join(", ")}.`,
        sources: missing.map(e => entitySource(e.id, e.name)),
        caveats: ["No required-document checklist is defined by entity type, so this only flags entities with zero documents on file — it can't tell you which specific documents are missing."],
      },
      sources: missing.map(e => entitySource(e.id, e.name)),
    }
  }

  // "list/show all <type> documents" (plain type index, no expiry)
  const type = detectType(low)
  if (type && /list|show|which|all|what|have/i.test(low)) {
    const matched = pool.documents.filter(d => d.type === type)
    if (matched.length === 0) {
      return {
        card: {
          answer: `No ${typeLabel(type)} documents are on file.`,
          sources: [],
          caveats: [],
        },
        sources: [],
      }
    }
    return {
      card: {
        answer: `Here are the ${typeLabel(type)} documents on file:\n${matched.map(d => `- ${describeDoc(d)}`).join("\n")}`,
        sources: matched.map(docSource).slice(0, 12),
        caveats: matched.some(d => !d.content) ? ["Metadata only for most of these — full document text isn't stored."] : [],
      },
      sources: matched.map(docSource).slice(0, 12),
    }
  }

  return null
}

/**
 * Try to answer a document/metadata prompt deterministically from the pool.
 * Returns the fully-built card (with deep-link sources) + resolved context, or
 * null when the prompt should fall through to the LLM path.
 */
export function tryDocumentMetadataAnswer(
  pool: AiPool,
  question: string,
  context: AiContextRef | null,
): { card: AiAnswerCard; context: { type: "document"; id: string; title: string } | null } | null {
  const isDocumentContext = context?.type === "document"

  if (isDocumentContext) {
    const doc = pool.documents.find(d => d.id === context!.id)
    if (!doc) return null // foreign / unknown — don't answer
    // A document-scoped summary request WITH content must go to the LLM.
    const single = singleDocumentAnswer(doc, question)
    if (!single) return null
    if (question.toLowerCase().includes("summar") && doc.content) return null
    return { card: single.card, context: { type: "document", id: doc.id, title: doc.name } }
  }

  const org = orgWideAnswer(pool, question)
  if (!org) return null
  return { card: org.card, context: null }
}
