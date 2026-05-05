import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { AppException } from '../common/exceptions/app.exception';
import { CalendarConfigService } from './calendar-config.service';
import { UpsertCalendarConfigDto } from './dto/upsert-calendar-config.dto';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { RequireProjectPermission } from '../projects/decorators/require-project-permission.decorator';
import { ProjectAction } from '../projects/project-permissions';

function assertAdmin(user: JwtPayload) {
  if (user.profileCode !== 'PLATFORM_ADMIN') {
    throw new AppException('FORBIDDEN_ADMIN_ONLY', HttpStatus.FORBIDDEN);
  }
}

@Controller('calendar-config')
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
export class CalendarConfigController {
  constructor(private readonly service: CalendarConfigService) {}

  // ── Resolve ────────────────────────────────────────────────────────────────

  @Get('resolve')
  resolve(@CurrentUser() user: JwtPayload) {
    return this.service.resolve(user.sub);
  }

  @Get('resolve/:projectId')
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  resolveForProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.resolve(user.sub, projectId);
  }

  // ── Global (PLATFORM_ADMIN apenas) ─────────────────────────────────────────

  @Get('global')
  getGlobal(@CurrentUser() user: JwtPayload) {
    assertAdmin(user);
    return this.service.getGlobal();
  }

  @Put('global')
  upsertGlobal(@Body() dto: UpsertCalendarConfigDto, @CurrentUser() user: JwtPayload) {
    assertAdmin(user);
    return this.service.upsertGlobal(dto);
  }

  // ── User ───────────────────────────────────────────────────────────────────

  @Get('user')
  getUser(@CurrentUser() user: JwtPayload) {
    return this.service.getForUser(user.sub);
  }

  @Put('user')
  upsertUser(@Body() dto: UpsertCalendarConfigDto, @CurrentUser() user: JwtPayload) {
    return this.service.upsertUser(user.sub, dto);
  }

  // ── Project ────────────────────────────────────────────────────────────────

  @Get('project/:projectId')
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  getProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getForProject(user.sub, projectId);
  }

  @Put('project/:projectId')
  @RequireProjectPermission(ProjectAction.CALENDAR_CONFIG)
  upsertProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: UpsertCalendarConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upsertProject(user.sub, projectId, dto);
  }
}
