-- Migration: introduce explicit Workspace model
-- See docs/claude/workspaces.md for design rationale.
--
-- This migration is non-trivial: creates a new Workspace table, backfills 1
-- workspace per existing User, then re-keys 9 dependent tables from
-- ownerId/userId to workspaceId. Run once; idempotency is not preserved.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create Workspace table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE "Workspace" (
  "id"        SERIAL PRIMARY KEY,
  "publicId"  TEXT NOT NULL,
  "ownerId"   INTEGER NOT NULL,
  "name"      TEXT NOT NULL,
  "status"    "Status" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL
);

CREATE UNIQUE INDEX "Workspace_publicId_key" ON "Workspace"("publicId");
CREATE UNIQUE INDEX "Workspace_ownerId_key" ON "Workspace"("ownerId");
CREATE INDEX "Workspace_ownerId_idx" ON "Workspace"("ownerId");

ALTER TABLE "Workspace"
  ADD CONSTRAINT "Workspace_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON UPDATE CASCADE ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Backfill: 1 Workspace per existing User
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "Workspace" ("publicId", "ownerId", "name", "status", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  u."id",
  COALESCE(NULLIF(u."name", ''), u."email") || '''s Workspace',
  'ACTIVE',
  NOW(),
  NOW()
FROM "User" u;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add workspaceId columns (NULL initially, NOT NULL applied selectively)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "Project"          ADD COLUMN "workspaceId" INTEGER;
ALTER TABLE "Team"             ADD COLUMN "workspaceId" INTEGER;
ALTER TABLE "Holiday"          ADD COLUMN "workspaceId" INTEGER;
ALTER TABLE "UserType"         ADD COLUMN "workspaceId" INTEGER;
ALTER TABLE "WorkspaceMember"  ADD COLUMN "workspaceId" INTEGER;
ALTER TABLE "Subscription"     ADD COLUMN "workspaceId" INTEGER;
ALTER TABLE "Invoice"          ADD COLUMN "workspaceId" INTEGER;
ALTER TABLE "UsageRecord"      ADD COLUMN "workspaceId" INTEGER;
ALTER TABLE "UserFeatureFlag"  ADD COLUMN "workspaceId" INTEGER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Backfill workspaceId from existing ownerId/userId
-- ─────────────────────────────────────────────────────────────────────────────
-- Ownership tables (keep workspaceId nullable to preserve orphans where
-- ownerId is already null from previous user hard-deletes)
UPDATE "Project" p          SET "workspaceId" = w."id" FROM "Workspace" w WHERE w."ownerId" = p."ownerId" AND p."ownerId" IS NOT NULL;
UPDATE "Team" t             SET "workspaceId" = w."id" FROM "Workspace" w WHERE w."ownerId" = t."ownerId" AND t."ownerId" IS NOT NULL;
UPDATE "Holiday" h          SET "workspaceId" = w."id" FROM "Workspace" w WHERE w."ownerId" = h."ownerId" AND h."ownerId" IS NOT NULL;
UPDATE "UserType" ut        SET "workspaceId" = w."id" FROM "Workspace" w WHERE w."ownerId" = ut."ownerId" AND ut."ownerId" IS NOT NULL;

-- WorkspaceMember (ownerId is NOT NULL today, no orphans)
UPDATE "WorkspaceMember" wm SET "workspaceId" = w."id" FROM "Workspace" w WHERE w."ownerId" = wm."ownerId";

-- Billing tables (userId is NOT NULL today)
UPDATE "Subscription" s     SET "workspaceId" = w."id" FROM "Workspace" w WHERE w."ownerId" = s."userId";
UPDATE "Invoice" i          SET "workspaceId" = w."id" FROM "Workspace" w WHERE w."ownerId" = i."userId";
UPDATE "UsageRecord" u      SET "workspaceId" = w."id" FROM "Workspace" w WHERE w."ownerId" = u."userId";
UPDATE "UserFeatureFlag" uf SET "workspaceId" = w."id" FROM "Workspace" w WHERE w."ownerId" = uf."userId";

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. NOT NULL on tables where workspaceId is required (5 of 9)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "WorkspaceMember"  ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Subscription"     ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "Invoice"          ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "UsageRecord"      ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "UserFeatureFlag"  ALTER COLUMN "workspaceId" SET NOT NULL;
-- Project, Team, Holiday, UserType: keep NULLABLE (mirrors ownerId nullability for orphans)

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Add 9 FK constraints (workspaceId → Workspace, all Cascade)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "Project"          ADD CONSTRAINT "Project_workspaceId_fkey"          FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Team"             ADD CONSTRAINT "Team_workspaceId_fkey"             FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Holiday"          ADD CONSTRAINT "Holiday_workspaceId_fkey"          FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "UserType"         ADD CONSTRAINT "UserType_workspaceId_fkey"         FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "WorkspaceMember"  ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Subscription"     ADD CONSTRAINT "Subscription_workspaceId_fkey"     FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "Invoice"          ADD CONSTRAINT "Invoice_workspaceId_fkey"          FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "UsageRecord"      ADD CONSTRAINT "UsageRecord_workspaceId_fkey"      FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON UPDATE CASCADE ON DELETE CASCADE;
ALTER TABLE "UserFeatureFlag"  ADD CONSTRAINT "UserFeatureFlag_workspaceId_fkey"  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON UPDATE CASCADE ON DELETE CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Replace old user-keyed unique constraints with workspaceId-keyed ones
-- ─────────────────────────────────────────────────────────────────────────────
-- Subscription: userId @unique → workspaceId @unique
DROP INDEX "Subscription_userId_key";
CREATE UNIQUE INDEX "Subscription_workspaceId_key" ON "Subscription"("workspaceId");

-- UsageRecord: (userId, usageKey) → (workspaceId, usageKey)
DROP INDEX "UsageRecord_userId_usageKey_key";
CREATE UNIQUE INDEX "UsageRecord_workspaceId_usageKey_key" ON "UsageRecord"("workspaceId", "usageKey");

-- UserFeatureFlag: (userId, featureFlagId) → (workspaceId, featureFlagId)
DROP INDEX "UserFeatureFlag_userId_featureFlagId_key";
CREATE UNIQUE INDEX "UserFeatureFlag_workspaceId_featureFlagId_key" ON "UserFeatureFlag"("workspaceId", "featureFlagId");

-- WorkspaceMember: (ownerId, email) → (workspaceId, email)
DROP INDEX "WorkspaceMember_ownerId_email_key";
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_email_key" ON "WorkspaceMember"("workspaceId", "email");

-- UserType: (code, ownerId) → (code, workspaceId)
DROP INDEX "UserType_code_ownerId_key";
CREATE UNIQUE INDEX "UserType_code_workspaceId_key" ON "UserType"("code", "workspaceId");

-- Invoice: index userId → workspaceId
DROP INDEX "Invoice_userId_idx";
CREATE INDEX "Invoice_workspaceId_idx" ON "Invoice"("workspaceId");

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Drop old FK constraints + old columns
-- ─────────────────────────────────────────────────────────────────────────────
-- WorkspaceMember.ownerId
ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_ownerId_fkey";
ALTER TABLE "WorkspaceMember" DROP COLUMN "ownerId";

-- Subscription.userId
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_userId_fkey";
ALTER TABLE "Subscription" DROP COLUMN "userId";

-- Invoice.userId
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_userId_fkey";
ALTER TABLE "Invoice" DROP COLUMN "userId";

-- UsageRecord.userId
ALTER TABLE "UsageRecord" DROP CONSTRAINT "UsageRecord_userId_fkey";
ALTER TABLE "UsageRecord" DROP COLUMN "userId";

-- UserFeatureFlag.userId
ALTER TABLE "UserFeatureFlag" DROP CONSTRAINT "UserFeatureFlag_userId_fkey";
ALTER TABLE "UserFeatureFlag" DROP COLUMN "userId";

-- KEEP: Project.ownerId, Team.ownerId, Holiday.ownerId, UserType.ownerId
-- These remain as audit fields (nullable, SetNull on User delete). They identify
-- "owner-within-workspace" for V2 (when a workspace can have multiple users
-- with delegated ownership). In V1 the value matches Workspace.ownerId by definition.
