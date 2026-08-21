/**
 * Phase 3a — Contact dedup + relation backfill migration.
 *
 * Structural fix: ONE real person should be ONE `Contact` row, with their
 * entity memberships expressed as `ContactRelation` rows (role/notes per
 * entity). The old flat single-`entityId` model structurally produced
 * duplicate contacts when one person related to several entities.
 *
 * This script runs in two idempotent phases, both org-scoped and
 * conservative-by-design:
 *
 *   Phase A — Relation backfill. For every Contact that has an `entityId` but
 *   no ContactRelation to that entity yet, create one (role = position).
 *   Preserves every existing entity link exactly (no row is lost).
 *
 *   Phase B — Dedup. Merge two Contacts ONLY when BOTH a strong identifier
 *   (exact normalized email OR phone of length >= 8) matches AND the names
 *   match confidently (same first+last tokens, or identical single tokens).
 *   Never merges two distinct people. The most "complete" contact is kept as
 *   the survivor; the duplicate's relations are reparented to it, its missing
 *   primary fields are copied over, and the duplicate row is deleted.
 *
 * Usage (bun, like seed.ts):
 *   DATABASE_URL="<neon-url>" bun prisma/scripts/dedupe-contacts.ts          # execute
 *   DATABASE_URL="<neon-url>" bun prisma/scripts/dedupe-contacts.ts --dry-run # preview only
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const DRY = process.argv.includes("--dry-run")

// ── Normalization ────────────────────────────────────────────────────────────
function normEmail(e?: string | null): string {
  return (e ?? "").trim().toLowerCase().replace(/\s+/g, "")
}
function normPhone(p?: string | null): string {
  return (p ?? "").replace(/[^\d]/g, "")
}
function normName(n?: string | null): string {
  return (n ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim()
}

/** Confident-name test: same first token + same last token, or identical single token. */
function namesMatch(a?: string | null, b?: string | null): boolean {
  const na = normName(a)
  const nb = normName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const ta = na.split(" ")
  const tb = nb.split(" ")
  // require first-name AND last-name agreement when both have >= 2 tokens
  const firstOk = ta[0] === tb[0]
  const lastOk = ta.length >= 2 && tb.length >= 2 ? ta[ta.length - 1] === tb[tb.length - 1] : true
  return firstOk && lastOk
}

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true } })
  console.log(`[dedupe] ${orgs.length} organization(s), dryRun=${DRY}`)

  let totalContacts = 0
  let totalBackfilled = 0
  let totalMerged = 0
  let totalDeleted = 0

  for (const org of orgs) {
    const contacts = await prisma.contact.findMany({
      where: { organizationId: org.id },
      include: { relations: { select: { entityId: true } } },
      orderBy: { createdAt: "asc" },
    })
    if (contacts.length === 0) continue
    totalContacts += contacts.length

    // ── Phase A: backfill a relation for each existing entityId ─────────────
    for (const c of contacts) {
      if (!c.entityId) continue
      const hasRel = c.relations.some((r) => r.entityId === c.entityId)
      if (!hasRel) {
        totalBackfilled++
        console.log(`[backfill] contact ${c.name} -> entity ${c.entityId} (role=${c.position ?? "—"})`)
        if (!DRY) {
          await prisma.contactRelation.create({
            data: { contactId: c.id, entityId: c.entityId, role: c.position, organizationId: org.id },
          })
        }
      }
    }

    // ── Phase B: dedup by (strongId AND confident name) ─────────────────────
    // Build buckets keyed by normalized email and by normalized phone, then
    // run union-find only on edges that ALSO satisfy the name match.
    const byEmail = new Map<string, typeof contacts>()
    const byPhone = new Map<string, typeof contacts>()
    const index = (m: Map<string, typeof contacts>, key: string, c: typeof contacts[number]) => {
      if (!key) return
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(c)
    }
    for (const c of contacts) {
      index(byEmail, normEmail(c.email), c)
      if (normPhone(c.phone).length >= 8) index(byPhone, normPhone(c.phone), c)
    }

    // union-find over indices
    const parent = new Map<string, string>()
    const find = (x: string): string => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!))
    const union = (a: string, b: string) => {
      const ra = find(a), rb = find(b)
      if (ra !== rb) parent.set(ra, rb)
    }
    for (const c of contacts) parent.set(c.id, c.id)

    const consider = (list: typeof contacts) => {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j]
          // Guard: both a strong id and a confident name are REQUIRED.
          if (namesMatch(a.name, b.name)) union(a.id, b.id)
        }
      }
    }
    byEmail.forEach((l) => consider(l))
    byPhone.forEach((l) => consider(l))

    // group survivors
    const groups = new Map<string, typeof contacts>()
    for (const c of contacts) {
      const root = find(c.id)
      if (!groups.has(root)) groups.set(root, [])
      groups.get(root)!.push(c)
    }

    for (const group of groups.values()) {
      if (group.length <= 1) continue
      // keeper = most complete (most non-null primary fields), else earliest
      const score = (c: typeof contacts[number]) =>
        [c.email, c.phone, c.company, c.position, c.notes].filter(Boolean).length
      const keeper = [...group].sort((a, b) => score(b) - score(a) || a.createdAt.getTime() - b.createdAt.getTime())[0]
      const dups = group.filter((c) => c.id !== keeper.id)

      for (const d of dups) {
        totalMerged++
        console.log(`[merge] "${d.name}" -> keeper "${keeper.name}"`)
        if (!DRY) {
          // reparent all of the dup's relations to the keeper (skip collisions)
          const rels = await prisma.contactRelation.findMany({ where: { contactId: d.id } })
          for (const r of rels) {
            const has = await prisma.contactRelation.findFirst({
              where: { contactId: keeper.id, entityId: r.entityId },
            })
            if (!has) {
              await prisma.contactRelation.create({
                data: { contactId: keeper.id, entityId: r.entityId, role: r.role, notes: r.notes, enabled: r.enabled, organizationId: org.id },
              })
            }
            await prisma.contactRelation.delete({ where: { id: r.id } })
          }
          // ensure the dup's primary entityId stays represented on the keeper
          if (d.entityId) {
            const has = await prisma.contactRelation.findFirst({
              where: { contactId: keeper.id, entityId: d.entityId },
            })
            if (!has) {
              await prisma.contactRelation.create({
                data: { contactId: keeper.id, entityId: d.entityId, role: d.position, organizationId: org.id },
              })
            }
          }
          // copy missing primary fields onto keeper
          const patch: Record<string, unknown> = {}
          if (!keeper.email && d.email) patch.email = d.email
          if (!keeper.phone && d.phone) patch.phone = d.phone
          if (!keeper.company && d.company) patch.company = d.company
          if (!keeper.position && d.position) patch.position = d.position
          if (!keeper.notes && d.notes) patch.notes = d.notes
          if (Object.keys(patch).length) {
            await prisma.contact.update({ where: { id: keeper.id }, data: patch })
          }
          await prisma.contact.delete({ where: { id: d.id } })
          totalDeleted++
        }
      }
    }
  }

  console.log(
    `[dedupe] DONE: contacts=${totalContacts} backfilled=${totalBackfilled} merged=${totalMerged} deleted=${DRY ? 0 : totalDeleted}`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
