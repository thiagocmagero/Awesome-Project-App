-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'CONTRIBUTOR', 'READER');

-- AlterTable: ProjectMember.role String → ProjectRole enum
-- Step 1: add new column with enum type
ALTER TABLE "ProjectMember" ADD COLUMN "role_new" "ProjectRole" NOT NULL DEFAULT 'READER';

-- Step 2: migrate existing data
UPDATE "ProjectMember" SET "role_new" = CASE
  WHEN "role" = 'CONTRIBUTOR' THEN 'CONTRIBUTOR'::"ProjectRole"
  WHEN "role" = 'OWNER' THEN 'OWNER'::"ProjectRole"
  ELSE 'READER'::"ProjectRole"
END;

-- Step 3: drop old column, rename new
ALTER TABLE "ProjectMember" DROP COLUMN "role";
ALTER TABLE "ProjectMember" RENAME COLUMN "role_new" TO "role";

-- CreateTable
CREATE TABLE "ProjectPermissionGrant" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "grantedToRole" "ProjectRole",
    "grantedToUserId" INTEGER,
    "action" TEXT NOT NULL,
    "grantedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectPermissionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectPermissionGrant_publicId_key" ON "ProjectPermissionGrant"("publicId");
CREATE INDEX "ProjectPermissionGrant_projectId_idx" ON "ProjectPermissionGrant"("projectId");
CREATE UNIQUE INDEX "uq_grant_role" ON "ProjectPermissionGrant"("projectId", "action", "grantedToRole");
CREATE UNIQUE INDEX "uq_grant_user" ON "ProjectPermissionGrant"("projectId", "action", "grantedToUserId");

-- AddForeignKey
ALTER TABLE "ProjectPermissionGrant" ADD CONSTRAINT "ProjectPermissionGrant_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectPermissionGrant" ADD CONSTRAINT "ProjectPermissionGrant_grantedToUserId_fkey" FOREIGN KEY ("grantedToUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectPermissionGrant" ADD CONSTRAINT "ProjectPermissionGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
