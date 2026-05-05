-- CreateEnum
CREATE TYPE "TimesheetWeekStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PARTIAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TimesheetDayStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TimesheetLogScope" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "TimesheetLogAction" AS ENUM ('SUBMIT', 'RESUBMIT', 'APPROVE', 'REJECT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'TIMESHEET_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'TIMESHEET_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'TIMESHEET_PARTIALLY_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'TIMESHEET_REJECTED';

-- CreateTable
CREATE TABLE "TimesheetWeek" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "status" "TimesheetWeekStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetDay" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "weekId" INTEGER NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "status" "TimesheetDayStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "rejectedById" INTEGER,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetEntry" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "weekId" INTEGER NOT NULL,
    "dayId" INTEGER NOT NULL,
    "workDate" TIMESTAMP(3) NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(5,2) NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimesheetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimesheetApprovalLog" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "weekId" INTEGER NOT NULL,
    "actorId" INTEGER NOT NULL,
    "action" "TimesheetLogAction" NOT NULL,
    "scope" "TimesheetLogScope" NOT NULL,
    "scopeDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimesheetApprovalLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetWeek_publicId_key" ON "TimesheetWeek"("publicId");

-- CreateIndex
CREATE INDEX "TimesheetWeek_userId_weekStart_idx" ON "TimesheetWeek"("userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetWeek_projectId_userId_weekStart_key" ON "TimesheetWeek"("projectId", "userId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetDay_publicId_key" ON "TimesheetDay"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetDay_weekId_workDate_key" ON "TimesheetDay"("weekId", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetEntry_publicId_key" ON "TimesheetEntry"("publicId");

-- CreateIndex
CREATE INDEX "TimesheetEntry_projectId_userId_weekStart_idx" ON "TimesheetEntry"("projectId", "userId", "weekStart");

-- CreateIndex
CREATE INDEX "TimesheetEntry_userId_workDate_idx" ON "TimesheetEntry"("userId", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetEntry_projectId_userId_taskId_workDate_key" ON "TimesheetEntry"("projectId", "userId", "taskId", "workDate");

-- CreateIndex
CREATE UNIQUE INDEX "TimesheetApprovalLog_publicId_key" ON "TimesheetApprovalLog"("publicId");

-- CreateIndex
CREATE INDEX "TimesheetApprovalLog_weekId_createdAt_idx" ON "TimesheetApprovalLog"("weekId", "createdAt");

-- AddForeignKey
ALTER TABLE "TimesheetWeek" ADD CONSTRAINT "TimesheetWeek_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetWeek" ADD CONSTRAINT "TimesheetWeek_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetDay" ADD CONSTRAINT "TimesheetDay_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "TimesheetWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetDay" ADD CONSTRAINT "TimesheetDay_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetDay" ADD CONSTRAINT "TimesheetDay_rejectedById_fkey" FOREIGN KEY ("rejectedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GanttTask"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "TimesheetWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetEntry" ADD CONSTRAINT "TimesheetEntry_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "TimesheetDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetApprovalLog" ADD CONSTRAINT "TimesheetApprovalLog_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "TimesheetWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetApprovalLog" ADD CONSTRAINT "TimesheetApprovalLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
