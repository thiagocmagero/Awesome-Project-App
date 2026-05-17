import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpStatus,
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
import { PlanLimitGuard } from '../auth/guards/plan-limit.guard';
import { CheckPlanLimit } from '../auth/decorators/check-plan-limit.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';
import { CreateHolidayDateDto } from './dto/create-holiday-date.dto';
import { UpdateHolidayDateDto } from './dto/update-holiday-date.dto';
import { FeatureKey, LimitKey } from '../common/entitlements';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { AppException } from '../common/exceptions/app.exception';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('holidays')
@UseGuards(JwtAuthGuard, BlockProfilesGuard)
@BlockProfiles('PLATFORM_ADMIN')
export class HolidaysController {
  constructor(
    private readonly holidaysService: HolidaysService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  /**
   * Resolve `HolCtx` para o request. Workspace activo vem de:
   *   1. Header `X-Workspace-Id` (publicId UUID) — frontend2 envia via apiFetch.
   *   2. Fallback: workspace default do user (`WorkspacesService.getDefaultForUser`).
   *
   * Para PLATFORM_ADMIN: respeita o header se presente (admin a operar num
   * workspace específico); senão usa o workspace default próprio.
   */
  private async ctx(user: JwtPayload, headerWsId: string | undefined) {
    const isAdmin = user.profileCode === 'PLATFORM_ADMIN';
    const headerNormalized = headerWsId?.trim();

    if (headerNormalized) {
      if (!UUID_RE.test(headerNormalized)) {
        throw new AppException('WORKSPACE_NOT_FOUND', HttpStatus.BAD_REQUEST);
      }
      const ws = await this.workspacesService.findByPublicId(headerNormalized);
      if (!ws) {
        throw new AppException('WORKSPACE_NOT_FOUND', HttpStatus.BAD_REQUEST);
      }
      // Admin bypassa assertAccess; non-admin precisa de ser owner ou member ACCEPTED.
      if (!isAdmin) {
        await this.workspacesService.assertAccess(ws.id, user.sub);
      }
      return { userId: user.sub, isAdmin, workspaceId: ws.id };
    }

    const defaultWs = await this.workspacesService.getDefaultForUser(user.sub);
    return { userId: user.sub, isAdmin, workspaceId: defaultWs.id };
  }

  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    return this.holidaysService.findAll(await this.ctx(user, headerWsId));
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    return this.holidaysService.findOne(publicId, await this.ctx(user, headerWsId));
  }

  @Post()
  @UseGuards(FeatureFlagGuard, PlanLimitGuard)
  @RequireFeature(FeatureKey.MULTI_HOLIDAY)
  @CheckPlanLimit(LimitKey.MAX_HOLIDAYS)
  async create(
    @Body() dto: CreateHolidayDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    return this.holidaysService.create(dto, await this.ctx(user, headerWsId));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() dto: UpdateHolidayDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    return this.holidaysService.update(publicId, dto, await this.ctx(user, headerWsId));
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    return this.holidaysService.remove(publicId, await this.ctx(user, headerWsId));
  }

  @Post(':id/dates')
  async addDate(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() dto: CreateHolidayDateDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    return this.holidaysService.addDate(publicId, dto, await this.ctx(user, headerWsId));
  }

  @Patch(':id/dates/:dateId')
  async updateDate(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('dateId', ParseUUIDPipe) datePublicId: string,
    @Body() dto: UpdateHolidayDateDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    return this.holidaysService.updateDate(publicId, datePublicId, dto, await this.ctx(user, headerWsId));
  }

  @Delete(':id/dates/:dateId')
  async removeDate(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('dateId', ParseUUIDPipe) datePublicId: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-workspace-id') headerWsId?: string,
  ) {
    return this.holidaysService.removeDate(publicId, datePublicId, await this.ctx(user, headerWsId));
  }
}
