-- AlterTable
ALTER TABLE "GanttTask" ADD COLUMN     "boardSwimlaneId" INTEGER;

-- CreateTable
CREATE TABLE "BoardSwimlane" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "color" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardSwimlane_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardSwimlaneUserState" (
    "swimlaneId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardSwimlaneUserState_pkey" PRIMARY KEY ("swimlaneId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "BoardSwimlane_publicId_key" ON "BoardSwimlane"("publicId");

-- CreateIndex
CREATE INDEX "BoardSwimlane_projectId_position_idx" ON "BoardSwimlane"("projectId", "position");

-- CreateIndex
CREATE INDEX "BoardSwimlaneUserState_userId_idx" ON "BoardSwimlaneUserState"("userId");

-- AddForeignKey
ALTER TABLE "GanttTask" ADD CONSTRAINT "GanttTask_boardSwimlaneId_fkey" FOREIGN KEY ("boardSwimlaneId") REFERENCES "BoardSwimlane"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardSwimlane" ADD CONSTRAINT "BoardSwimlane_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardSwimlaneUserState" ADD CONSTRAINT "BoardSwimlaneUserState_swimlaneId_fkey" FOREIGN KEY ("swimlaneId") REFERENCES "BoardSwimlane"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardSwimlaneUserState" ADD CONSTRAINT "BoardSwimlaneUserState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
