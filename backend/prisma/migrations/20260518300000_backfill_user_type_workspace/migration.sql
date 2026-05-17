-- Backfill UserType.workspaceId for rows where it is NULL but ownerId is set.
-- Workspace V2 (Mai 2026): types were historically created with workspaceId=NULL
-- but ownerId set; this caused cross-workspace count leakage in user-types
-- delete impact dialog. Resolve workspace via owner's oldest workspace, matching
-- WorkspacesService.getDefaultForUser().
UPDATE "UserType" ut
SET "workspaceId" = (
  SELECT w.id FROM "Workspace" w
  WHERE w."ownerId" = ut."ownerId"
  ORDER BY w."createdAt" ASC
  LIMIT 1
)
WHERE ut."workspaceId" IS NULL AND ut."ownerId" IS NOT NULL;
