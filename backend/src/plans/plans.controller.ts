import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfilesGuard } from '../auth/guards/profiles.guard';
import { RequireProfiles } from '../auth/decorators/require-profiles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpsertPlanLimitDto } from './dto/upsert-plan-limit.dto';
import { UpsertPlanPricingDto } from './dto/upsert-plan-pricing.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';

@Controller('plans')
@UseGuards(JwtAuthGuard, ProfilesGuard)
@RequireProfiles('PLATFORM_ADMIN')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  // ── Plans CRUD ──────────────────────────────────────────────────────────

  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) publicId: string) {
    return this.plansService.findOne(publicId);
  }

  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) publicId: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(publicId, dto);
  }

  // ── Limits ──────────────────────────────────────────────────────────────

  @Post(':id/limits')
  upsertLimit(@Param('id', ParseUUIDPipe) publicId: string, @Body() dto: UpsertPlanLimitDto) {
    return this.plansService.upsertLimit(publicId, dto);
  }

  @Delete(':id/limits/:limitId')
  removeLimit(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('limitId', ParseUUIDPipe) limitPublicId: string,
  ) {
    return this.plansService.removeLimit(publicId, limitPublicId);
  }

  // ── Pricing ─────────────────────────────────────────────────────────────

  @Post(':id/pricing')
  upsertPricing(@Param('id', ParseUUIDPipe) publicId: string, @Body() dto: UpsertPlanPricingDto) {
    return this.plansService.upsertPricing(publicId, dto);
  }

  @Delete(':id/pricing/:pricingId')
  removePricing(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('pricingId', ParseUUIDPipe) pricingPublicId: string,
  ) {
    return this.plansService.removePricing(publicId, pricingPublicId);
  }

  // ── Feature Flags ───────────────────────────────────────────────────────

  @Post(':id/feature-flags')
  addFeatureFlag(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() body: { featureFlagId: string; enabled: boolean },
  ) {
    return this.plansService.addFeatureFlag(publicId, body.featureFlagId, body.enabled ?? true);
  }

  @Patch(':id/feature-flags/:pfId')
  updateFeatureFlag(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('pfId', ParseUUIDPipe) pfPublicId: string,
    @Body() body: { enabled: boolean },
  ) {
    return this.plansService.updateFeatureFlag(publicId, pfPublicId, body.enabled);
  }

  @Delete(':id/feature-flags/:pfId')
  removeFeatureFlag(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Param('pfId', ParseUUIDPipe) pfPublicId: string,
  ) {
    return this.plansService.removeFeatureFlag(publicId, pfPublicId);
  }

  // ── Assignment ──────────────────────────────────────────────────────────

  @Post('assign')
  assign(@Body() dto: AssignPlanDto, @CurrentUser() user: JwtPayload) {
    return this.plansService.assign(dto, user.sub);
  }

  @Get('users/:userId/history')
  getUserPlanHistory(@Param('userId', ParseUUIDPipe) userPublicId: string) {
    return this.plansService.getUserPlanHistory(userPublicId);
  }
}
