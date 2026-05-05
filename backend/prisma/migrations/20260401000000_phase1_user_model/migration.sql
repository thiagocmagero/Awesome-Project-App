-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 1 — User model refactoring
-- Transitions from Role enum to Profile / UserType / UserLevel tables
-- Safe to apply on existing DB (handles data migration from role column)
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateEnum: Status
CREATE TYPE "Status" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateTable: Profile
CREATE TABLE "Profile" (
    "id"          SERIAL       NOT NULL,
    "code"        TEXT         NOT NULL,
    "label"       TEXT         NOT NULL,
    "description" TEXT,
    "status"      "Status"     NOT NULL DEFAULT 'ACTIVE',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserType
CREATE TABLE "UserType" (
    "id"          SERIAL       NOT NULL,
    "code"        TEXT         NOT NULL,
    "label"       TEXT         NOT NULL,
    "description" TEXT,
    "status"      "Status"     NOT NULL DEFAULT 'ACTIVE',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserType_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserLevel
CREATE TABLE "UserLevel" (
    "id"        SERIAL       NOT NULL,
    "code"      TEXT         NOT NULL,
    "label"     TEXT         NOT NULL,
    "order"     INTEGER      NOT NULL DEFAULT 0,
    "status"    "Status"     NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserLevel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (unique codes)
CREATE UNIQUE INDEX "Profile_code_key"   ON "Profile"("code");
CREATE UNIQUE INDEX "UserType_code_key"  ON "UserType"("code");
CREATE UNIQUE INDEX "UserLevel_code_key" ON "UserLevel"("code");

-- Seed base Profiles (idempotent via ON CONFLICT DO NOTHING)
INSERT INTO "Profile" ("code", "label", "description", "updatedAt") VALUES
    ('PLATFORM_ADMIN',  'Platform Admin',   'Gere utilizadores, perfis, equipas, projetos e associações globais', NOW()),
    ('PROJECT_MANAGER', 'Project Manager',  'Gere projetos e equipas no contexto funcional', NOW()),
    ('STAKEHOLDER',     'Stakeholder',      'Perfil consultivo/participativo com permissões limitadas', NOW())
ON CONFLICT ("code") DO NOTHING;

-- AlterTable: add new columns to User (nullable first for data migration)
ALTER TABLE "User"
    ADD COLUMN "status"      "Status"  NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN "profileId"   INTEGER,
    ADD COLUMN "userTypeId"  INTEGER,
    ADD COLUMN "levelId"     INTEGER,
    ADD COLUMN "createdById" INTEGER;

-- Data migration: map old Role → new profileId
UPDATE "User"
    SET "profileId" = (SELECT "id" FROM "Profile" WHERE "code" = 'PLATFORM_ADMIN')
    WHERE "role" = 'ADMIN';

UPDATE "User"
    SET "profileId" = (SELECT "id" FROM "Profile" WHERE "code" = 'STAKEHOLDER')
    WHERE "role" = 'USER';

-- Make profileId NOT NULL after data migration
ALTER TABLE "User" ALTER COLUMN "profileId" SET NOT NULL;

-- AddForeignKey constraints
ALTER TABLE "User" ADD CONSTRAINT "User_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_userTypeId_fkey"
    FOREIGN KEY ("userTypeId") REFERENCES "UserType"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_levelId_fkey"
    FOREIGN KEY ("levelId") REFERENCES "UserLevel"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old role column and enum
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "Role";
