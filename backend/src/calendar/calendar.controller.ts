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
import { BlockProfilesGuard } from '../auth/guards/block-profiles.guard';
import { BlockProfiles } from '../auth/decorators/block-profiles.decorator';
import { FeatureFlagGuard } from '../auth/guards/feature-flag.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { RequireProjectPermission } from '../projects/decorators/require-project-permission.decorator';
import { ProjectAction } from '../projects/project-permissions';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateEventTypeDto } from './dto/create-event-type.dto';
import { UpdateEventTypeDto } from './dto/update-event-type.dto';
import { ReorderEventTypesDto } from './dto/reorder-event-types.dto';
import { FeatureKey } from '../common/entitlements';

/**
 * CalendarController — vista de calendário por projecto.
 *
 * Sources read-only (tasks, milestones, holidays, project) são incluídos no payload
 * de GET /calendar para o frontend renderizar como `eventSources` do FullCalendar.
 * CRUD escreve apenas em CalendarEvent / CalendarEventType.
 */
@Controller('projects/:id/calendar')
@UseGuards(JwtAuthGuard, BlockProfilesGuard, FeatureFlagGuard, ProjectPermissionGuard)
@BlockProfiles('PLATFORM_ADMIN')
@RequireFeature(FeatureKey.CALENDAR_VIEW)
export class CalendarController {
  constructor(private readonly service: CalendarService) {}

  // ── Bundle agregado ────────────────────────────────────────────────────────

  @Get()
  @RequireProjectPermission(ProjectAction.CALENDAR_VIEW)
  getCalendar(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getCalendar(projectPublicId, user.sub);
  }

  @Get('members')
  @RequireProjectPermission(ProjectAction.CALENDAR_VIEW)
  getMembers(@Param('id', ParseUUIDPipe) projectPublicId: string) {
    return this.service.getMembers(projectPublicId);
  }

  // ── Event types ────────────────────────────────────────────────────────────

  @Get('event-types')
  @RequireProjectPermission(ProjectAction.CALENDAR_VIEW)
  listEventTypes(@Param('id', ParseUUIDPipe) projectPublicId: string) {
    return this.service.listEventTypes(projectPublicId);
  }

  @Post('event-types')
  @RequireProjectPermission(ProjectAction.CALENDAR_EVENT_TYPE_MANAGE)
  createEventType(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Body() dto: CreateEventTypeDto,
  ) {
    return this.service.createEventType(projectPublicId, dto);
  }

  @Patch('event-types/reorder')
  @RequireProjectPermission(ProjectAction.CALENDAR_EVENT_TYPE_MANAGE)
  reorderEventTypes(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Body() dto: ReorderEventTypesDto,
  ) {
    return this.service.reorderEventTypes(projectPublicId, dto);
  }

  @Patch('event-types/:typeId')
  @RequireProjectPermission(ProjectAction.CALENDAR_EVENT_TYPE_MANAGE)
  updateEventType(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('typeId', ParseUUIDPipe) typePublicId: string,
    @Body() dto: UpdateEventTypeDto,
  ) {
    return this.service.updateEventType(projectPublicId, typePublicId, dto);
  }

  @Delete('event-types/:typeId')
  @RequireProjectPermission(ProjectAction.CALENDAR_EVENT_TYPE_MANAGE)
  deleteEventType(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('typeId', ParseUUIDPipe) typePublicId: string,
  ) {
    return this.service.deleteEventType(projectPublicId, typePublicId);
  }

  // ── Events ─────────────────────────────────────────────────────────────────

  @Post('events')
  @RequireProjectPermission(ProjectAction.CALENDAR_EVENT_CREATE)
  createEvent(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateEventDto,
  ) {
    return this.service.createEvent(projectPublicId, user.sub, dto);
  }

  @Patch('events/:eventId')
  @RequireProjectPermission(ProjectAction.CALENDAR_EVENT_EDIT)
  updateEvent(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('eventId', ParseUUIDPipe) eventPublicId: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.service.updateEvent(projectPublicId, eventPublicId, dto);
  }

  @Delete('events/:eventId')
  @RequireProjectPermission(ProjectAction.CALENDAR_EVENT_DELETE)
  deleteEvent(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('eventId', ParseUUIDPipe) eventPublicId: string,
  ) {
    return this.service.deleteEvent(projectPublicId, eventPublicId);
  }
}
