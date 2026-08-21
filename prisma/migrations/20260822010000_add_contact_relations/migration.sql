-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3a — Contact relationship / dedup model (Executive Intelligence Refresh)
--
--   The team's canonical schema application mechanism is `prisma db push`
--   (additive; verified NO data-loss warning; Task count preserved = 255).
--   This migration file is committed as the authoritative, reviewable record
--   of the additive DDL and is exactly what `db push` applied against Neon.
--
--   Structural fix: ONE real person is ONE `Contact` row. Each entity they
--   relate to becomes a `ContactRelation` row (role/title + enabled +
--   per-entity notes). This removes the duplicate-contact problem of the old
--   flat single-`entityId` model. The existing `Contact.entityId` stays
--   (nullable) as the person's primary/home entity (back-compat).
--
--   DATA migration (run once, idempotent, conservative — merges only when a
--   confident name match is corroborated by a signal, see the script header):
--     DATABASE_URL="<neon>" bun prisma/scripts/dedupe-contacts.ts [--dry-run]
--   Phase 3a (original): merged only on "normalized email OR phone AND confident
--   name" — contacts 69 → 40 distinct people (29 merged). Missed same-firm /
--   same-person duplicates that carried different work emails & phones.
--   Phase 3a.1 (fix): added two corroborating paths — (a) same normalized
--   company + confident name, and (b) eponymous firms (each company opens with
--   the person's surname) + confident name. Re-run on Neon: 40 → 33 distinct
--   people (7 more merged: Daniel Cho, Marcus Bell, Nina Kapoor, Elena Marquez,
--   Olivia Park, Victor Lang, Grace Kim), 0 further merges on re-run (idempotent).
--   Final state: 33 contacts org-wide (Blackstone demo 29 + Joshua Loveday 4,
--   untouched), Blackstone relations 56 → 50 (same-entity role collisions
--   collapsed to one relation per entity, lost roles folded into customer notes
--   — no orphan relations, no duplicate-named contacts, tasks preserved).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE "ContactRelation" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "role" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContactRelation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContactRelation_contactId_entityId_key" ON "ContactRelation"("contactId", "entityId");
CREATE INDEX "ContactRelation_entityId_idx" ON "ContactRelation"("entityId");
CREATE INDEX "ContactRelation_organizationId_idx" ON "ContactRelation"("organizationId");
ALTER TABLE "ContactRelation" ADD CONSTRAINT "ContactRelation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactRelation" ADD CONSTRAINT "ContactRelation_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactRelation" ADD CONSTRAINT "ContactRelation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
