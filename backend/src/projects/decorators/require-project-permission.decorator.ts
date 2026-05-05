import { SetMetadata } from '@nestjs/common';
import { ProjectAction } from '../project-permissions';

export const PROJECT_ACTION_KEY = 'projectAction';

/**
 * Marks a route as requiring a specific project-level permission.
 * Must be used together with JwtAuthGuard + ProjectPermissionGuard.
 *
 * The guard extracts `projectId` (or `id`) from route params and checks
 * whether the authenticated user has the specified action on that project.
 *
 * @example
 * @UseGuards(JwtAuthGuard, ProjectPermissionGuard)
 * @RequireProjectPermission(ProjectAction.TASK_CREATE)
 */
export const RequireProjectPermission = (action: ProjectAction) =>
  SetMetadata(PROJECT_ACTION_KEY, action);
