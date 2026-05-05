-- CreateEnum
CREATE TYPE "BoardColumnType" AS ENUM ('INITIAL', 'INTERMEDIATE', 'FINAL');

-- CreateEnum
CREATE TYPE "BoardConfigScope" AS ENUM ('GLOBAL', 'USER', 'PROJECT');

-- AlterTable
ALTER TABLE "GanttTask" ADD COLUMN     "boardColumnId" INTEGER,
ADD COLUMN     "boardPosition" INTEGER;

-- CreateTable
CREATE TABLE "BoardColumn" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "label" TEXT,
    "systemKey" TEXT,
    "type" "BoardColumnType" NOT NULL DEFAULT 'INTERMEDIATE',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "wipLimit" INTEGER,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardCardAssignee" (
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "BoardConfig" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "scope" "BoardConfigScope" NOT NULL,
    "userId" INTEGER,
    "projectId" INTEGER,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoardColumn_publicId_key" ON "BoardColumn"("publicId");

-- CreateIndex
CREATE INDEX "BoardColumn_projectId_position_idx" ON "BoardColumn"("projectId", "position");

-- CreateIndex
CREATE INDEX "BoardCardAssignee_taskId_idx" ON "BoardCardAssignee"("taskId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardCardAssignee_taskId_userId_key" ON "BoardCardAssignee"("taskId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardConfig_publicId_key" ON "BoardConfig"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "BoardConfig_scope_userId_projectId_key" ON "BoardConfig"("scope", "userId", "projectId");

-- AddForeignKey
ALTER TABLE "GanttTask" ADD CONSTRAINT "GanttTask_boardColumnId_fkey" FOREIGN KEY ("boardColumnId") REFERENCES "BoardColumn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardColumn" ADD CONSTRAINT "BoardColumn_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardCardAssignee" ADD CONSTRAINT "BoardCardAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "GanttTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardCardAssignee" ADD CONSTRAINT "BoardCardAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardConfig" ADD CONSTRAINT "BoardConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardConfig" ADD CONSTRAINT "BoardConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
