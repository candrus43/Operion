import type { Prisma } from "@prisma/client"

// ─────────────────────────────────────────────────────────────────────────────
// Executive Intelligence Refresh — Phase 1c: Saved task views.
//
// A saved view is a *named preset* with a deterministic `where` fragment, all
// built from the same `buildViewWhere` function (no per-view hardcoded query
// copies). The server resolves the active view + filters via the URL query
// string, computes a count for every view using this same builder (org-scoped),
// then returns the filtered/sorted rows to the client.
// ─────────────────────────────────────────────────────────────────────────────

export const TASK_VIEWS = [
  {
    id: "needs-my-attention",
    label: "Needs My Attention",
    description: "High-impact or overdue work that isn't done yet.",
  },
  {
    id: "waiting-on-others",
    label: "Waiting on Others",
    description: "Tasks where you're blocked or waiting on someone else.",
  },
  { id: "overdue", label: "Overdue", description: "Past due and not complete." },
  {
    id: "due-this-week",
    label: "Due This Week",
    description: "Due within the next 7 days.",
  },
  {
    id: "awaiting-approval",
    label: "Awaiting Approval",
    description: "Ready for someone to review.",
  },
  {
    id: "blocked",
    label: "Blocked",
    description: "Blocked, or waiting on a blocked task.",
  },
  { id: "my-tasks", label: "My Tasks", description: "Assigned to you." },
  { id: "all", label: "All Tasks", description: "Every task in the organization." },
] as const

export type TaskViewId = (typeof TASK_VIEWS)[number]["id"]

export const DEFAULT_VIEW: TaskViewId = "needs-my-attention"

/** The number of days a task is considered "due this week". */
export const DUE_SOON_DAYS = 7

export function isValidViewId(id: string | undefined | null): id is TaskViewId {
  return !!id && TASK_VIEWS.some((v) => v.id === id)
}

export interface ViewScope {
  organizationId: string
  userId?: string
  now?: Date
}

/**
 * Build the single source-of-truth `where` fragment for a saved view.
 * Every view is scoped to the org; user-bound views also filter by the caller.
 * `now` is injectable for deterministic tests and count/query parity.
 */
export function buildViewWhere(view: TaskViewId, scope: ViewScope): Prisma.TaskWhereInput {
  const org: Prisma.TaskWhereInput = { organizationId: scope.organizationId }
  const now = scope.now ?? new Date()

  switch (view) {
    case "all":
      return org

    case "my-tasks":
      if (!scope.userId) return org
      return { ...org, assigneeId: scope.userId }

    // High-impact AND unhandled (HIGH/CRITICAL not done), OR simply overdue and
    // not done. This is "the work that matters most right now" for an executive.
    case "needs-my-attention":
      return {
        ...org,
        status: { not: "DONE" },
        OR: [{ priority: { in: ["HIGH", "CRITICAL"] } }, { dueDate: { lt: now } }],
      }

    // Waiting on another person (either marked WAITING_ON, has a dependency, or
    // has a named waiting-on user).
    case "waiting-on-others":
      return {
        ...org,
        OR: [
          { status: "WAITING_ON" },
          { dependsOnId: { not: null } },
          { waitingOnUser: { isNot: null } },
        ],
      }

    case "overdue":
      return { ...org, status: { not: "DONE" }, dueDate: { lt: now } }

    case "due-this-week": {
      const end = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000)
      return { ...org, status: { not: "DONE" }, dueDate: { gte: now, lte: end } }
    }

    case "awaiting-approval":
      return { ...org, status: "READY_FOR_REVIEW" }

    // Either explicitly BLOCKED, or blocked-by a task that is itself BLOCKED.
    case "blocked":
      return {
        ...org,
        OR: [{ status: "BLOCKED" }, { dependsOn: { is: { status: "BLOCKED" } } }],
      }
  }
}
