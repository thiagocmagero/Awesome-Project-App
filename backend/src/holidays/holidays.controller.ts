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

@Controller('holidays')
@UseGuards(JwtAuthGuard)
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  private ctx(user: JwtPayload) {
    return { userId: user.sub, isAdmin: user.profileCode === 'PLATFORM_ADMIN' };
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.holidaysService.findAll(this.ctx(user));
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.holidaysService.findOne(publicId, this.ctx(user));
  }

  @Post()
  @UseGuards(FeatureFlagGuard, PlanLimitGuard)
  @RequireFeature(FeatureKey.MULTI_HOLIDAY)
  @CheckPlanLimit(LimitKey.MAX_HOLIDAYS)
  create(
    @Body() dto: CreateHolidayDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.holidaysService.create(dto, this.ctx(user));
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() dto: UpdateHolidayDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.holidaysService.update(publicId, dto, this.ctx(user));
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.holidaysService.remove(publicId, this.ctx(user));
  }

  @Post(':id/dates')
  addDate(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() dto: CreateHolidayDateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.holidaysService.addDate(publicId, dto, this.ctx(user));
  }

  @Patch(':id/dates/:dateId')
  updateDate(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('dateId', ParseUUIDPipe) datePublicId: string,
    @Body() dto: UpdateHolidayDateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.holidaysService.updateDate(publicId, datePublicId, dto, this.ctx(user));
  }

  @Delete(':id/dates/:dateId')
  removeDate(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('dateId', ParseUUIDPipe) datePublicId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.holidaysService.removeDate(publicId, datePublicId, this.ctx(user));
  }
}
