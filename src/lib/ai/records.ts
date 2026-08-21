// ─────────────────────────────────────────────────────────────────────────────
// Server-side, org-scoped record pools + deterministic source resolution
// (Executive Intelligence Refresh — Phase 2).
//
// The LLM name-drops records as DISPLAY STRINGS only. This module resolves
// those strings back to REAL records belonging to the requesting organization
// (deterministic title-matching, same conservative pattern as the dashboard
// briefing in Phase 1a) and attaches the real id + deep-link url. We never
// trust an LLM-invented id — resolution always goes through the org-scoped
// pools built here.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/db"
import type { AiDeclaredSource, AiSource, AiSourceType } from "./types"

// ── Pool shapes ─────────────────────────────────────────────────────────────
export interface AiPool {
  orgName: string
  entities: { id: string; name: string; type: string }[]
  projects: { id: string; name: string; status: string; phase: string; progress: number; targetDate: Date | null; description: string | null; entity: { name: string | null } | null }[]
  tasks: { id: string; title: string; status: string; priority: string; dueDate: Date | null; description: string | null; notes: string | null; assignee: { name: string | null } | null; entity: { name: string | null } | null; project: { name: string | null } | null }[]
  contacts: { id: string; name: string; company: string | null; position: string | null; entity: { name: string | null } | null }[]
  documents: { id: string; name: string; type: string; notes: string | null; entity: { name: string | null } | null; project: { name: string | null } | null }[]
  meetings: { id: string; title: string; date: Date; project: { name: string | null } | null }[]
}

