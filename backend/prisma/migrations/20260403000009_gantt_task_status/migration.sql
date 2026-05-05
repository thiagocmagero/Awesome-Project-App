-- AlterTable: Add status column to GanttTask
ALTER TABLE "GanttTask" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'nova';
