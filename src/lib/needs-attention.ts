// ─────────────────────────────────────────────────────────────────────────────
// Command-center "Needs Attention" briefings (Phase 3a — Executive Intelligence
// Refresh). Computes, for a scoped set of entities, the open / overdue / blocked
// items that need the owner's eye. Server-side only (uses Prisma). The result
// is a flat, render-safe list consumed by <NeedsAttentionCard/>.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/db"

export type NeedsAttentionReason = "OVERDUE" | "BLOCKED" | "CRITICAL" | "WAITING_ON" | "HIGH" | "OPEN"

export interface NeedsAttentionItem {
  id: string
  kind: "task" | "project"
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

export function sortNeedsAttention(items: NeedsAttentionItem[]): NeedsAttentionItem[] {
  const order: Record<NeedsAttentionReason, number> = {
    BLOCKED: 0,
    OVERDUE: 1,
    CRITICAL: 2,
    WAITING_ON: 3,
    HIGH: 4,
    OPEN: 5,
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
 * critical tasks dominate; also surfaces on-hold or late projects.
 */
export async function collectNeedsAttention(
  orgId: string,
  entities: EntityRef[],
  opts: { includeProjects?: boolean } = {},
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
      entityId: t.entityId,
      entityName: t.entityId ? nameById.get(t.entityId) : undefined,
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
        entityId: p.entityId,
        entityName: p.entityId ? nameById.get(p.entityId) : undefined,
        url: `/projects/${p.id}`,
      })
    }
  }

  return sortNeedsAttention(items)
}
