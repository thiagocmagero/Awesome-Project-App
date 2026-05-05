-- AlterTable: Project — adicionar startDate, endDate e priority
ALTER TABLE "Project" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "endDate"   TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "priority"  TEXT;
