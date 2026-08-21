import { prisma } from "@/lib/db"

export type TaskEventAction =
  | "STATUS_CHANGE"
  | "ASSIGNEE_CHANGE"
  | "DUE_CHANGE"
  | "BLOCKED"
  | "WAITING_ON"
  | "REVIEW_SUBMITTED"
  | "REVIEW_APPROVED"
  | "REVIEW_REQUESTED_CHANGES"
  | "REVIEW_REJECTED"
  | "COMMENT"
  | "AI_REFRESH"
  | "NOTE"

/**
 * Append a lightweight entry to a task's activity feed (TaskEvent table).
 * Fire-and-forget callers should `void` the returned promise.
 */
export async function createTaskEvent(params: {
  taskId: string
  organizationId: string
  actorId?: string | null
  actorName?: string | null
  action: TaskEventAction
  details?: Record<string, unknown> | null
}) {
  return prisma.taskEvent.create({
    data: {
      taskId: params.taskId,
      organizationId: params.organizationId,
      actorId: params.actorId ?? null,
      actorName: params.actorName ?? null,
      action: params.action,
      details: (params.details as any) ?? undefined,
    },
  })
}
