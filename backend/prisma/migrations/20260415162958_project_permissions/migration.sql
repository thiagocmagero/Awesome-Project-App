-- RenameIndex
ALTER INDEX "uq_grant_role" RENAME TO "ProjectPermissionGrant_projectId_action_grantedToRole_key";

-- RenameIndex
ALTER INDEX "uq_grant_user" RENAME TO "ProjectPermissionGrant_projectId_action_grantedToUserId_key";
