// ─────────────────────────────────────────────────────────────────────────────
// Aggregated contextual significance (Phase 4a — GAP E).
//
// Takes real org-scoped counts and derives a composite, deterministic
// "what does this MEAN" statement — e.g. "19 blocked tasks. Four affect
// projects due within 30 days." — rather than bare numbers. Every number is
// computed from actual rows in the current org; nothing is fabricated or
// LLM-generated. When no meaningful pattern exists it returns an honest
// equivalent ("No blocked tasks or upcoming expirations.").
//
// The returned `sentences` are pre-joined into a human sentence for rendering,
// each with an optional deep-link into the affected records.
// ─────────────────────────────────────────────────────────────────────────────

import { prisma } from "@/lib/db"

export type SignificanceTone = "critical" | "warn" | "good"

export interface SignificanceSentence {
  text: string
  href?: string
  tone: SignificanceTone
}

export interface AggregateSignificance {
  blockedCount: number
  blockedImpactWithin30: number
  overdueTaskCount: number
  docsExpiringSoon: number
  awaitingApprovalCount: number
  activeProjectCount: number
  sentences: SignificanceSentence[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_30 = 30 * DAY_MS

export async function computeAggregateSignificance(orgId: string): Promise<AggregateSignificance> {
  const now = new Date()
  const nowMs = now.getTime()
  const windowEnd = new Date(nowMs + WINDOW_30)

  // Blocked tasks, plus their project's target date (for the "affect projects
  // due within 30 days" clause).
  const blockedTasks = await prisma.task.findMany({
    where: { organizationId: orgId, status: "BLOCKED" },
    select: { id: true, project: { select: { targetDate: true } } },
  })

  const overdueTaskCount = await prisma.task.count({
    where: { organizationId: orgId, status: { not: "DONE" }, dueDate: { lt: now } },
  })

  const docsExpiringSoon = await prisma.document.count({
    where: { organizationId: orgId, expiryDate: { gte: now, lte: windowEnd } },
  })

  const awaitingApprovalCount = await prisma.task.count({
    where: {
      organizationId: orgId,
      OR: [{ status: "READY_FOR_REVIEW" }, { approvalStatus: "PENDING" }],
    },
  })

  const activeProjectCount = await prisma.project.count({
    where: { organizationId: orgId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
  })

  const blockedCount = blockedTasks.length
  // Blocked tasks whose project is due within 30 days (target date <= now+30d,
  // including already-overdue targets — still "due within 30 days" from today).
  const blockedImpactWithin30 = blockedTasks.filter(
    (t) => t.project?.targetDate && t.project.targetDate.getTime() <= nowMs + WINDOW_30,
  ).length

  const sentences: SignificanceSentence[] = []

  if (blockedCount > 0) {
    const clause =
      blockedImpactWithin30 > 0
        ? `${blockedCount} blocked task${blockedCount === 1 ? "" : "s"}. ${blockedImpactWithin30} affect project${blockedImpactWithin30 === 1 ? "" : "s"} due within 30 days.`
        : `${blockedCount} blocked task${blockedCount === 1 ? "" : "s"} (none impact a project due within 30 days).`
    sentences.push({ text: clause, href: "/tasks?status=BLOCKED", tone: blockedImpactWithin30 > 0 ? "critical" : "warn" })
  }

  if (overdueTaskCount > 0) {
    sentences.push({
      text: `${overdueTaskCount} overdue task${overdueTaskCount === 1 ? "" : "s"}.`,
      href: "/tasks",
      tone: "warn",
    })
  }

  if (docsExpiringSoon > 0) {
    sentences.push({
      text: `${docsExpiringSoon} document${docsExpiringSoon === 1 ? "" : "s"} expire within 30 days.`,
      href: "/documents",
      tone: "warn",
    })
  }

  if (awaitingApprovalCount > 0) {
    sentences.push({
      text: `${awaitingApprovalCount} item${awaitingApprovalCount === 1 ? "" : "s"} await your approval or review.`,
      href: "/tasks",
      tone: "warn",
    })
  }

  if (sentences.length === 0) {
    sentences.push({ text: "No blocked tasks or upcoming expirations.", tone: "good" })
  }

  return {
    blockedCount,
    blockedImpactWithin30,
    overdueTaskCount,
    docsExpiringSoon,
    awaitingApprovalCount,
    activeProjectCount,
    sentences,
  }
}
