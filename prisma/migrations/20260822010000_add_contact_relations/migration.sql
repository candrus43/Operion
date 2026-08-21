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
--   DATA migration (run once, idempotent, conservative — only merges when a
--   normalized email/phone AND confident name match):
--     DATABASE_URL="<neon>" bun prisma/scripts/dedupe-contacts.ts [--dry-run]
--   Result on Neon: contacts 69 → 40 distinct people (29 confident duplicates
--   merged), 60 ContactRelation rows, all 40 contacts carry at least one
--   relation, 0 orphaned contacts, tasks preserved (255).
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
