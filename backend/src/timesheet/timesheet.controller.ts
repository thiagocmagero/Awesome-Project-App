import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimesheetWeekStatus } from '@prisma/client';
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
import { TimesheetService } from './timesheet.service';
import { UpsertEntryDto } from './dto/upsert-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { DeleteRowDto } from './dto/delete-row.dto';
import { SubmitWeekDto } from './dto/submit-week.dto';
import { ApproveDayDto } from './dto/approve-day.dto';
import { ApproveWeekDto } from './dto/approve-week.dto';
import { ApproveMonthDto } from './dto/approve-month.dto';
import { RejectDayDto } from './dto/reject-day.dto';
import { CopyWeekDto } from './dto/copy-week.dto';
import { FeatureKey } from '../common/entitlements';

/**
 * TimesheetController — endpoints project-scoped do Timesheet.
 *
 * Todas as rotas autenticadas, gated por feature flag `timesheet_view`,
 * com `ProjectPermissionGuard` activado. Permissões granulares via
 * `@RequireProjectPermission`.
 */
@Controller('projects/:id/timesheets')
@UseGuards(JwtAuthGuard, BlockProfilesGuard, FeatureFlagGuard, ProjectPermissionGuard)
@BlockProfiles('PLATFORM_ADMIN')
@RequireFeature(FeatureKey.TIMESHEET_VIEW)
export class TimesheetController {
  constructor(private readonly service: TimesheetService) {}

  // ── Bundle da semana ───────────────────────────────────────────────────────

  @Get('week')
  @RequireProjectPermission(ProjectAction.TIMESHEET_LOG)
  getWeek(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Query('weekStart') weekStart: string,
    @Query('userId') userPublicId?: string,
  ) {
    return this.service.getWeek(projectPublicId, user, weekStart, userPublicId);
  }

  // ── Mutações de entries (próprias) ─────────────────────────────────────────

  @Post('entries')
  @RequireProjectPermission(ProjectAction.TIMESHEET_LOG)
  upsertEntry(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertEntryDto,
  ) {
    return this.service.upsertEntry(projectPublicId, user.sub, dto);
  }

  @Patch('entries/:entryId')
  @RequireProjectPermission(ProjectAction.TIMESHEET_LOG)
  updateEntry(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('entryId', ParseUUIDPipe) entryPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateEntryDto,
  ) {
    return this.service.updateEntry(projectPublicId, user.sub, entryPublicId, dto);
  }

  @Delete('entries/:entryId')
  @RequireProjectPermission(ProjectAction.TIMESHEET_LOG)
  deleteEntry(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Param('entryId', ParseUUIDPipe) entryPublicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.deleteEntry(projectPublicId, user.sub, entryPublicId);
  }

  @Delete('rows')
  @RequireProjectPermission(ProjectAction.TIMESHEET_LOG)
  deleteRow(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: DeleteRowDto,
  ) {
    return this.service.deleteRow(projectPublicId, user.sub, dto);
  }

  // ── Submissão & cópia ──────────────────────────────────────────────────────

  @Post('submit')
  @RequireProjectPermission(ProjectAction.TIMESHEET_LOG)
  submitWeek(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitWeekDto,
  ) {
    return this.service.submitWeek(projectPublicId, user, dto);
  }

  /**
   * "Editar semana" — utilizador reverte os próprios dias SUBMITTED para DRAFT
   * **enquanto a semana ainda não foi aprovada/rejeitada**. Não é possível
   * editar dias APPROVED ou REJECTED — esses ficam imutáveis para o autor.
   * Cria audit log com action=REVERT, scope=WEEK. Não dispara notificações.
   */
  @Post('unsubmit')
  @RequireProjectPermission(ProjectAction.TIMESHEET_LOG)
  unsubmitWeek(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitWeekDto,
  ) {
    return this.service.unsubmitWeek(projectPublicId, user, dto);
  }

  @Post('copy-week')
  @RequireProjectPermission(ProjectAction.TIMESHEET_LOG)
  copyWeek(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CopyWeekDto,
  ) {
    return this.service.copyWeek(projectPublicId, user.sub, dto);
  }

  // ── Aprovação (gestor) ─────────────────────────────────────────────────────

  @Get('team')
  @RequireProjectPermission(ProjectAction.TIMESHEET_APPROVE)
  getTeam(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Query('weekStart') weekStart: string,
    @Query('status') status?: TimesheetWeekStatus,
  ) {
    return this.service.getTeam(projectPublicId, weekStart, status);
  }

  /**
   * Vista mensal — agregado da equipa (X/Y por dia) ou individual (✓/✗ por dia).
   * Macro-overview do gestor (Abril 2026).
   */
  @Get('calendar')
  @RequireProjectPermission(ProjectAction.TIMESHEET_APPROVE)
  getMonthCalendar(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @Query('month') month: string,                 // 'YYYY-MM'
    @Query('userId') userPublicId?: string,
  ) {
    return this.service.getMonthCalendar(projectPublicId, month, userPublicId);
  }

  @Post('approvals/day')
  @RequireProjectPermission(ProjectAction.TIMESHEET_APPROVE)
  approveDay(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApproveDayDto,
  ) {
    return this.service.approveDay(projectPublicId, user, dto);
  }

  @Post('approvals/week')
  @RequireProjectPermission(ProjectAction.TIMESHEET_APPROVE)
  approveWeek(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApproveWeekDto,
  ) {
    return this.service.approveWeek(projectPublicId, user, dto);
  }

  @Post('approvals/month')
  @RequireProjectPermission(ProjectAction.TIMESHEET_APPROVE)
  approveMonth(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApproveMonthDto,
  ) {
    return this.service.approveMonth(projectPublicId, user, dto);
  }

  @Post('rejections/day')
  @RequireProjectPermission(ProjectAction.TIMESHEET_APPROVE)
  rejectDay(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: RejectDayDto,
  ) {
    return this.service.rejectDay(projectPublicId, user, dto);
  }

  /**
   * "Editar aprovação/rejeição da semana" — reverte days APPROVED/REJECTED
   * de volta para SUBMITTED. Gestor pode então re-aprovar/re-rejeitar.
   */
  @Post('revert/week')
  @RequireProjectPermission(ProjectAction.TIMESHEET_APPROVE)
  revertWeek(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApproveWeekDto,
  ) {
    return this.service.revertWeek(projectPublicId, user, dto);
  }

  @Post('revert/month')
  @RequireProjectPermission(ProjectAction.TIMESHEET_APPROVE)
  revertMonth(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: ApproveMonthDto,
  ) {
    return this.service.revertMonth(projectPublicId, user, dto);
  }

  // ── Audit log ──────────────────────────────────────────────────────────────

  @Get('log')
  @RequireProjectPermission(ProjectAction.TIMESHEET_LOG)
  getLog(
    @Param('id', ParseUUIDPipe) projectPublicId: string,
    @CurrentUser() user: JwtPayload,
    @Query('userId') userPublicId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getLog(projectPublicId, user, userPublicId, from, to);
  }
}
