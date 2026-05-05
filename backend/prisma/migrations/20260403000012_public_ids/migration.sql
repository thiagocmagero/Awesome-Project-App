-- AddPublicId to all models (UUID v7)
-- Step 1: Add column as nullable
-- Step 2: Populate existing rows with gen_random_uuid()
-- Step 3: Set NOT NULL
-- Step 4: Create unique index

-- Profile
ALTER TABLE "Profile" ADD COLUMN "publicId" TEXT;
UPDATE "Profile" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "Profile" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "Profile_publicId_key" ON "Profile"("publicId");

-- UserType
ALTER TABLE "UserType" ADD COLUMN "publicId" TEXT;
UPDATE "UserType" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "UserType" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "UserType_publicId_key" ON "UserType"("publicId");

-- UserLevel
ALTER TABLE "UserLevel" ADD COLUMN "publicId" TEXT;
UPDATE "UserLevel" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "UserLevel" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "UserLevel_publicId_key" ON "UserLevel"("publicId");

-- User
ALTER TABLE "User" ADD COLUMN "publicId" TEXT;
UPDATE "User" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");

-- Team
ALTER TABLE "Team" ADD COLUMN "publicId" TEXT;
UPDATE "Team" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "Team" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "Team_publicId_key" ON "Team"("publicId");

-- TeamMember
ALTER TABLE "TeamMember" ADD COLUMN "publicId" TEXT;
UPDATE "TeamMember" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "TeamMember" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "TeamMember_publicId_key" ON "TeamMember"("publicId");

-- Project
ALTER TABLE "Project" ADD COLUMN "publicId" TEXT;
UPDATE "Project" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "Project" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "Project_publicId_key" ON "Project"("publicId");

-- ProjectMember
ALTER TABLE "ProjectMember" ADD COLUMN "publicId" TEXT;
UPDATE "ProjectMember" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "ProjectMember" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "ProjectMember_publicId_key" ON "ProjectMember"("publicId");

-- ProjectTeam
ALTER TABLE "ProjectTeam" ADD COLUMN "publicId" TEXT;
UPDATE "ProjectTeam" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "ProjectTeam" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "ProjectTeam_publicId_key" ON "ProjectTeam"("publicId");

-- Plan
ALTER TABLE "Plan" ADD COLUMN "publicId" TEXT;
UPDATE "Plan" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "Plan" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "Plan_publicId_key" ON "Plan"("publicId");

-- PlanLimit
ALTER TABLE "PlanLimit" ADD COLUMN "publicId" TEXT;
UPDATE "PlanLimit" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "PlanLimit" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "PlanLimit_publicId_key" ON "PlanLimit"("publicId");

-- PlanPricing
ALTER TABLE "PlanPricing" ADD COLUMN "publicId" TEXT;
UPDATE "PlanPricing" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "PlanPricing" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "PlanPricing_publicId_key" ON "PlanPricing"("publicId");

-- FeatureFlag
ALTER TABLE "FeatureFlag" ADD COLUMN "publicId" TEXT;
UPDATE "FeatureFlag" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "FeatureFlag" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "FeatureFlag_publicId_key" ON "FeatureFlag"("publicId");

-- PlanFeatureFlag
ALTER TABLE "PlanFeatureFlag" ADD COLUMN "publicId" TEXT;
UPDATE "PlanFeatureFlag" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "PlanFeatureFlag" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "PlanFeatureFlag_publicId_key" ON "PlanFeatureFlag"("publicId");

-- UserFeatureFlag
ALTER TABLE "UserFeatureFlag" ADD COLUMN "publicId" TEXT;
UPDATE "UserFeatureFlag" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "UserFeatureFlag" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "UserFeatureFlag_publicId_key" ON "UserFeatureFlag"("publicId");

-- UserPlan
ALTER TABLE "UserPlan" ADD COLUMN "publicId" TEXT;
UPDATE "UserPlan" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "UserPlan" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "UserPlan_publicId_key" ON "UserPlan"("publicId");

-- UsageRecord
ALTER TABLE "UsageRecord" ADD COLUMN "publicId" TEXT;
UPDATE "UsageRecord" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "UsageRecord" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "UsageRecord_publicId_key" ON "UsageRecord"("publicId");

-- GanttTask
ALTER TABLE "GanttTask" ADD COLUMN "publicId" TEXT;
UPDATE "GanttTask" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "GanttTask" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "GanttTask_publicId_key" ON "GanttTask"("publicId");

-- GanttLink
ALTER TABLE "GanttLink" ADD COLUMN "publicId" TEXT;
UPDATE "GanttLink" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "GanttLink" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "GanttLink_publicId_key" ON "GanttLink"("publicId");

-- GanttResource
ALTER TABLE "GanttResource" ADD COLUMN "publicId" TEXT;
UPDATE "GanttResource" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "GanttResource" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "GanttResource_publicId_key" ON "GanttResource"("publicId");

-- GanttAssignment
ALTER TABLE "GanttAssignment" ADD COLUMN "publicId" TEXT;
UPDATE "GanttAssignment" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "GanttAssignment" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "GanttAssignment_publicId_key" ON "GanttAssignment"("publicId");

-- GanttBaseline
ALTER TABLE "GanttBaseline" ADD COLUMN "publicId" TEXT;
UPDATE "GanttBaseline" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "GanttBaseline" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "GanttBaseline_publicId_key" ON "GanttBaseline"("publicId");

-- ProjectMemberHours
ALTER TABLE "ProjectMemberHours" ADD COLUMN "publicId" TEXT;
UPDATE "ProjectMemberHours" SET "publicId" = gen_random_uuid() WHERE "publicId" IS NULL;
ALTER TABLE "ProjectMemberHours" ALTER COLUMN "publicId" SET NOT NULL;
CREATE UNIQUE INDEX "ProjectMemberHours_publicId_key" ON "ProjectMemberHours"("publicId");
