// ─────────────────────────────────────────────────────────────────────────────
// Deterministic project risk + phase/progress reconciliation (Phase 4e / GAP 14B)
//
// Replaces the "AI Risk Assessment — Coming in Phase 4" placeholder with REAL
// signals computed from actual project data. Nothing here is fabricated or
// LLM-guessed: every signal is derived from stored fields (task statuses,
// due dates, priorities, project target date, phase, progress). Where the data
// doesn't justify a claim, we show "no material risks detected" rather than a
// made-up score.
// ─────────────────────────────────────────────────────────────────────────────

export const PHASE_ORDER = [
  "ACQUISITION",
  "DUE_DILIGENCE",
  "DESIGN",
  "PERMITTING",
  "CONSTRUCTION",
  "CLOSEOUT",
  "OPERATIONS",
] as const

export const PHASE_LABELS: Record<string, string> = {
  ACQUISITION: "Acquisition",
  DUE_DILIGENCE: "Due Diligence",
  DESIGN: "Design",
  PERMITTING: "Permitting",
  CONSTRUCTION: "Construction",
  CLOSEOUT: "Closeout",
  OPERATIONS: "Operations",
}

export function phaseIndex(phase?: string | null): number {
  return PHASE_ORDER.indexOf((phase as any) ?? "")
}

export interface ReconcilationWarning {
  level: "ahead" | "behind"
  message: string
  progress: number
  phase: string
}

/**
 * Phase-vs-progress reconciliation. Compares the displayed phase against the
 * actual % progress and returns an honest inline warning when they disagree by
 * a material amount — e.g. an early "Acquisition"/"Design" phase claiming 90%
 * complete, or a late construction/closeout phase stuck at 10%. Returns null
 * when progress and phase are broadly consistent.
 */
export function reconcilePhaseProgress(
  phase?: string | null,
  progress?: number | null,
): ReconcilationWarning | null {
  const idx = phaseIndex(phase)
  if (idx < 0) return null
  const pct = typeof progress === "number" ? Math.min(Math.max(progress, 0), 100) : 0
  const phaseLabel = PHASE_LABELS[phase ?? ""] ?? phase ?? ""

  // Expected progress band for the current phase. Each phase occupies an equal
  // slice of the 7-phase timeline; the phase is "current" roughly from just past
  // its start through to just before the next phase starts.
  const slice = 100 / PHASE_ORDER.length
  const bandCenter = (idx + 0.5) * slice
  // Tolerance: how far actual progress may sit from the band center before we call it.
  const TOLERANCE = 25

  if (pct > bandCenter + TOLERANCE) {
    return {
      level: "ahead",
      progress: pct,
      phase: phaseLabel,
      message: `Marked "${phaseLabel}" but at ${pct}% complete — progress is well past this phase. The phase may be stale and should be advanced (or progress reviewed).`,
    }
  }
  if (pct < bandCenter - TOLERANCE && idx >= 2) {
    return {
      level: "behind",
      progress: pct,
      phase: phaseLabel,
      message: `At ${pct}% complete but still in "${phaseLabel}" — for this phase ~${Math.round(bandCenter)}% would normally be expected. The plan may be slipping.`,
    }
  }
  return null
}

export interface RiskSignal {
  id: string
  label: string
  detail: string
  severity: "high" | "medium" | "low"
}

interface TaskLike {
  id: string
  title: string
  status: string
  priority?: string | null
  dueDate?: Date | null
  escalationOwner?: string | null
  waitingOn?: string | null
}

interface ProjectLike {
  id: string
  name: string
  status: string
  phase?: string | null
  progress?: number | null
  targetDate?: Date | null
}

/**
 * Compute the project's real risk signals from its open/overdue/blocked tasks,
 * an overdue target date, on-hold status, and phase/progress reconciliation.
 * Deterministic and data-driven — never fabricated.
 */
export function computeProjectRisk(
  project: ProjectLike,
  tasks: TaskLike[],
): { signals: RiskSignal[]; level: "HIGH" | "MEDIUM" | "LOW"; hasRisk: boolean } {
  const signals: RiskSignal[] = []
  const now = new Date()

  const open = tasks.filter((t) => t.status !== "DONE")
  const blocked = open.filter((t) => t.status === "BLOCKED")
  const overdue = open.filter(
    (t) => t.dueDate && t.dueDate.getTime() < now.getTime(),
  )
  const critical = open.filter((t) => t.priority === "CRITICAL")
  const waiting = open.filter((t) => t.status === "WAITING_ON")

  if (blocked.length > 0) {
    signals.push({
      id: "blocked",
      label: `${blocked.length} blocked task${blocked.length > 1 ? "s" : ""}`,
      detail:
        blocked[0].escalationOwner
          ? `Escalated to ${blocked[0].escalationOwner}.`
          : blocked[0].title,
      severity: "high",
    })
  }
  if (overdue.length > 0) {
    signals.push({
      id: "overdue",
      label: `${overdue.length} overdue task${overdue.length > 1 ? "s" : ""}`,
      detail: overdue[0].title,
      severity: blocked.length > 0 ? "high" : "medium",
    })
  }
  if (project.status === "ACTIVE" && project.targetDate && project.targetDate.getTime() < now.getTime()) {
    signals.push({
      id: "late",
      label: "Target date passed",
      detail: `Planned completion ${project.targetDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} is in the past.`,
      severity: blocked.length > 0 ? "high" : "medium",
    })
  }
  if (project.status === "ON_HOLD") {
    signals.push({
      id: "onhold",
      label: "Project on hold",
      detail: "Work is paused — no progress is being made while it stays on hold.",
      severity: "medium",
    })
  }
  if (critical.length > 0) {
    signals.push({
      id: "critical",
      label: `${critical.length} critical open task${critical.length > 1 ? "s" : ""}`,
      detail: critical[0].title,
      severity: "high",
    })
  }
  if (waiting.length > 0) {
    signals.push({
      id: "waiting",
      label: `${waiting.length} task${waiting.length > 1 ? "s" : ""} waiting on external`,
      detail: waiting[0].waitingOn || waiting[0].title,
      severity: "low",
    })
  }

  const rec = reconcilePhaseProgress(project.phase, project.progress)
  if (rec) {
    signals.push({
      id: "reconciliation",
      label: rec.level === "behind" ? "Progress behind phase" : "Progress ahead of phase",
      detail: rec.message,
      severity: rec.level === "behind" ? "medium" : "low",
    })
  }

  const hasHigh = signals.some((s) => s.severity === "high")
  const hasMid = signals.some((s) => s.severity === "medium")
  const level = hasHigh ? "HIGH" : hasMid ? "MEDIUM" : signals.length > 0 ? "LOW" : "LOW"

  return { signals, level, hasRisk: signals.length > 0 }
}
