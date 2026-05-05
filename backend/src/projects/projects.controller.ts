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
import { PlanLimitGuard } from '../auth/guards/plan-limit.guard';
import { CheckPlanLimit } from '../auth/decorators/check-plan-limit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { ProjectPermissionGuard } from './guards/project-permission.guard';
import { RequireProjectPermission } from './decorators/require-project-permission.decorator';
import { ProjectAction } from './project-permissions';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddTeamDto } from './dto/add-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { AddHolidayDto } from './dto/add-holiday.dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ── Projects ────────────────────────────────────────────────────────────────

  /** Lista projetos — PLATFORM_ADMIN: todos; BASIC_USER: apenas os seus */
  @Get()
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.projectsService.findAll(currentUser);
  }

  /** Detalhe — validação de ownership no service */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.projectsService.findOne(publicId, currentUser);
  }

  /** Cria projeto — autenticados; ownerId definido no service */
  @Post()
  @UseGuards(PlanLimitGuard)
  @CheckPlanLimit('max_projects')
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.projectsService.create(dto, currentUser);
  }

  /** Atualiza projeto — requer PROJECT_UPDATE */
  @Patch(':id')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.PROJECT_UPDATE)
  update(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.projectsService.update(publicId, dto, currentUser);
  }

  /** Soft delete — requer PROJECT_DELETE */
  @Delete(':id')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.PROJECT_DELETE)
  remove(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.projectsService.remove(publicId, currentUser);
  }

  // ── Team associations ───────────────────────────────────────────────────────

  /** Associa equipa — requer MEMBER_MANAGE_TEAMS */
  @Post(':id/teams')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.MEMBER_MANAGE_TEAMS)
  addTeam(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() dto: AddTeamDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.projectsService.addTeam(publicId, dto, currentUser);
  }

  /** Remove associação — requer MEMBER_MANAGE_TEAMS */
  @Delete(':id/teams/:teamId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.MEMBER_MANAGE_TEAMS)
  removeTeam(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('teamId', ParseUUIDPipe) teamPublicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.projectsService.removeTeam(publicId, teamPublicId, currentUser);
  }

  // ── Project members (invitations) ────────────────────────────────────────────

  /** Lista membros/convites do projeto — requer PROJECT_VIEW */
  @Get(':id/members')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  listMembers(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.projectsService.listMembers(publicId, currentUser);
  }

  /** Convida utilizador por email — requer MEMBER_INVITE */
  @Post(':id/members')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.MEMBER_INVITE)
  inviteMember(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.projectsService.inviteMember(publicId, dto, currentUser);
  }

  /** Atualiza papel do membro — requer MEMBER_CHANGE_ROLE */
  @Patch(':id/members/:memberId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.MEMBER_CHANGE_ROLE)
  updateMember(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('memberId', ParseUUIDPipe) memberPublicId: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.projectsService.updateMember(publicId, memberPublicId, dto, currentUser);
  }

  /** Remove membro do projeto — requer MEMBER_REMOVE */
  @Delete(':id/members/:memberId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.MEMBER_REMOVE)
  removeMember(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('memberId', ParseUUIDPipe) memberPublicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.projectsService.removeMember(publicId, memberPublicId, currentUser);
  }

  // ── Holiday associations ─────────────────────────────────────────────────────

  /** Lista feriados associados ao projeto */
  @Get(':id/holidays')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.PROJECT_VIEW)
  listHolidays(@Param('id', ParseUUIDPipe) publicId: string) {
    return this.projectsService.listProjectHolidays(publicId);
  }

  /** Associa lista de feriados ao projeto — requer HOLIDAY_MANAGE */
  @Post(':id/holidays')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.HOLIDAY_MANAGE)
  addHoliday(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() dto: AddHolidayDto,
  ) {
    return this.projectsService.addHolidayToProject(publicId, dto);
  }

  /** Remove lista de feriados do projeto — requer HOLIDAY_MANAGE */
  @Delete(':id/holidays/:holidayId')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectAction.HOLIDAY_MANAGE)
  removeHoliday(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('holidayId', ParseUUIDPipe) holidayPublicId: string,
  ) {
    return this.projectsService.removeHolidayFromProject(publicId, holidayPublicId);
  }
}
