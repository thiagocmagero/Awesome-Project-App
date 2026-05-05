-- SaaS Multi-Tenancy Migration
-- Adds ownerId to Team and UserType; migrates profile codes.

-- ─── 1. Add ownerId to Team ───────────────────────────────────────────────────

ALTER TABLE "Team" ADD COLUMN "ownerId" INTEGER;

ALTER TABLE "Team"
  ADD CONSTRAINT "Team_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 2. Add ownerId to UserType ───────────────────────────────────────────────

ALTER TABLE "UserType" ADD COLUMN "ownerId" INTEGER;

ALTER TABLE "UserType"
  ADD CONSTRAINT "UserType_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 3. Replace global unique index on UserType.code with (code, ownerId) ─────

-- Remove any exact (code, ownerId) duplicates before creating the composite index
-- (keeps the row with the lowest id in each duplicate group)
DELETE FROM "UserType" ut1
USING "UserType" ut2
WHERE ut1.code = ut2.code
  AND ut1."ownerId" IS NOT DISTINCT FROM ut2."ownerId"
  AND ut1.id > ut2.id;

DROP INDEX IF EXISTS "UserType_code_key";

-- PostgreSQL treats each NULL as distinct in unique indexes,
-- so (code='X', ownerId=NULL) can exist only once (platform-wide type),
-- while (code='X', ownerId=1) and (code='X', ownerId=2) are both valid.
CREATE UNIQUE INDEX "UserType_code_ownerId_key" ON "UserType"("code", "ownerId");

-- ─── 4. Insert new SaaS profiles ─────────────────────────────────────────────

INSERT INTO "Profile" ("code", "label", "description", "status", "createdAt", "updatedAt")
VALUES
  ('BASIC_USER',      'Utilizador Básico',      'Utilizador com workspace próprio isolado',          'ACTIVE'::"Status", NOW(), NOW()),
  ('PRO_USER',        'Utilizador Pro',          'Utilizador pro com funcionalidades avançadas',      'ACTIVE'::"Status", NOW(), NOW()),
  ('ENTERPRISE_USER', 'Utilizador Enterprise',   'Utilizador enterprise com suporte dedicado',        'ACTIVE'::"Status", NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- ─── 5. Migrate existing STAKEHOLDER users → BASIC_USER ──────────────────────

UPDATE "User"
  SET "profileId" = (SELECT "id" FROM "Profile" WHERE "code" = 'BASIC_USER')
  WHERE "profileId" IN (SELECT "id" FROM "Profile" WHERE "code" = 'STAKEHOLDER');

-- ─── 6. Retire legacy profiles (soft-disable — never DELETE to preserve FKs) ──

UPDATE "Profile"
  SET "status" = 'INACTIVE', "updatedAt" = NOW()
  WHERE "code" IN ('STAKEHOLDER', 'PROJECT_MANAGER');
