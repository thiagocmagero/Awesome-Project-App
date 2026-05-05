import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { GanttConfigService } from './gantt-config.service';
import { UpsertGanttConfigDto } from './dto/upsert-gantt-config.dto';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { RequireProjectPermission } from '../projects/decorators/require-project-permission.decorator';
import { ProjectAction } from '../projects/project-permissions';

/** Garante que apenas PLATFORM_ADMIN acede a endpoints globais */
function assertAdmin(user: JwtPayload) {
  if (user.profileCode !== 'PLATFORM_ADMIN') {
    throw new ForbiddenException('Acesso exclusivo a administradores de plataforma.');
  }
}

@Controller('gantt-config')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
export class GanttConfigController {
  constructor(private readonly service: GanttConfigService) {}

  // ── Resolve ──────────────────────────────────────────────────────────────────

  /** Config resolvida USER+GLOBAL para o utilizador */
  @Get('resolve')
  resolve(@CurrentUser() user: JwtPayload) {
    return this.service.resolve(user.sub);
  }

  /** Config resolvida PROJECT+USER+GLOBAL */
  @Get('resolve/:projectId')
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  resolveForProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.resolve(user.sub, projectId);
  }

  // ── Global (PLATFORM_ADMIN) ──────────────────────────────────────────────────

  /** Config GLOBAL raw */
  @Get('global')
  getGlobal(@CurrentUser() user: JwtPayload) {
    assertAdmin(user);
    return this.service.getGlobal();
  }

  /** Upsert GLOBAL */
  @Put('global')
  upsertGlobal(@Body() dto: UpsertGanttConfigDto, @CurrentUser() user: JwtPayload) {
    assertAdmin(user);
    return this.service.upsertGlobal(dto);
  }

  // ── User ─────────────────────────────────────────────────────────────────────

  /** Config USER raw do utilizador */
  @Get('user')
  getUser(@CurrentUser() user: JwtPayload) {
    return this.service.getForUser(user.sub);
  }

  /** Upsert USER */
  @Put('user')
  upsertUser(@Body() dto: UpsertGanttConfigDto, @CurrentUser() user: JwtPayload) {
    return this.service.upsertUser(user.sub, dto);
  }

  // ── Project ──────────────────────────────────────────────────────────────────

  /** Config PROJECT raw */
  @Get('project/:projectId')
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  getProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getForProject(user.sub, projectId);
  }

  /** Upsert PROJECT */
  @Put('project/:projectId')
  @RequireProjectPermission(ProjectAction.GANTT_CONFIG)
  upsertProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpsertGanttConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsertProject(user.sub, projectId, dto);
  }
}
