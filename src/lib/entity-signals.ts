// ─────────────────────────────────────────────────────────────────────────────
// Entity grid operational signals (Phase 4a — GAP A).
//
// Builds, from REAL org-scoped data, the per-entity signals an owner scans for
// on the entities grid:
//   - attention items needing the owner's eye (open/overdue/blocked/critical
//     tasks + expiring/expired/flagged documents)
//   - blocked task count
//   - decisions/tasks awaiting approval or escalation (READY_FOR_REVIEW,
//     pending approval, or an escalation owner assigned)
//   - nearest upcoming deadline (earliest non-done task dueDate OR document
//     expiryDate), flagged overdue when in the past
//   - count of active (non-closed) projects
//   - most recent activity timestamp (max updatedAt across the entity and its
//     tasks/projects/documents/contacts)
//   - responsible leader / owner, derived from task assignees (most load) or a
//     leadership-role contact relation when present
//
// Anti-patterns: NO fabricated numbers — every field is computed from rows that
// exist and belong to `orgId`. Reuses the shared needs-attention reasoning from
// ./needs-attention.ts so grid and command-center agree on what "needs
// attention" means.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/db"
import { needsAttentionReason, documentAttentionReason } from "@/lib/needs-attention"

export interface EntitySignal {
  /** Open / overdue / blocked / critical tasks + expiring/expired/flagged docs. */
  attentionCount: number
  /** Tasks currently BLOCKED. */
  blockedCount: number
  /** Decisions/tasks awaiting approval or escalation (READY_FOR_REVIEW | approval PENDING | assigned escalation owner). */
  awaitingReviewCount: number
  /** Projects whose status is not COMPLETED / CANCELLED. */
  activeProjectCount: number
  /** Earliest non-done task dueDate or document expiryDate, if any. */
  nearestDeadline: { date: string; kind: "task" | "document"; overdue: boolean } | null
  /** Max updatedAt (ISO) across the entity and its direct records. */
  lastActivity: string | null
  /** Derived responsible leader / owner, when one can be identified. */
  leader: string | null
}

export type EntitySignals = Record<string, EntitySignal>

const LEADERSHIP_ROLE = /owner|ceo|principal|president|partner|director|managing|general manager|head/i

export async function computeEntitySignals(orgId: string, entityIds: string[]): Promise<EntitySignals> {
  const signals: EntitySignals = {}
  for (const id of entityIds) {
    signals[id] = {
      attentionCount: 0,
      blockedCount: 0,
      awaitingReviewCount: 0,
      activeProjectCount: 0,
      nearestDeadline: null,
      lastActivity: null,
      leader: null,
    }
  }
  if (entityIds.length === 0) return signals

  const now = Date.now()

  const [tasks, docs, projects, relations, contacts] = await Promise.all([
    prisma.task.findMany({
      where: { organizationId: orgId, entityId: { in: entityIds } },
      select: {
        entityId: true,
        status: true,
        priority: true,
        dueDate: true,
        approvalStatus: true,
        escalationOwner: true,
        updatedAt: true,
        assigneeId: true,
        assignee: { select: { id: true, name: true } },
      },
    }),
    prisma.document.findMany({
      where: { organizationId: orgId, entityId: { in: entityIds } },
      select: { entityId: true, expiryDate: true, attention: true, updatedAt: true },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId, entityId: { in: entityIds } },
      select: { entityId: true, status: true, updatedAt: true },
    }),
    prisma.contactRelation.findMany({
      where: { organizationId: orgId, entityId: { in: entityIds } },
      select: { entityId: true, role: true, contact: { select: { name: true } } },
    }),
    prisma.contact.findMany({
      where: { organizationId: orgId, entityId: { in: entityIds } },
      select: { entityId: true, updatedAt: true },
    }),
  ])

  // ── Tasks: attention / blocked / awaiting / deadline / activity / leader ──
  const assigneeLoad = new Map<string, Map<string, number>>() // entityId -> assigneeName -> count
  const assigneeByName = new Map<string, string>() // assigneeId -> name

  for (const t of tasks) {
    if (t.entityId == null) continue
    const s = signals[t.entityId]
    if (!s) continue

    if (t.assignee?.name) {
      assigneeByName.set(t.assignee.id, t.assignee.name)
      if (!assigneeLoad.has(t.entityId)) assigneeLoad.set(t.entityId, new Map())
      const m = assigneeLoad.get(t.entityId)!
      m.set(t.assignee.name, (m.get(t.assignee.name) ?? 0) + 1)
    }

    const reason = needsAttentionReason(t)
    if (reason) {
      s.attentionCount += 1
      if (reason === "BLOCKED") s.blockedCount += 1
    }

    if (t.status === "READY_FOR_REVIEW" || t.approvalStatus === "PENDING" || t.escalationOwner) {
      s.awaitingReviewCount += 1
    }

    if (t.dueDate && t.status !== "DONE") {
      const ts = t.dueDate.getTime()
      if (!s.nearestDeadline || ts < new Date(s.nearestDeadline.date).getTime()) {
        s.nearestDeadline = { date: t.dueDate.toISOString(), kind: "task", overdue: ts < now }
      }
    }

    if (t.updatedAt.getTime() > (s.lastActivity ? new Date(s.lastActivity).getTime() : 0)) {
      s.lastActivity = t.updatedAt.toISOString()
    }
  }

  // ── Documents: expiring/expired attention + expiry deadline + activity ─────
  for (const d of docs) {
    if (d.entityId == null) continue
    const s = signals[d.entityId]
    if (!s) continue

    if (documentAttentionReason(d)) s.attentionCount += 1

    if (d.expiryDate) {
      const ts = d.expiryDate.getTime()
      if (!s.nearestDeadline || ts < new Date(s.nearestDeadline.date).getTime()) {
        s.nearestDeadline = { date: d.expiryDate.toISOString(), kind: "document", overdue: ts < now }
      }
    }

    if (d.updatedAt.getTime() > (s.lastActivity ? new Date(s.lastActivity).getTime() : 0)) {
      s.lastActivity = d.updatedAt.toISOString()
    }
  }

  // ── Projects: active count + activity ──────────────────────────────────────
  for (const p of projects) {
    if (p.entityId == null) continue
    const s = signals[p.entityId]
    if (!s) continue
    if (p.status !== "COMPLETED" && p.status !== "CANCELLED") s.activeProjectCount += 1
    if (p.updatedAt.getTime() > (s.lastActivity ? new Date(s.lastActivity).getTime() : 0)) {
      s.lastActivity = p.updatedAt.toISOString()
    }
  }

  // ── Contacts: activity ─────────────────────────────────────────────────────
  for (const c of contacts) {
    if (c.entityId == null) continue
    const s = signals[c.entityId]
    if (!s) continue
    if (c.updatedAt.getTime() > (s.lastActivity ? new Date(s.lastActivity).getTime() : 0)) {
      s.lastActivity = c.updatedAt.toISOString()
    }
  }

  // ── Leader: prefer a leadership-role contact relation, else top assignee ──
  for (const rel of relations) {
    const s = signals[rel.entityId]
    if (!s) continue
    if (rel.role && LEADERSHIP_ROLE.test(rel.role)) {
      s.leader = rel.contact.name
      break // one leader per entity is enough
    }
  }
  for (const [entityId, m] of assigneeLoad) {
    const s = signals[entityId]
    if (!s || s.leader) continue
    let best: string | null = null
    let bestCount = 0
    for (const [name, count] of m) {
      if (count > bestCount) { best = name; bestCount = count }
    }
    s.leader = best ?? s.leader
  }

  return signals
}
