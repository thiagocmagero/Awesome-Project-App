-- CreateEnum
CREATE TYPE "GanttTaskDurationUnit" AS ENUM ('DAY', 'HOUR');

-- AlterTable
ALTER TABLE "GanttTask" ADD COLUMN     "durationUnit" "GanttTaskDurationUnit" NOT NULL DEFAULT 'DAY';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "workHours" JSONB;
