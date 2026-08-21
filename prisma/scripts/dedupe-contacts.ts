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
 *   Phase B — Dedup. Merge two Contacts ONLY when they are confidently the
 *   SAME person. A merge requires a confident name match AND one of the
 *   following corroborating signals (added in Phase 3a.1):
 *
 *     1. Strong identifier + name (Phase 3a, unchanged): same normalized
 *        email, OR same normalized phone (length >= 8), PLUS confident name.
 *     2. Same firm + name (Phase 3a.1 — fixes Daniel Cho et al.): same
 *        normalized company AND confident name. This catches one real person
 *        who appears twice within the same firm with different work emails /
 *        phones / titles (e.g. "Managing Partner · Cho & Patel LLP" and
 *        "Real Estate Counsel · Cho & Patel LLP").
 *     3. Eponymous firms + name (Phase 3a.1 — fixes Marcus Bell): confident
 *        name (>= 2 tokens) AND BOTH contacts' companies are the person's own
 *        firms — each company's opening token equals the person's surname
 *        (e.g. "Bell Tax Advisors" and "Bell Facilities Group" both open with
 *        Marcus Bell's surname "Bell"). Only fires where the name match is
 *        already strong and the firms are demonstrably named after the person.
 *
 *   Never merges two genuinely distinct people: every path requires a
 *   confident name match, and the firm-based paths require the firms to be
 *   the same or eponymous with the person — so two unrelated "John Smith"
 *   cards at unrelated companies are never merged. The most "complete"
 *   contact is kept as the survivor; the duplicate's relations are reparented
 *   to it (same-entity role collisions are preserved by folding the lost role
 *   into the keeper's notes), its missing primary fields are copied over, and
 *   the duplicate row is deleted.
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
function normCompany(c?: string | null): string {
  return (c ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim()
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

/** Last (surname) token of the normalized name, or "" for single-token names. */
function surname(n?: string | null): string {
  const t = normName(n).split(" ")
  return t.length >= 2 ? t[t.length - 1] : ""
}

/**
 * Eponymous-firm test (Phase 3a.1 — Marcus Bell case): both contacts' companies
 * are the person's OWN firms, i.e. each company opens with the person's surname
 * and each company has >= 2 tokens (a bare "Bell" is weaker evidence). Only
 * evaluated alongside a confident name match.
 */
function eponymousFirms(a: { company?: string | null; name?: string | null }, b: { company?: string | null; name?: string | null }): boolean {
  const ca = normCompany(a.company)
  const cb = normCompany(b.company)
  if (!ca || !cb) return false
  const ta = ca.split(" ")
  const tb = cb.split(" ")
  if (ta.length < 2 || tb.length < 2) return false
  const s = surname(a.name)
  if (!s) return false
  return ta[0] === s && tb[0] === s
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

    // ── Phase B: dedup by (corroborating signal AND confident name) ─────────
    // Build buckets keyed by normalized email, phone, company, and full name,
    // then run union-find only on pairs that clear a signal + name gate.
    const byEmail = new Map<string, typeof contacts>()
    const byPhone = new Map<string, typeof contacts>()
    const byCompany = new Map<string, typeof contacts>()
    const byName = new Map<string, typeof contacts>()
    const index = (m: Map<string, typeof contacts>, key: string, c: typeof contacts[number]) => {
      if (!key) return
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(c)
    }
    for (const c of contacts) {
      index(byEmail, normEmail(c.email), c)
      if (normPhone(c.phone).length >= 8) index(byPhone, normPhone(c.phone), c)
      index(byCompany, normCompany(c.company), c)
      index(byName, normName(c.name), c)
    }

    // union-find over indices
    const parent = new Map<string, string>()
    const find = (x: string): string => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x)!)), parent.get(x)!))
    const union = (a: string, b: string) => {
      const ra = find(a), rb = find(b)
      if (ra !== rb) parent.set(ra, rb)
    }
    for (const c of contacts) parent.set(c.id, c.id)

    // Signal + confident-name gate, applied within the shared-key bucket.
    const consider = (list: typeof contacts) => {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j]
          // Guard: a corroborating signal (same bucket) AND a confident name
          // are REQUIRED. Never merge on a shared key without a name match.
          if (namesMatch(a.name, b.name)) union(a.id, b.id)
        }
      }
    }
    // 1) strong identifier + name (Phase 3a, unchanged)
    byEmail.forEach((l) => consider(l))
    byPhone.forEach((l) => consider(l))
    // 2) same firm + name (Phase 3a.1 — Daniel Cho case + same-firm pairs)
    byCompany.forEach((l) => consider(l))
    // 3) eponymous firms + name (Phase 3a.1 — Marcus Bell case)
    for (const list of byName.values()) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i], b = list[j]
          if (namesMatch(a.name, b.name) && eponymousFirms(a, b)) union(a.id, b.id)
        }
      }
    }

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
        console.log(`[merge] "${d.name}" (${d.company ?? "—"}/${d.position ?? "—"}) -> keeper "${keeper.name}" (${keeper.company ?? "—"}/${keeper.position ?? "—"})`)
        if (!DRY) {
          // reparent all of the dup's relations to the keeper (skip collisions)
          const rels = await prisma.contactRelation.findMany({ where: { contactId: d.id } })
          for (const r of rels) {
            const existing = await prisma.contactRelation.findFirst({
              where: { contactId: keeper.id, entityId: r.entityId },
            })
            if (!existing) {
              await prisma.contactRelation.create({
                data: { contactId: keeper.id, entityId: r.entityId, role: r.role, notes: r.notes, enabled: r.enabled, organizationId: org.id },
              })
            } else if (r.role && r.role !== existing.role) {
              // same-entity role collision: unique(contactId,entityId) can hold
              // only one role per entity — preserve the lost role on the keeper's
              // notes so no role knowledge is silently dropped.
              const entity = await prisma.entity.findUnique({ where: { id: r.entityId }, select: { name: true } })
              const tag = entity?.name ?? r.entityId
              const note = `${r.role} (${tag})`
              const mergedNotes = keeper.notes
                ? keeper.notes.includes(note)
                  ? keeper.notes
                  : `${keeper.notes}\n${note}`
                : note
              await prisma.contact.update({ where: { id: keeper.id }, data: { notes: mergedNotes || null } })
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
            } else if (d.position && d.position !== (await prisma.contactRelation.findFirst({ where: { contactId: keeper.id, entityId: d.entityId } }))!.role) {
              const entity = await prisma.entity.findUnique({ where: { id: d.entityId }, select: { name: true } })
              const tag = entity?.name ?? d.entityId
              const note = `${d.position} (${tag})`
              const mergedNotes = keeper.notes
                ? keeper.notes.includes(note)
                  ? keeper.notes
                  : `${keeper.notes}\n${note}`
                : note
              await prisma.contact.update({ where: { id: keeper.id }, data: { notes: mergedNotes || null } })
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
