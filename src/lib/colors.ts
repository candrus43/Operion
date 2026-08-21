// ─────────────────────────────────────────────────────────────────────────────
// Canonical status / priority / type color maps.
//
// Single source of truth for every colored status chip across the app. These
// were previously copy-pasted into ~8 files with drift between them (notably
// document-type colors: CONTRACT was amber in list/detail but purple in
// embedded entity/project views, and the whole scheme diverged). All call
// sites now import from here so a color is defined exactly once.
//
// Chip class conventions:
//   - `text-<c>-400 bg-<c>-500/10` is the chip fill/text.
//   - `border-<c>-500/20` tints the 1px outline (Badge/outline defaults to the
//     neutral --border token when absent).
//
// docTypeColor deliberately omits the border token: its value is also used as
// the fill for 9×9 icon squares, where a border looks heavy. Badge call sites
// add `border` themselves, so the outline stays crisp and neutral.
// ─────────────────────────────────────────────────────────────────────────────

/** Task priority chip. CRITICAL red, HIGH orange, MEDIUM blue, LOW/default zinc. */
export function priorityColor(p: string): string {
  switch (p) {
    case "CRITICAL": return "bg-red-500/10 text-red-400 border-red-500/20"
    case "HIGH": return "bg-orange-500/10 text-orange-400 border-orange-500/20"
    case "MEDIUM": return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  }
}

/** Task status chip. */
export function statusColor(s: string): string {
  switch (s) {
    case "WAITING_ON": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
    case "BLOCKED": return "bg-red-500/10 text-red-400 border-red-500/20"
    case "IN_PROGRESS": return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    case "DONE": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    case "READY_FOR_REVIEW": return "bg-purple-500/10 text-purple-400 border-purple-500/20"
    default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  }
}

/** Project status chip. */
export function projectStatusColor(s: string): string {
  switch (s) {
    case "ACTIVE": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    case "ON_HOLD": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
    case "COMPLETED": return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    case "CANCELLED": return "bg-red-500/10 text-red-400 border-red-500/20"
    default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  }
}

/** Project phase chip. */
export function phaseColor(p: string): string {
  switch (p) {
    case "ACQUISITION": return "bg-violet-500/10 text-violet-400 border-violet-500/20"
    case "DUE_DILIGENCE": return "bg-amber-500/10 text-amber-400 border-amber-500/20"
    case "DESIGN": return "bg-sky-500/10 text-sky-400 border-sky-500/20"
    case "PERMITTING": return "bg-orange-500/10 text-orange-400 border-orange-500/20"
    case "CONSTRUCTION": return "bg-red-500/10 text-red-400 border-red-500/20"
    case "CLOSEOUT": return "bg-blue-500/10 text-blue-400 border-blue-500/20"
    case "OPERATIONS": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    default: return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
  }
}

/**
 * Document-type chip fill/text.
 *
 * CANONICAL SCHEME (Phase 1b unification): adopts the embedded/entity style
 * from `docTypeConfig` (used by entity tabs, entity detail and project detail)
 * — CONTRACT amber. The old list/detail `typeColors` scheme (CONTRACT purple,
 * INSURANCE amber, etc.) was the odd one out and is retired so every doc-type
 * badge renders from this one map.
 */
export function docTypeColor(t: string): string {
  switch (t) {
    case "CONTRACT": return "text-amber-400 bg-amber-500/10"
    case "PURCHASE_AGREEMENT": return "text-violet-400 bg-violet-500/10"
    case "LEASE": return "text-sky-400 bg-sky-500/10"
    case "INSURANCE": return "text-emerald-400 bg-emerald-500/10"
    case "LICENSE": return "text-blue-400 bg-blue-500/10"
    case "TAX": return "text-red-400 bg-red-500/10"
    case "FINANCIAL_STATEMENT": return "text-amber-400 bg-amber-500/10"
    case "PHOTO": return "text-rose-400 bg-rose-500/10"
    default: return "text-zinc-400 bg-zinc-500/10" // PDF, OTHER, unknown
  }
}

/** Human-readable document-type labels. */
export const docTypeLabel: Record<string, string> = {
  CONTRACT: "Contract",
  PURCHASE_AGREEMENT: "Purchase Agreement",
  LEASE: "Lease",
  INSURANCE: "Insurance",
  LICENSE: "License",
  TAX: "Tax",
  FINANCIAL_STATEMENT: "Financial Statement",
  PHOTO: "Photo",
  PDF: "PDF",
  OTHER: "Other",
}
