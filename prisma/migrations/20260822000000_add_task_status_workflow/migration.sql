-- Phase 1d — Task status-workflow capture + activity feed (TaskEvent).
--
-- ⚠️ ADDITIVE-ONLY. No existing column is dropped, renamed, or altered; no
-- existing data is touched. Every change below either adds a NULLABLE column
-- or creates the new TaskEvent table.
--
-- IMPORTANT (repo reality): `prisma migrate` is NOT usable on this repo.
-- prisma/migrations/migration_lock.toml is pinned to the legacy `sqlite`
-- provider (pre-db-push era) while the datasource in schema.prisma is
-- `postgresql`, and the production Neon database has NO _prisma_migrations
-- table (it was provisioned with `prisma db push`). Running `prisma migrate
-- status/dev` yields P3019.
--
-- → The team's canonical schema application mechanism is `prisma db push`
--   (additive; verified no data-loss warning; Task count preserved = 255).
--   This migration file is committed as the authoritative, reviewable record
--   of the additive DDL, and is exactly what `db push` applied.

-- ── New NULLABLE Task columns ─────────────────────────────────────────
ALTER TABLE "Task" ADD COLUMN "blockedReason" TEXT;
ALTER TABLE "Task" ADD COLUMN "blockedSince" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "waitingOn" TEXT;
ALTER TABLE "Task" ADD COLUMN "waitingOnSince" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "expectedResolutionDate" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "escalationOwner" TEXT;
ALTER TABLE "Task" ADD COLUMN "reviewRequestedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "reviewRequiredBy" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "Task" ADD COLUMN "reviewedAt" TIMESTAMP(3);
ALTER TABLE "Task" ADD COLUMN "approvalStatus" TEXT;
ALTER TABLE "Task" ADD COLUMN "aiSuggestionGeneratedAt" TIMESTAMP(3);

-- ── New TaskEvent feed table ──────────────────────────────────────────
CREATE TABLE "TaskEvent" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "TaskEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskEvent_taskId_at_idx" ON "TaskEvent"("taskId", "at");
CREATE INDEX "TaskEvent_organizationId_idx" ON "TaskEvent"("organizationId");
CREATE INDEX "Task_reviewedById_idx" ON "Task"("reviewedById");

ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskEvent" ADD CONSTRAINT "TaskEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
