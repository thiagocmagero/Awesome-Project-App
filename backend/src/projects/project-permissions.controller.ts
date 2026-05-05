import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { ProjectPermissionGuard } from './guards/project-permission.guard';
import { RequireProjectPermission } from './decorators/require-project-permission.decorator';
import { ProjectAction } from './project-permissions';
import { ProjectPermissionsService } from './project-permissions.service';
import { GrantPermissionDto } from './dto/grant-permission.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@Controller('projects/:id')
@UseGuards(JwtAuthGuard)
export class ProjectPermissionsController {
  constructor(private readonly permissionsService: ProjectPermissionsService) {}

  // ── My permissions (any authenticated member) ──────────────────────────────

  /** Returns the list of actions the current user can perform on this project */
  @Get('my-permissions')
  getMyPermissions(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.permissionsService.resolveAll(projectPublicId, user);
  }

  // ── List grants + members (requires PERMISSIONS_MANAGE) ────────────────────

  @Get('permissions')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.PERMISSIONS_MANAGE)
  listGrants(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.permissionsService.listGrants(projectPublicId, user);
  }

  // ── Create grant ───────────────────────────────────────────────────────────

  @Post('permissions/grants')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.PERMISSIONS_MANAGE)
  createGrant(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Body() dto: GrantPermissionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.permissionsService.grantPermission(projectPublicId, dto, user);
  }

  // ── Revoke grant ───────────────────────────────────────────────────────────

  @Delete('permissions/grants/:grantId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.PERMISSIONS_MANAGE)
  revokeGrant(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('grantId', ParseUUIDPipe) grantPublicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.permissionsService.revokeGrant(projectPublicId, grantPublicId, user);
  }

  // ── Update member role ─────────────────────────────────────────────────────

  @Patch('permissions/members/:memberId/role')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.MEMBER_CHANGE_ROLE)
  updateMemberRole(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('memberId', ParseUUIDPipe) memberPublicId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.permissionsService.updateMemberRole(projectPublicId, memberPublicId, dto.role, user);
  }
}
