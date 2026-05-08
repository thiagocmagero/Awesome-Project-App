-- CreateEnum
CREATE TYPE "FileScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'FILE_INFECTED';

-- AlterTable
ALTER TABLE "PlatformLimits" ADD COLUMN     "allowedMimeTypes" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "maxUploadSizeMb" INTEGER NOT NULL DEFAULT 50;

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "isSecuredPath" BOOLEAN NOT NULL DEFAULT false,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "taskId" INTEGER,
    "uploadedById" INTEGER,
    "scanStatus" "FileScanStatus",
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "File_publicId_key" ON "File"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "File_bucketKey_key" ON "File"("bucketKey");

-- CreateIndex
CREATE INDEX "File_projectId_status_idx" ON "File"("projectId", "status");

-- CreateIndex
CREATE INDEX "File_taskId_status_idx" ON "File"("taskId", "status");

-- CreateIndex
CREATE INDEX "File_uploadedById_idx" ON "File"("uploadedById");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GanttTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
