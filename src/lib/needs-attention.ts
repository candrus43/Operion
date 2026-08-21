// ─────────────────────────────────────────────────────────────────────────────
// Command-center "Needs Attention" briefings (Phase 3a + 3b — Executive
// Intelligence Refresh). Computes, for a scoped set of records, the open /
// overdue / blocked / expiring / attention items that need the owner's eye.
// Server-side only (uses Prisma). The result is a flat, render-safe list
// consumed by <NeedsAttentionCard/>.
//
// Phase 3b extends the module to cover:
//   - project-scoped briefings (collectProjectNeedsAttention)
//   - task-scoped briefings (collectTaskNeedsAttention)
//   - document-scoped briefings incl. expiry intelligence
//     (collectDocumentNeedsAttention)
//   - kind: "document" + reasons EXPIRING_SOON / EXPIRED
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/db"

export type NeedsAttentionReason =
  | "OVERDUE"
  | "BLOCKED"
  | "CRITICAL"
  | "WAITING_ON"
  | "HIGH"
  | "OPEN"
  | "EXPIRING_SOON"
  | "EXPIRED"

export interface NeedsAttentionItem {
  id: string
  kind: "task" | "project" | "document"
  title: string
  reason: NeedsAttentionReason
  status: string
  priority?: string
  dueDate?: string // ISO
  entityId: string
  entityName?: string
  url: string
}

const PRIORITY_RANK: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }

export function needsAttentionReason(task: {
  status: string
  priority?: string | null
  dueDate?: Date | null
}): NeedsAttentionReason | null {
  if (task.status === "DONE") return null
  const now = new Date()
  if (task.status === "BLOCKED") return "BLOCKED"
  if (task.status === "WAITING_ON") return "WAITING_ON"
  if (task.dueDate && task.dueDate.getTime() < now.getTime()) return "OVERDUE"
  if (task.priority === "CRITICAL" && task.status !== "DONE") return "CRITICAL"
  if ((PRIORITY_RANK[task.priority ?? ""] ?? 0) >= 3 && task.status !== "DONE") return "HIGH"
  return null
}

// ── Document intelligence (Phase 3b) ────────────────────────────────────────
const EXPIRY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000 // surface docs expiring within 30 days

/**
 * Derive a needs-attention reason for a document from its expiry date and/or
 * manual attention flag:
 *   - `attention` set (and non-empty)  -> "OPEN" (operator flagged for review)
 *   - `expiryDate` in the past         -> "EXPIRED"
 *   - `expiryDate` within 30 days      -> "EXPIRING_SOON"
 *   - otherwise                        -> null (not urgent)
 */
export function documentAttentionReason(doc: {
  expiryDate?: Date | null
  attention?: string | null
}): NeedsAttentionReason | null {
  const flagged = doc.attention && doc.attention.trim().length > 0
  const now = Date.now()
  if (doc.expiryDate) {
    const t = doc.expiryDate.getTime()
    if (t < now) return "EXPIRED"
    if (t - now <= EXPIRY_WINDOW_MS) return "EXPIRING_SOON"
  }
  if (flagged) return "OPEN"
  return null
}

/** Convert a document record to a needs-attention item (kind: "document"). */
export function documentToItem(
  doc: { id: string; name: string; expiryDate?: Date | null; attention?: string | null; entityId: string | null; entityName?: string | null },
): NeedsAttentionItem | null {
  const reason = documentAttentionReason(doc)
  if (!reason) return null
  return {
    id: doc.id,
    kind: "document",
    title: doc.name,
    reason,
    status: reason === "EXPIRED" ? "EXPIRED" : reason === "EXPIRING_SOON" ? "EXPIRING" : doc.attention ?? "OPEN",
    dueDate: doc.expiryDate ? doc.expiryDate.toISOString() : undefined,
    entityId: doc.entityId ?? "",
    entityName: doc.entityName ?? undefined,
    url: `/documents/${doc.id}`,
  }
}

export function sortNeedsAttention(items: NeedsAttentionItem[]): NeedsAttentionItem[] {
  const order: Record<NeedsAttentionReason, number> = {
    BLOCKED: 0,
    OVERDUE: 1,
    EXPIRED: 1,
    CRITICAL: 2,
    WAITING_ON: 3,
    HIGH: 4,
    EXPIRING_SOON: 5,
    OPEN: 6,
  }
  return [...items].sort((a, b) => order[a.reason] - order[b.reason])
}

interface EntityRef {
  id: string
  name?: string | null
}

/**
 * Collect needs-attention items scoped to the given entities (e.g. a single
 * entity, or every entity a contact relates to). Open / overdue / blocked /
 * critical tasks dominate; also surfaces on-hold or late projects, and (when
 * opts.includeDocuments) expiring/expired/flagged documents.
 */
