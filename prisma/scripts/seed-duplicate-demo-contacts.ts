/**
 * Phase 4d — Seed the two demo duplicate pairs so /contacts/duplicates
 * (Review Duplicates) and the merge/unmerge click-through can be verified
 * end-to-end on LIVE data.
 *
 * The live Blackstone Partners demo org already contains ONE "Sarah Chen"
 * (Meridian Holdings) and ONE "David Park" (Park & Associates Law), so this
 * script adds exactly ONE counterpart for each name/company to form:
 *
 *   Pair A — two "Sarah Chen" at Meridian Holdings
 *   Pair B — two "David Park" at Park & Associates Law
 *
 * Each pair shares the SAME normalized company AND the SAME name but has a
 * DISTINCT email / phone / position, so findPotentialDuplicateGroups (the exact
 * logic powering /contacts/duplicates, from src/lib/contact-similarity.ts)
 * groups them as potential duplicates.
 *
 * Idempotent: each seeded contact is keyed by its unique email. If a contact
 * with that email already exists in the org, the script reports "already
 * present" instead of creating a duplicate. Re-running never adds extras, never
 * creates a third Sarah Chen / David Park. Org-scoped only — no other orgs or
 * existing contacts are touched (existing rows are only read to confirm no
 * conflict).
 *
 * Usage (bun, like seed.ts / dedupe-contacts.ts):
 *   DATABASE_URL="<neon-url>" bun prisma/scripts/seed-duplicate-demo-contacts.ts
 */
import { PrismaClient } from "@prisma/client"
import { findPotentialDuplicateGroups } from "../../src/lib/contact-similarity"

const prisma = new PrismaClient()
const OWNER_EMAIL = "morgan@blackstonepartners.demo"

// ── The two pairs to ensure exist. The FIRST entry of each pair is expected to
//    already exist in the org (confirmed on 2026-08). The SECOND is what this
//    script seeds if it is missing.
interface Pair {
  label: string
  // the second member of the pair (the one this script creates if missing).
  // keyed by its unique email for idempotency.
  seed: {
    name: string
    company: string
    position: string
    phone: string
    email: string
  }
}
const PAIRS: Pair[] = [
  {
    label: "Sarah Chen",
    seed: {
      name: "Sarah Chen",
      company: "Meridian Holdings",
      position: "Vice President",
      phone: "305-555-0198",
      email: "sarahchen@meridianholdings.com",
    },
  },
  {
    label: "David Park",
    seed: {
      name: "David Park",
      company: "Park & Associates Law",
      position: "Associate Attorney",
      phone: "404-555-0202",
      email: "david.park@parklaw.com",
    },
  },
]

async function main() {
  const org = await prisma.organization.findFirst({
    where: { users: { some: { email: OWNER_EMAIL } } },
  })
  if (!org) {
    console.error(`[dup-seed] FATAL: demo org not found for owner ${OWNER_EMAIL}`)
    process.exit(1)
  }
  console.log(`[dup-seed] org: ${org.id} (${org.name}, subscription=${org.subscriptionStatus})`)

  const countBefore = await prisma.contact.count({ where: { organizationId: org.id } })
  console.log(`[dup-seed] contacts BEFORE: ${countBefore}`)

  let created = 0
  for (const pair of PAIRS) {
    const { seed } = pair
    const existingByEmail = await prisma.contact.findFirst({
      where: { organizationId: org.id, email: seed.email },
    })
    if (existingByEmail) {
      console.log(
        `[dup-seed] ${pair.label}: seed contact already present (${seed.email}) — skipping (idempotent)`
      )
      continue
    }

    // Confirm the counterpart (first member of the pair) exists so we actually
    // form a 2-contact group rather than creating an orphan.
    const counterpart = await prisma.contact.findFirst({
      where: { organizationId: org.id, name: seed.name, company: seed.company, email: { not: seed.email } },
    })
    if (!counterpart) {
      console.warn(
        `[dup-seed] ${pair.label}: no existing counterpart (${seed.name} at ${seed.company}) found — creating seed contact as a lone card; review may still not group it.`
      )
    }

    const createdRow = await prisma.contact.create({
      data: {
        name: seed.name,
        company: seed.company,
        position: seed.position,
        phone: seed.phone,
        email: seed.email,
        organizationId: org.id,
      },
    })
    created++
    console.log(
      `[dup-seed] ${pair.label}: created counterpart -> ${createdRow.name} | ${createdRow.company} | ${createdRow.position} | ${createdRow.phone} | ${createdRow.email} | id=${createdRow.id}`
    )
  }

  const countAfter = await prisma.contact.count({ where: { organizationId: org.id } })
  console.log(`[dup-seed] contacts AFTER: ${countAfter} (delta=${countAfter - countBefore}, created=${created})`)

  // ── Verify against the real review logic ──────────────────────────────────
  const active = await prisma.contact.findMany({
    where: { organizationId: org.id, mergedIntoId: null },
    select: {
      id: true,
      name: true,
      company: true,
      position: true,
      phone: true,
      email: true,
      notes: true,
      createdAt: true,
    },
  })
  const groups = findPotentialDuplicateGroups(active)
  console.log(`\n[dup-seed] VERIFY findPotentialDuplicateGroups on active contacts -> ${groups.length} group(s):`)
  for (const g of groups) {
    console.log(
      `  GROUP "${g[0].name}": ` +
        g.map((c) => `${c.name} <${c.email}> @ ${c.company}`).join("  ||  ")
    )
  }
  const sarahGroup = groups.find((g) => g[0]!.name === "Sarah Chen")
  const davidGroup = groups.find((g) => g[0]!.name === "David Park")
  const ok =
    sarahGroup && sarahGroup.length === 2 && davidGroup && davidGroup.length === 2 && groups.length === 2
  console.log(`[dup-seed] ${ok ? "PASS ✓ two Sarah Chen + two David Park groups surface as duplicates" : "CHECK — expected exactly 2 groups"}`)
  console.log(`[dup-seed] DONE`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
