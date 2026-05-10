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

-- 7. Rename foreign key constraints (table renames must happen first, above)
-- RenameForeignKey
ALTER TABLE "Task" RENAME CONSTRAINT "GanttTask_boardColumnId_fkey" TO "Task_boardColumnId_fkey";
ALTER TABLE "Task" RENAME CONSTRAINT "GanttTask_boardSwimlaneId_fkey" TO "Task_boardSwimlaneId_fkey";
ALTER TABLE "Task" RENAME CONSTRAINT "GanttTask_parentId_fkey" TO "Task_parentId_fkey";
ALTER TABLE "Task" RENAME CONSTRAINT "GanttTask_projectId_fkey" TO "Task_projectId_fkey";
ALTER TABLE "TaskAssignment" RENAME CONSTRAINT "GanttAssignment_resourceId_fkey" TO "TaskAssignment_resourceId_fkey";
ALTER TABLE "TaskAssignment" RENAME CONSTRAINT "GanttAssignment_taskId_fkey" TO "TaskAssignment_taskId_fkey";
ALTER TABLE "TaskBaseline" RENAME CONSTRAINT "GanttBaseline_taskId_fkey" TO "TaskBaseline_taskId_fkey";
ALTER TABLE "TaskLink" RENAME CONSTRAINT "GanttLink_sourceId_fkey" TO "TaskLink_sourceId_fkey";
ALTER TABLE "TaskLink" RENAME CONSTRAINT "GanttLink_targetId_fkey" TO "TaskLink_targetId_fkey";
ALTER TABLE "TaskResource" RENAME CONSTRAINT "GanttResource_parentId_fkey" TO "TaskResource_parentId_fkey";
ALTER TABLE "TaskResource" RENAME CONSTRAINT "GanttResource_projectId_fkey" TO "TaskResource_projectId_fkey";
ALTER TABLE "TaskResource" RENAME CONSTRAINT "GanttResource_userId_fkey" TO "TaskResource_userId_fkey";
ALTER TABLE "TaskResource" RENAME CONSTRAINT "GanttResource_userTypeId_fkey" TO "TaskResource_userTypeId_fkey";
ALTER TABLE "TaskResourceNode" RENAME CONSTRAINT "GanttResourceNode_ganttResourceId_fkey" TO "TaskResourceNode_taskResourceId_fkey";
ALTER TABLE "TaskResourceNode" RENAME CONSTRAINT "GanttResourceNode_parentId_fkey" TO "TaskResourceNode_parentId_fkey";
ALTER TABLE "TaskResourceNode" RENAME CONSTRAINT "GanttResourceNode_projectId_fkey" TO "TaskResourceNode_projectId_fkey";
ALTER TABLE "TaskResourceNode" RENAME CONSTRAINT "GanttResourceNode_userId_fkey" TO "TaskResourceNode_userId_fkey";
ALTER TABLE "TaskResourceNode" RENAME CONSTRAINT "GanttResourceNode_userTypeId_fkey" TO "TaskResourceNode_userTypeId_fkey";

-- RenameIndex
ALTER INDEX "GanttAssignment_publicId_key" RENAME TO "TaskAssignment_publicId_key";
ALTER INDEX "GanttBaseline_publicId_key" RENAME TO "TaskBaseline_publicId_key";
