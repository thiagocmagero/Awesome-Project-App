-- Migration: remove_legacy_profiles
-- Migrates users with PROJECT_MANAGER or STAKEHOLDER profiles to BASIC_USER,
-- then removes the legacy profile rows.

-- Step 1: Reatribuir utilizadores com PROJECT_MANAGER ou STAKEHOLDER para BASIC_USER
UPDATE "User"
SET "profileId" = (SELECT "id" FROM "Profile" WHERE "code" = 'BASIC_USER' LIMIT 1)
WHERE "profileId" IN (
  SELECT "id" FROM "Profile" WHERE "code" IN ('PROJECT_MANAGER', 'STAKEHOLDER')
);

-- Step 2: Eliminar os perfis legados
DELETE FROM "Profile" WHERE "code" IN ('PROJECT_MANAGER', 'STAKEHOLDER');
