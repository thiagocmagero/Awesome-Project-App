-- CreateEnum
CREATE TYPE "GanttConfigScope" AS ENUM ('GLOBAL', 'USER', 'PROJECT');

-- DropForeignKey
ALTER TABLE "GanttResource" DROP CONSTRAINT "GanttResource_userTypeId_fkey";

-- DropIndex
DROP INDEX "GanttResourceNode_projectId_idx";

-- AlterTable
ALTER TABLE "GanttResourceNode" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "GanttConfig" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "scope" "GanttConfigScope" NOT NULL,
    "userId" INTEGER,
    "projectId" INTEGER,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GanttConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GanttConfig_publicId_key" ON "GanttConfig"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "GanttConfig_scope_userId_projectId_key" ON "GanttConfig"("scope", "userId", "projectId");

-- AddForeignKey
ALTER TABLE "GanttResource" ADD CONSTRAINT "GanttResource_userTypeId_fkey" FOREIGN KEY ("userTypeId") REFERENCES "UserType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GanttConfig" ADD CONSTRAINT "GanttConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GanttConfig" ADD CONSTRAINT "GanttConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
