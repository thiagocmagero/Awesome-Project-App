-- Baseline migration: reconciles migration history with real DB state.
-- Objects below already exist in the production DB but were created out-of-band
-- (no prior migration recorded them). SQL is idempotent so that fresh
-- environments (and `migrate deploy` on DBs without these objects) still apply
-- cleanly.

-- DropIndex (orphan legacy indexes from 20260509120000_add_task_description_audit;
-- schema no longer declares @@index on Task.createdById/updatedById)
DROP INDEX IF EXISTS "Task_createdById_idx";
DROP INDEX IF EXISTS "Task_updatedById_idx";

-- CreateTable
CREATE TABLE IF NOT EXISTS "Tag" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "workspaceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdById" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TaskTag" (
    "taskId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "TaskTag_pkey" PRIMARY KEY ("taskId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_publicId_key" ON "Tag"("publicId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Tag_workspaceId_status_idx" ON "Tag"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_workspaceId_name_key" ON "Tag"("workspaceId", "name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaskTag_tagId_idx" ON "TaskTag"("tagId");

-- AddForeignKey (guarded — Postgres has no ADD CONSTRAINT IF NOT EXISTS pre-9.6;
-- use DO block to skip when already present)
DO $$ BEGIN
    ALTER TABLE "Tag" ADD CONSTRAINT "Tag_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Tag" ADD CONSTRAINT "Tag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "TaskTag" ADD CONSTRAINT "TaskTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
