-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'INVITATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'INVITATION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'INVITATION_DECLINED';

-- AlterTable
ALTER TABLE "ProjectMember" ADD COLUMN     "teamId" INTEGER;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
