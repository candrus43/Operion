// ─────────────────────────────────────────────────────────────────────────────
// Client-safe source metadata (no Prisma/DB imports — safe for browser bundles).
// ─────────────────────────────────────────────────────────────────────────────

import type { AiSourceType } from "./types"

export const sourceTypeLabel: Record<AiSourceType, string> = {
  entity: "Entity",
  project: "Project",
  task: "Task",
  contact: "Contact",
  document: "Document",
  meeting: "Meeting",
}
