import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfilesGuard } from '../auth/guards/profiles.guard';
import { RequireProfiles } from '../auth/decorators/require-profiles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { UsageService } from './usage.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(
    private readonly usageService: UsageService,
    private readonly prisma: PrismaService,
  ) {}

  /** Resolve user publicId to numeric ID */
  private async resolveUserId(publicId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(`Utilizador '${publicId}' não encontrado.`);
    return user.id;
  }

  @Get('my')
  getMy(@CurrentUser() user: JwtPayload) {
    return this.usageService.getUsageSummary(user.sub);
  }

  @Get('users/:userId')
  @UseGuards(ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  async getUserUsage(@Param('userId', ParseUUIDPipe) userPublicId: string) {
    const userId = await this.resolveUserId(userPublicId);
    return this.usageService.getUsageSummary(userId);
  }
}
