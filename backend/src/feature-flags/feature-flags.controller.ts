import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfilesGuard } from '../auth/guards/profiles.guard';
import { RequireProfiles } from '../auth/decorators/require-profiles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { FeatureFlagsService } from './feature-flags.service';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { SetUserOverrideDto } from './dto/set-user-override.dto';

@Controller('feature-flags')
@UseGuards(JwtAuthGuard)
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  // ── Admin CRUD ──────────────────────────────────────────────────────────

  @Get()
  @UseGuards(ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  findAll() {
    return this.featureFlagsService.findAll();
  }

  @Post()
  @UseGuards(ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  create(@Body() dto: CreateFeatureFlagDto) {
    return this.featureFlagsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  update(@Param('id', ParseUUIDPipe) publicId: string, @Body() dto: UpdateFeatureFlagDto) {
    return this.featureFlagsService.update(publicId, dto);
  }

  @Delete(':id')
  @UseGuards(ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  remove(@Param('id', ParseUUIDPipe) publicId: string) {
    return this.featureFlagsService.remove(publicId);
  }

  // ── User Overrides (admin) ──────────────────────────────────────────────

  @Post('user-override')
  @UseGuards(ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  setUserOverride(@Body() dto: SetUserOverrideDto) {
    return this.featureFlagsService.setUserOverride(dto);
  }

  @Delete('user-override/:id')
  @UseGuards(ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  removeUserOverride(@Param('id', ParseUUIDPipe) publicId: string) {
    return this.featureFlagsService.removeUserOverride(publicId);
  }

  // ── User-facing (any authenticated user) ────────────────────────────────

  @Get('my-flags')
  getMyFlags(@CurrentUser() user: JwtPayload) {
    return this.featureFlagsService.getResolvedFlags(user.sub);
  }

  @Get('check/:key')
  async checkFlag(
    @Param('key') key: string,
    @CurrentUser() user: JwtPayload,
    @Query('projectId') projectPublicId?: string,
  ) {
    const enabled = await this.featureFlagsService.isEnabled(user.sub, key, {
      projectPublicId: projectPublicId ?? null,
    });
    return { key, enabled };
  }
}
