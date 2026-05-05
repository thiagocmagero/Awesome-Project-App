-- CreateEnum
CREATE TYPE "HolidayScope" AS ENUM ('GLOBAL', 'REGIONAL', 'PROJECT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CalendarEventTypeKey" AS ENUM ('MANUAL', 'MEETING', 'REMINDER');

-- CreateEnum
CREATE TYPE "CalendarConfigScope" AS ENUM ('GLOBAL', 'USER', 'PROJECT');

-- AlterTable
ALTER TABLE "Holiday" ADD COLUMN     "scope" "HolidayScope" NOT NULL DEFAULT 'CUSTOM';

-- CreateTable
CREATE TABLE "CalendarEventType" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "systemKey" "CalendarEventTypeKey",
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "color" TEXT NOT NULL DEFAULT '#845adf',
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEventType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarEvent" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT,
    "createdById" INTEGER,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarConfig" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "scope" "CalendarConfigScope" NOT NULL,
    "userId" INTEGER,
    "projectId" INTEGER,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventType_publicId_key" ON "CalendarEventType"("publicId");

-- CreateIndex
CREATE INDEX "CalendarEventType_projectId_position_idx" ON "CalendarEventType"("projectId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEventType_projectId_systemKey_key" ON "CalendarEventType"("projectId", "systemKey");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarEvent_publicId_key" ON "CalendarEvent"("publicId");

-- CreateIndex
CREATE INDEX "CalendarEvent_projectId_startAt_idx" ON "CalendarEvent"("projectId", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarConfig_publicId_key" ON "CalendarConfig"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarConfig_scope_userId_projectId_key" ON "CalendarConfig"("scope", "userId", "projectId");

-- AddForeignKey
ALTER TABLE "CalendarEventType" ADD CONSTRAINT "CalendarEventType_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "CalendarEventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarConfig" ADD CONSTRAINT "CalendarConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarConfig" ADD CONSTRAINT "CalendarConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
