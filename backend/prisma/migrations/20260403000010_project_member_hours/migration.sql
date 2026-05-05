-- CreateTable
CREATE TABLE "ProjectMemberHours" (
    "id"          SERIAL NOT NULL,
    "projectId"   INTEGER NOT NULL,
    "userId"      INTEGER NOT NULL,
    "hoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectMemberHours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMemberHours_projectId_userId_key" ON "ProjectMemberHours"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "ProjectMemberHours" ADD CONSTRAINT "ProjectMemberHours_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMemberHours" ADD CONSTRAINT "ProjectMemberHours_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
