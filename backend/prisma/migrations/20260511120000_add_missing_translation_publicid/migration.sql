-- Step 1: add column nullable
ALTER TABLE "MissingTranslation" ADD COLUMN "publicId" TEXT;

-- Step 2: backfill existing rows with random UUIDs
-- (gen_random_uuid produces v4 UUIDs; new inserts use uuid v7 via Prisma default)
UPDATE "MissingTranslation" SET "publicId" = gen_random_uuid()::text WHERE "publicId" IS NULL;

-- Step 3: enforce NOT NULL + UNIQUE
ALTER TABLE "MissingTranslation" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "MissingTranslation_publicId_key" ON "MissingTranslation"("publicId");
