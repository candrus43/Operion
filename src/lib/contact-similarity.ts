/**
 * Contact similarity — shared, conservative duplicate detection (Phase 4d).
 *
 * These pure helpers were factored out of the one-time dedup script
 * (`prisma/scripts/dedupe-contacts.ts`) so the user-facing duplicate-review
 * surface (`/contacts/duplicates`) and the merge API compute candidates with
 * the SAME logic the script used. Nothing here auto-merges anything: it only
 * proposes groups of PLAUSIBLY-same contacts for the owner to decide on.
 *
 * Honesty rule: a candidate group is a SUGGESTION built from real shared
 * fields (normalized email / phone / company / name). It is never a claim of
 * sameness — two unrelated "John Smith" cards at unrelated companies are never
 * grouped.
 */

export interface SimilarContact {
  id: string
  name: string
  company?: string | null
  position?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  createdAt: Date
}

export function normEmail(e?: string | null): string {
  return (e ?? "").trim().toLowerCase().replace(/\s+/g, "")
}
export function normPhone(p?: string | null): string {
  return (p ?? "").replace(/[^\d]/g, "")
}
export function normName(n?: string | null): string {
  return (n ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim()
}
export function normCompany(c?: string | null): string {
  return (c ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim()
}

/** Confident-name test: same first token + same last token, or identical single token. */
export function namesMatch(a?: string | null, b?: string | null): boolean {
  const na = normName(a)
  const nb = normName(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const ta = na.split(" ")
  const tb = nb.split(" ")
  const firstOk = ta[0] === tb[0]
  const lastOk = ta.length >= 2 && tb.length >= 2 ? ta[ta.length - 1] === tb[tb.length - 1] : true
  return firstOk && lastOk
}

/** Last (surname) token of the normalized name, or "" for single-token names. */
export function surname(n?: string | null): string {
  const t = normName(n).split(" ")
  return t.length >= 2 ? t[t.length - 1] : ""
}

/** Eponymous-firm test: both firms open with the person's surname (>= 2 tokens each). */
export function eponymousFirms(
  a: { company?: string | null; name?: string | null },
  b: { company?: string | null; name?: string | null }
): boolean {
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

/**
 * Suggest which contact in a group would be the best keeper: the most complete
 * (most non-null primary fields), else the earliest-created.
 */
export function pickKeeper<T extends SimilarContact>(group: T[]): T {
  const score = (c: T) =>
    [c.email, c.phone, c.company, c.position, c.notes].filter(Boolean).length
  return [...group].sort(
    (a, b) => score(b) - score(a) || a.createdAt.getTime() - b.createdAt.getTime()
  )[0]
}

/**
 * Returns groups of contacts that are plausibly the same person, conservative
 * by design (same guard rail as the script): a corroborating shared signal
 * (normalized email, phone, or company) AND a confident name match. Pass only
 * ACTIVE (not-already-merged) contacts.
 */
export function findPotentialDuplicateGroups<T extends SimilarContact>(contacts: T[]): T[][] {
  const byEmail = new Map<string, T[]>()
  const byPhone = new Map<string, T[]>()
  const byCompany = new Map<string, T[]>()
  const byName = new Map<string, T[]>()
  const index = (m: Map<string, T[]>, key: string, c: T) => {
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
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  for (const c of contacts) parent.set(c.id, c.id)

  // corroborating signal (bucket) AND confident name — never merge on a shared
  // key without a matching name.
  const consider = (list: T[]) => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (namesMatch(list[i].name, list[j].name)) union(list[i].id, list[j].id)
      }
    }
  }
  byEmail.forEach((l) => consider(l))
  byPhone.forEach((l) => consider(l))
  byCompany.forEach((l) => consider(l))
  for (const list of byName.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        if (namesMatch(a.name, b.name) && eponymousFirms(a, b)) union(a.id, b.id)
      }
    }
  }

  const groups = new Map<string, T[]>()
  for (const c of contacts) {
    const root = find(c.id)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(c)
  }
  return [...groups.values()].filter((g) => g.length > 1)
}
