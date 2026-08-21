/**
 * Client-side broadcast so the activity feed can refresh immediately after a
 * task mutation (status change, comment, review, etc.) without a full reload.
 * Components that mutate a task call `notifyTaskChanged()`; the feed listens
 * for the "task-changed" CustomEvent and refetches.
 */
export function notifyTaskChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("task-changed"))
  }
}
