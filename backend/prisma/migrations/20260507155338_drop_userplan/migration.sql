-- DropForeignKey
ALTER TABLE "UserPlan" DROP CONSTRAINT "UserPlan_assignedById_fkey";

-- DropForeignKey
ALTER TABLE "UserPlan" DROP CONSTRAINT "UserPlan_planId_fkey";

-- DropForeignKey
ALTER TABLE "UserPlan" DROP CONSTRAINT "UserPlan_userId_fkey";

-- DropTable
DROP TABLE "UserPlan";

