-- Phase 3: Projects
-- Creates Project and ProjectTeam tables.
-- Adds ownedProjects / managedProjects FK columns to existing User table.
-- Adds projects relation to Team (no column changes needed — FK is on ProjectTeam).
-- Safe to run on existing data — no destructive changes.

-- CreateTable Project
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "ownerId" INTEGER,
    "managerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProjectTeam
CREATE TABLE "ProjectTeam" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "teamId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique project+team pair
CREATE UNIQUE INDEX "ProjectTeam_projectId_teamId_key" ON "ProjectTeam"("projectId", "teamId");

-- AddForeignKey: Project → User (owner)
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Project → User (manager)
ALTER TABLE "Project" ADD CONSTRAINT "Project_managerId_fkey"
    FOREIGN KEY ("managerId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: ProjectTeam → Project
ALTER TABLE "ProjectTeam" ADD CONSTRAINT "ProjectTeam_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: ProjectTeam → Team
ALTER TABLE "ProjectTeam" ADD CONSTRAINT "ProjectTeam_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
