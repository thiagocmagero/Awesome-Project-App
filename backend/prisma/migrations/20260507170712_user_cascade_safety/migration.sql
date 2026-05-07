-- DropForeignKey
ALTER TABLE "Comment" DROP CONSTRAINT "Comment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "CommentMention" DROP CONSTRAINT "CommentMention_userId_fkey";

-- DropForeignKey
ALTER TABLE "CommentReaction" DROP CONSTRAINT "CommentReaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectMember" DROP CONSTRAINT "ProjectMember_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "ProjectMember" DROP CONSTRAINT "ProjectMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectPermissionGrant" DROP CONSTRAINT "ProjectPermissionGrant_grantedById_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_teamId_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_userId_fkey";

-- DropForeignKey
ALTER TABLE "TimesheetApprovalLog" DROP CONSTRAINT "TimesheetApprovalLog_actorId_fkey";

-- DropForeignKey
ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_invitedById_fkey";

-- DropForeignKey
ALTER TABLE "WorkspaceMember" DROP CONSTRAINT "WorkspaceMember_userId_fkey";

-- AlterTable
ALTER TABLE "Comment" ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProjectMember" ALTER COLUMN "invitedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProjectPermissionGrant" ALTER COLUMN "grantedById" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TimesheetApprovalLog" ALTER COLUMN "actorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WorkspaceMember" ALTER COLUMN "invitedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPermissionGrant" ADD CONSTRAINT "ProjectPermissionGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentMention" ADD CONSTRAINT "CommentMention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentReaction" ADD CONSTRAINT "CommentReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimesheetApprovalLog" ADD CONSTRAINT "TimesheetApprovalLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

