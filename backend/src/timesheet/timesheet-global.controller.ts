import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TimesheetWeekStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureFlagGuard } from '../auth/guards/feature-flag.guard';
import { RequireFeature } from '../auth/decorators/require-feature.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { TimesheetService } from './timesheet.service';
import { GlobalApproveWeekDto } from './dto/global-approve-week.dto';
import { GlobalRejectWeekDto } from './dto/global-reject-week.dto';
import { FeatureKey } from '../common/entitlements';

/**
 * TimesheetGlobalController — endpoints cross-project para a página global
 * `/timesheets`.
 *
 * Não usa `ProjectPermissionGuard` (não há `:id` no path); a validação de
 * permissão é feita no service via `ProjectPermissionsService.can(...)`.
 *
 * Importante (refinamento do utilizador): a área global **NÃO expõe**
 * approve/reject por dia. Aprovação granular exige abrir a vista do projecto.
 */
@Controller('timesheets')
@UseGuards(JwtAuthGuard, FeatureFlagGuard)
@RequireFeature(FeatureKey.TIMESHEET_VIEW)
export class TimesheetGlobalController {
  constructor(private readonly service: TimesheetService) {}

  @Get('my')
  getMy(
    @CurrentUser() user: JwtPayload,
    @Query('weekStart') weekStart?: string,
    @Query('projectId') projectPublicId?: string,
    @Query('status') status?: TimesheetWeekStatus,
  ) {
    return this.service.globalGetMy(user.sub, { weekStart, projectPublicId, status });
  }

  @Get('pending-approvals')
  getPendingApprovals(
    @CurrentUser() user: JwtPayload,
    @Query('weekStart') weekStart?: string,
    @Query('projectId') projectPublicId?: string,
    @Query('userId') userPublicId?: string,
    @Query('status') status?: TimesheetWeekStatus,
  ) {
    return this.service.globalGetPendingApprovals(user, { weekStart, projectPublicId, userPublicId, status });
  }

  @Get('has-approval-access')
  hasApprovalAccess(@CurrentUser() user: JwtPayload) {
    return this.service.globalHasApprovalAccess(user);
  }

  @Post('approvals/week')
  approveWeek(@CurrentUser() user: JwtPayload, @Body() dto: GlobalApproveWeekDto) {
    return this.service.globalApproveWeek(user, dto);
  }

  @Post('rejections/week')
  rejectWeek(@CurrentUser() user: JwtPayload, @Body() dto: GlobalRejectWeekDto) {
    return this.service.globalRejectWeek(user, dto);
  }
}
