-- Rename Gantt-prefixed tables to Task-prefixed names.
-- Uses ALTER TABLE RENAME to preserve all data, indexes and constraints.

-- 1. Rename enum type GanttTaskDurationUnit → TaskDurationUnit
ALTER TYPE "GanttTaskDurationUnit" RENAME TO "TaskDurationUnit";

-- 2. Rename tables
ALTER TABLE "GanttTask"         RENAME TO "Task";
ALTER TABLE "GanttLink"         RENAME TO "TaskLink";
ALTER TABLE "GanttResource"     RENAME TO "TaskResource";
ALTER TABLE "GanttResourceNode" RENAME TO "TaskResourceNode";
ALTER TABLE "GanttAssignment"   RENAME TO "TaskAssignment";
ALTER TABLE "GanttBaseline"     RENAME TO "TaskBaseline";

-- 3. Rename FK columns in TaskResourceNode (ganttResourceId → taskResourceId)
ALTER TABLE "TaskResourceNode" RENAME COLUMN "ganttResourceId" TO "taskResourceId";

-- 4. Rename relation fields in TaskResource (ganttResourceNodes → taskResourceNodes)
--    This is a virtual field in Prisma (no DB column), so no SQL needed.

-- 5. Rename sequences (PostgreSQL auto-names them based on table name)
ALTER SEQUENCE IF EXISTS "GanttTask_id_seq"         RENAME TO "Task_id_seq";
ALTER SEQUENCE IF EXISTS "GanttLink_id_seq"         RENAME TO "TaskLink_id_seq";
ALTER SEQUENCE IF EXISTS "GanttResource_id_seq"     RENAME TO "TaskResource_id_seq";
ALTER SEQUENCE IF EXISTS "GanttResourceNode_id_seq" RENAME TO "TaskResourceNode_id_seq";
ALTER SEQUENCE IF EXISTS "GanttAssignment_id_seq"   RENAME TO "TaskAssignment_id_seq";
ALTER SEQUENCE IF EXISTS "GanttBaseline_id_seq"     RENAME TO "TaskBaseline_id_seq";

-- 6. Rename indexes (PostgreSQL keeps old names after table rename)
-- GanttTask indexes
ALTER INDEX IF EXISTS "GanttTask_publicId_key" RENAME TO "Task_publicId_key";
ALTER INDEX IF EXISTS "GanttTask_pkey"         RENAME TO "Task_pkey";

-- GanttLink indexes
ALTER INDEX IF EXISTS "GanttLink_publicId_key" RENAME TO "TaskLink_publicId_key";
ALTER INDEX IF EXISTS "GanttLink_pkey"         RENAME TO "TaskLink_pkey";

-- GanttResource indexes
ALTER INDEX IF EXISTS "GanttResource_publicId_key" RENAME TO "TaskResource_publicId_key";
ALTER INDEX IF EXISTS "GanttResource_pkey"         RENAME TO "TaskResource_pkey";

-- GanttResourceNode indexes
ALTER INDEX IF EXISTS "GanttResourceNode_publicId_key" RENAME TO "TaskResourceNode_publicId_key";
ALTER INDEX IF EXISTS "GanttResourceNode_pkey"         RENAME TO "TaskResourceNode_pkey";

-- GanttAssignment indexes
ALTER INDEX IF EXISTS "GanttAssignment_pkey"                 RENAME TO "TaskAssignment_pkey";
ALTER INDEX IF EXISTS "GanttAssignment_taskId_resourceId_key" RENAME TO "TaskAssignment_taskId_resourceId_key";

-- GanttBaseline indexes
ALTER INDEX IF EXISTS "GanttBaseline_pkey"    RENAME TO "TaskBaseline_pkey";
ALTER INDEX IF EXISTS "GanttBaseline_taskId_key" RENAME TO "TaskBaseline_taskId_key";