export async function collectNeedsAttention(
  orgId: string,
  entities: EntityRef[],
  opts: { includeProjects?: boolean; includeDocuments?: boolean } = {},
): Promise<NeedsAttentionItem[]> {
  if (entities.length === 0) return []
  const entityIds = entities.map((e) => e.id)
  const nameById = new Map(entities.map((e) => [e.id, e.name]))

  const tasks = await prisma.task.findMany({
    where: { organizationId: orgId, entityId: { in: entityIds } },
    select: { id: true, title: true, status: true, priority: true, dueDate: true, entityId: true },
    orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
  })

  const items: NeedsAttentionItem[] = []
  for (const t of tasks) {
    const reason = needsAttentionReason(t)
    if (!reason) continue
    items.push({
      id: t.id,
      kind: "task",
      title: t.title,
      reason,
      status: t.status,
      priority: t.priority ?? undefined,
      dueDate: t.dueDate ? t.dueDate.toISOString() : undefined,
      entityId: t.entityId ?? "",
      entityName: t.entityId ? (nameById.get(t.entityId) ?? undefined) : undefined,
      url: `/tasks/${t.id}`,
    })
  }

  if (opts.includeProjects) {
    const projects = await prisma.project.findMany({
      where: { organizationId: orgId, entityId: { in: entityIds } },
      select: { id: true, name: true, status: true, targetDate: true, entityId: true },
    })
    const now = new Date()
    for (const p of projects) {
      const reason: NeedsAttentionReason | null =
        p.status === "ON_HOLD"
          ? "WAITING_ON"
          : p.status === "ACTIVE" && p.targetDate && p.targetDate.getTime() < now.getTime()
            ? "OVERDUE"
            : null
      if (!reason) continue
      items.push({
        id: p.id,
        kind: "project",
        title: p.name,
        reason,
        status: p.status,
        dueDate: p.targetDate ? p.targetDate.toISOString() : undefined,
        entityId: p.entityId ?? "",
        entityName: p.entityId ? (nameById.get(p.entityId) ?? undefined) : undefined,
        url: `/projects/${p.id}`,
      })
    }
  }

  if (opts.includeDocuments) {
    const docs = await prisma.document.findMany({
      where: { organizationId: orgId, entityId: { in: entityIds } },
      select: { id: true, name: true, expiryDate: true, attention: true, entityId: true },
    })
    for (const d of docs) {
      const item = documentToItem({ ...d, entityName: d.entityId ? nameById.get(d.entityId) : null })
      if (item) items.push(item)
    }
  }

  return sortNeedsAttention(items)
}

/**
 * Project-scoped briefing: the project's own on-hold / overdue status, its
 * open/overdue/blocked tasks, and its expiring/flagged documents.
 */
export async function collectProjectNeedsAttention(
  orgId: string,
  projectId: string,
): Promise<NeedsAttentionItem[]> {
  const items: NeedsAttentionItem[] = []

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: orgId },
    select: { id: true, name: true, status: true, targetDate: true, entityId: true, entity: { select: { name: true } } },
  })
  if (!project) return items

  const now = new Date()
  if (project.status === "ON_HOLD") {
    items.push({ id: project.id, kind: "project", title: project.name, reason: "WAITING_ON", status: project.status, dueDate: project.targetDate ? project.targetDate.toISOString() : undefined, entityId: project.entityId ?? "", entityName: project.entity?.name ?? undefined, url: `/projects/${project.id}` })
  } else if (project.status === "ACTIVE" && project.targetDate && project.targetDate.getTime() < now.getTime()) {
    items.push({ id: project.id, kind: "project", title: project.name, reason: "OVERDUE", status: project.status, dueDate: project.targetDate.toISOString(), entityId: project.entityId ?? "", entityName: project.entity?.name ?? undefined, url: `/projects/${project.id}` })
  }

  const [tasks, docs] = await Promise.all([
    prisma.task.findMany({
      where: { organizationId: orgId, projectId },
      select: { id: true, title: true, status: true, priority: true, dueDate: true, entityId: true },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
    }),
    prisma.document.findMany({
      where: { organizationId: orgId, projectId },
      select: { id: true, name: true, expiryDate: true, attention: true, entityId: true },
    }),
  ])

  for (const t of tasks) {
    const reason = needsAttentionReason(t)
    if (!reason) continue
    items.push({ id: t.id, kind: "task", title: t.title, reason, status: t.status, priority: t.priority ?? undefined, dueDate: t.dueDate ? t.dueDate.toISOString() : undefined, entityId: t.entityId ?? "", url: `/tasks/${t.id}` })
  }
  for (const d of docs) {
    const item = documentToItem({ ...d, entityName: null })
    if (item) items.push(item)
  }

  return sortNeedsAttention(items)
}

/**
 * Task-scoped briefing: just this one task (its own open/overdue/blocked/
 * critical/on-hold reason), or an empty list when it does not need attention.
 */
export async function collectTaskNeedsAttention(orgId: string, taskId: string): Promise<NeedsAttentionItem[]> {
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId: orgId },
    select: { id: true, title: true, status: true, priority: true, dueDate: true, entityId: true, entity: { select: { name: true } } },
  })
  if (!task) return []
  const reason = needsAttentionReason(task)
  if (!reason) return []
  return [{
    id: task.id,
    kind: "task",
    title: task.title,
    reason,
    status: task.status,
    priority: task.priority ?? undefined,
    dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
    entityId: task.entityId ?? "",
    entityName: task.entity?.name ?? undefined,
    url: `/tasks/${task.id}`,
  }]
}

/**
 * Document-scoped briefing: the single document's expiry/attention
 * intelligence, or an empty list when it needs no attention.
 */
export async function collectDocumentNeedsAttention(orgId: string, documentId: string): Promise<NeedsAttentionItem[]> {
  const doc = await prisma.document.findFirst({
    where: { id: documentId, organizationId: orgId },
    select: { id: true, name: true, expiryDate: true, attention: true, entityId: true, entity: { select: { name: true } } },
  })
  if (!doc) return []
  const item = documentToItem({ ...doc, entityName: doc.entity?.name })
  return item ? [item] : []
}
