-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 3b — Document intelligence fields (Executive Intelligence Refresh)
--
--   The team's canonical schema application mechanism is `prisma db push`
--   (additive; verified NO data-loss warning; Document count preserved). This
--   migration file is committed as the authoritative, reviewable record of the
--   additive DDL and is exactly what `db push` applied against Neon.
--
--   All three fields are NULLABLE and additive — zero risk to existing rows:
--     - `expiryDate` : when the document expires / renews. The shared
--       needs-attention module derives EXPIRING_SOON (< 30d) / EXPIRED from it.
--     - `expiryNote` : free-form note about the expiry/renewal.
--     - `attention`  : optional operator-set reason string (e.g. "RENEW",
--       "REVIEW", "FLAGGED") that surfaces the doc in briefings regardless of
--       expiry date.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "Document" ADD COLUMN "expiryDate" TIMESTAMP(3);
ALTER TABLE "Document" ADD COLUMN "expiryNote" TEXT;
ALTER TABLE "Document" ADD COLUMN "attention" TEXT;
