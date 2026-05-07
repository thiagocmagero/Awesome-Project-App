-- Phase 2 — Backfill workspace + subscription from existing data
-- Safe to re-run: ON CONFLICT DO NOTHING on both inserts.
-- ProjectMember(INVITED) rows are intentionally NOT migrated — they remain
-- valid via the legacy invitation flow until cutover (Phase 6).

-- 1) One Subscription per active UserPlan
INSERT INTO "Subscription" (
  "publicId", "userId", "planId",
  "status", "billingCycle",
  "currentPeriodStart", "currentPeriodEnd", "trialEndsAt",
  "cancelAtPeriodEnd", "canceledAt",
  "extraSeats",
  "stripeCustomerId", "stripeSubscriptionId", "stripeExtraSeatItemId", "stripeStatus",
  "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  up."userId",
  up."planId",
  'ACTIVE'::"SubscriptionStatus",
  'MONTHLY'::"BillingCycle",
  up."assignedAt",
  COALESCE(up."expiresAt", NOW() + INTERVAL '100 years'),
  NULL,
  false,
  NULL,
  0,
  NULL, NULL, NULL, NULL,
  NOW(),
  NOW()
FROM "UserPlan" up
WHERE up."isActive" = true
ON CONFLICT ("userId") DO NOTHING;

-- 2) WorkspaceMember from accepted ProjectMember
--    Skip self-ownership (member is the project owner)
--    Skip projects without owner (defensive)
--    DISTINCT ON dedupes when same user is in multiple projects of same owner
INSERT INTO "WorkspaceMember" (
  "publicId", "ownerId", "userId", "email", "name",
  "memberType", "status", "invitedById",
  "acceptedAt", "declinedAt",
  "createdAt", "updatedAt"
)
SELECT DISTINCT ON (p."ownerId", pm.email)
  gen_random_uuid()::text,
  p."ownerId",
  pm."userId",
  pm.email,
  pm.name,
  'BASIC'::"WorkspaceMemberType",
  'ACCEPTED'::"WorkspaceMemberStatus",
  pm."invitedById",
  pm."updatedAt",
  NULL,
  NOW(),
  NOW()
FROM "ProjectMember" pm
INNER JOIN "Project" p ON p.id = pm."projectId"
WHERE pm.status = 'ACCEPTED'
  AND pm."userId" IS NOT NULL
  AND p."ownerId" IS NOT NULL
  AND p."ownerId" != pm."userId"
ORDER BY p."ownerId", pm.email, pm."updatedAt" DESC
ON CONFLICT ("ownerId", "email") DO NOTHING;