/** Load every org-scoped record once, reused for source resolution + prompt. */
export async function loadAiPool(orgId: string): Promise<AiPool> {
  const [org, entities, projects, tasks, contacts, documents, meetings] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
    prisma.entity.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, name: true, status: true, phase: true, progress: true,
        targetDate: true, description: true,
        entity: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.task.findMany({
      where: { organizationId: orgId },
      select: {
        id: true, title: true, status: true, priority: true, dueDate: true,
        description: true, notes: true,
        assignee: { select: { name: true } },
        entity: { select: { name: true } },
        project: { select: { name: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),
    prisma.contact.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, company: true, position: true, entity: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.document.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, type: true, notes: true, entity: { select: { name: true } }, project: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.meeting.findMany({
      where: { organizationId: orgId },
      select: { id: true, title: true, date: true, project: { select: { name: true } } },
      orderBy: { date: "asc" },
    }),
  ])
  return { orgName: org?.name || "Your organization", entities, projects, tasks, contacts, documents, meetings }
}

// ── Title matching (conservative; only confident matches deep-link) ─────────
const TASK_PRIORITY_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

function norm(s?: string | null): string {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim()
}

function matchScore(needle: string, title: string): number {
  const n = norm(needle), t = norm(title)
  if (!n || !t) return -1
  if (n === t) return 3
  if (t.length >= 4 && n.includes(t)) return 2
  if (n.length >= 5 && t.includes(n)) return 1
  return -1
}

function bestNameMatch(needle: string, records: { id: string; name: string }[]): { id: string; name: string } | null {
  let best: { rec: { id: string; name: string }; score: number } | null = null
  for (const rec of records) {
    const s = matchScore(needle, rec.name)
    if (s >= 1 && (!best || s > best.score)) best = { rec, score: s }
  }
  return best?.rec ?? null
}

function bestTaskMatch(needle: string, tasks: AiPool["tasks"]): AiPool["tasks"][number] | null {
  let best: { task: AiPool["tasks"][number]; score: number } | null = null
  for (const task of tasks) {
    const s = matchScore(needle, task.title)
    if (s < 1) continue
    const total = s + ((TASK_PRIORITY_RANK[task.priority] ?? 0) - 2.5) * 0.01 + (task.status === "DONE" ? -0.05 : 0)
    if (!best || total > best.score) best = { task, score: total }
  }
  return best?.task ?? null
}

// ── Deep-link builders ──────────────────────────────────────────────────────
export function sourceUrl(type: AiSourceType, id: string): string {
  switch (type) {
    case "task": return `/tasks/${id}`
    case "project": return `/projects/${id}`
    case "entity": return `/entities/${id}`
    case "contact": return `/contacts/${id}`
    case "document": return `/documents/${id}`
    case "meeting": return "/calendar" // no /meetings/[id] detail page yet
  }
}

// ── Resolution ──────────────────────────────────────────────────────────────
/** Resolve a single declared {type,title} to a real org record, or null. */
function resolveOne(type: AiSourceType, title: string, pools: AiPool): AiSource | null {
  switch (type) {
    case "entity": {
      const r = bestNameMatch(title, pools.entities)
      return r ? { type, id: r.id, title: r.name, url: sourceUrl(type, r.id) } : null
    }
    case "project": {
      const r = bestNameMatch(title, pools.projects)
      return r ? { type, id: r.id, title: r.name, url: sourceUrl(type, r.id) } : null
    }
    case "task": {
      const t = bestTaskMatch(title, pools.tasks)
      return t ? { type, id: t.id, title: t.title, url: sourceUrl(type, t.id) } : null
    }
    case "contact": {
      const r = bestNameMatch(title, pools.contacts)
      return r ? { type, id: r.id, title: r.name, url: sourceUrl(type, r.id) } : null
    }
    case "document": {
      const r = bestNameMatch(title, pools.documents)
      return r ? { type, id: r.id, title: r.name, url: sourceUrl(type, r.id) } : null
    }
    case "meeting": {
      const r = bestNameMatch(title, pools.meetings.map(m => ({ id: m.id, name: m.title })))
      if (!r) return null
      const meeting = pools.meetings.find(m => m.id === r.id)
      return meeting ? { type, id: meeting.id, title: meeting.title, url: sourceUrl(type, meeting.id) } : null
    }
  }
}

/** Scan the answer prose for any record titles that appear verbatim. */
function scanMentions(answerText: string, pools: AiPool): AiDeclaredSource[] {
  const out: AiDeclaredSource[] = []
  const needle = norm(answerText)
  const pushIfMentioned = (type: AiSourceType, title: string) => {
    const n = norm(title)
    if (n.length >= 4 && needle.includes(n)) out.push({ type, title })
  }
  pools.entities.forEach(e => pushIfMentioned("entity", e.name))
  pools.projects.forEach(p => pushIfMentioned("project", p.name))
  pools.tasks.forEach(t => pushIfMentioned("task", t.title))
  pools.contacts.forEach(c => pushIfMentioned("contact", c.name))
  pools.documents.forEach(d => pushIfMentioned("document", d.name))
  pools.meetings.forEach(m => pushIfMentioned("meeting", m.title))
  return out
}

/**
 * Resolve declared sources AND mentions found in the answer prose back to real
 * org records. Order: declared first (LLM intent), then prose mentions. Only
 * confident matches survive; everything else is dropped (never faked).
 */
export function resolveSources(
  declared: AiDeclaredSource[],
  answerText: string,
  pools: AiPool,
  maxSources = 8,
): AiSource[] {
  const resolved: AiSource[] = []
  const seen = new Set<string>()
  const add = (s: AiSource | null) => {
    if (!s) return
    const key = `${s.type}:${s.id}`
    if (seen.has(key)) return
    seen.add(key)
    resolved.push(s)
  }
  for (const d of declared) add(resolveOne(d.type, d.title, pools))
  for (const m of scanMentions(answerText, pools)) add(resolveOne(m.type, m.title, pools))
  return resolved.slice(0, maxSources)
}

/** Resolve a {type,id} context ref against the org pool (or null if invalid/foreign). */
export function resolveContextRef(ref: { type: AiSourceType; id: string }, pools: AiPool): { type: AiSourceType; id: string; title: string } | null {
  const poolKey: Record<AiSourceType, keyof AiPool> = {
    entity: "entities",
    project: "projects",
    task: "tasks",
    contact: "contacts",
    document: "documents",
    meeting: "meetings",
  }
  const found = (pools[poolKey[ref.type]] as { id: string }[]).find((r) => r.id === ref.id)
  if (!found) return null
  const title = (found as { name?: string; title?: string }).name ?? (found as { title?: string }).title ?? "Record"
  return { type: ref.type, id: ref.id, title }
}
