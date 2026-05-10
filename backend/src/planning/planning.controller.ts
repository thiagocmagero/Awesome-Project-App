import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BlockProfilesGuard } from '../auth/guards/block-profiles.guard';
import { BlockProfiles } from '../auth/decorators/block-profiles.decorator';
import { ProjectPermissionGuard } from '../projects/guards/project-permission.guard';
import { RequireProjectPermission } from '../projects/decorators/require-project-permission.decorator';
import { ProjectAction } from '../projects/project-permissions';
import { PlanningService } from './planning.service';
import { StatesService } from './states/states.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { UpsertMemberHoursDto } from './dto/upsert-member-hours.dto';
import { RecalculateEndDatesDto } from './dto/recalculate-end-dates.dto';
import { MoveTaskStateDto } from './states/dto/move-task-state.dto';
import { JwtPayload } from '../auth/jwt.strategy';

@Controller('projects/:projectId/planning')
@UseGuards(JwtAuthGuard, BlockProfilesGuard, ProjectPermissionGuard)
@BlockProfiles('PLATFORM_ADMIN')
export class PlanningController {
  constructor(
    private readonly planningService: PlanningService,
    private readonly statesService: StatesService,
  ) {}

  // ── Project planning data ─────────────────────────────────────────────────────

  /** Retorna { data: Task[], links: Link[] } — requer PROJECT_VIEW */
  @Get()
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  getProjectData(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.planningService.getProjectData(projectId);
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────────

  /** Recalcula e persiste endDate de todas as tarefas — requer GANTT_CONFIG */
  @Post('tasks/recalculate-end-dates')
  @RequireProjectPermission(ProjectAction.GANTT_CONFIG)
  recalculateEndDates(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: RecalculateEndDatesDto,
  ) {
    return this.planningService.recalculateEndDates(projectId, dto.endDateMode);
  }

  @Post('tasks')
  @RequireProjectPermission(ProjectAction.TASK_CREATE)
  createTask(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateTaskDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.planningService.createTask(projectId, dto, req.user);
  }

  @Put('tasks/:taskId')
  @RequireProjectPermission(ProjectAction.TASK_EDIT)
  updateTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.planningService.updateTask(taskId, dto, req.user);
  }

  @Delete('tasks/:taskId')
  @RequireProjectPermission(ProjectAction.TASK_DELETE)
  deleteTask(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.planningService.deleteTask(taskId);
  }

  /** Muda o estado (coluna do board) de uma tarefa. Usado pelo TaskModal e pelo drag-drop. */
  @Patch('tasks/:taskId/state')
  @RequireProjectPermission(ProjectAction.TASK_EDIT)
  moveTaskState(
    @Param('projectId', ParseUUIDPipe) projectPublicId: string,
    @Param('taskId', ParseUUIDPipe) taskPublicId: string,
    @Body() dto: MoveTaskStateDto,
  ) {
    // `swimlaneId` segue a semântica tri-state: undefined=manter, null=swimlane default, string=swimlane específica.
    return this.statesService.moveCard(projectPublicId, taskPublicId, {
      columnPublicId: dto.stateId ?? null,
      position: dto.position ?? 0,
      ...('swimlaneId' in dto ? { swimlanePublicId: dto.swimlaneId } : {}),
    });
  }

  // ── Links ─────────────────────────────────────────────────────────────────────

  @Post('links')
  @RequireProjectPermission(ProjectAction.LINK_MANAGE)
  createLink(@Body() dto: CreateLinkDto) {
    return this.planningService.createLink(dto);
  }

  @Put('links/:linkId')
  @RequireProjectPermission(ProjectAction.LINK_MANAGE)
  updateLink(
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() dto: UpdateLinkDto,
  ) {
    return this.planningService.updateLink(linkId, dto);
  }

  @Delete('links/:linkId')
  @RequireProjectPermission(ProjectAction.LINK_MANAGE)
  deleteLink(@Param('linkId', ParseUUIDPipe) linkId: string) {
    return this.planningService.deleteLink(linkId);
  }

  // ── Resources ─────────────────────────────────────────────────────────────────

  @Get('resources')
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  getResources(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.planningService.getResources(projectId);
  }

  @Post('resources')
  @RequireProjectPermission(ProjectAction.RESOURCE_MANAGE)
  createResource(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateResourceDto,
  ) {
    return this.planningService.createResource(projectId, dto);
  }

  @Put('resources/:resourceId')
  @RequireProjectPermission(ProjectAction.RESOURCE_MANAGE)
  updateResource(
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: UpdateResourceDto,
  ) {
    return this.planningService.updateResource(resourceId, dto);
  }

  @Delete('resources/:resourceId')
  @RequireProjectPermission(ProjectAction.RESOURCE_MANAGE)
  deleteResource(@Param('resourceId', ParseUUIDPipe) resourceId: string) {
    return this.planningService.deleteResource(resourceId);
  }

  // ── Member Hours ─────────────────────────────────────────────────────────────

  @Get('member-hours')
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  getMemberHours(@Param('projectId', ParseUUIDPipe) projectId: string) {
    return this.planningService.getMemberHours(projectId);
  }

  @Put('member-hours/:userId')
  @RequireProjectPermission(ProjectAction.MEMBER_HOURS_MANAGE)
  upsertMemberHours(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpsertMemberHoursDto,
  ) {
    return this.planningService.upsertMemberHours(projectId, userId, dto.hoursPerDay);
  }
}
