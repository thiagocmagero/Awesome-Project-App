import {
  Body, Controller, Get, Param, ParseEnumPipe, ParseIntPipe, Put,
  Patch, Query, Req, UseGuards,
} from '@nestjs/common';
import { NotificationChannel, NotificationType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { MarkReadDto } from './dto/mark-read.dto';
import { UpsertPreferenceDto } from './dto/upsert-preference.dto';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ─── Notification list (paginated) ──────────────────────────────────────────

  @Get()
  findAll(
    @Req() req: { user: JwtPayload },
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.notificationsService.findAllForUser(req.user.sub, cursor, limit);
  }

  // ─── Unread count ────────────────────────────────────────────────────────────

  @Get('unread-count')
  async getUnreadCount(@Req() req: { user: JwtPayload }) {
    const count = await this.notificationsService.getUnreadCount(req.user.sub);
    return { count };
  }

  // ─── Mark read ───────────────────────────────────────────────────────────────

  @Patch('mark-read')
  async markRead(@Req() req: { user: JwtPayload }, @Body() dto: MarkReadDto) {
    const userId = req.user.sub;
    if (dto.publicIds && dto.publicIds.length > 0) {
      await this.notificationsService.markAsRead(userId, dto.publicIds);
    } else {
      await this.notificationsService.markAllAsRead(userId);
    }
    return { ok: true };
  }

  // ─── Preferences ─────────────────────────────────────────────────────────────

  @Get('preferences')
  findPreferences(@Req() req: { user: JwtPayload }) {
    return this.notificationsService.findPreferences(req.user.sub);
  }

  @Put('preferences/:type/:channel')
  async upsertPreference(
    @Req() req: { user: JwtPayload },
    @Param('type', new ParseEnumPipe(NotificationType)) type: NotificationType,
    @Param('channel', new ParseEnumPipe(NotificationChannel)) channel: NotificationChannel,
    @Body() dto: UpsertPreferenceDto,
  ) {
    await this.notificationsService.upsertPreference(req.user.sub, type, channel, dto.enabled);
    return { ok: true };
  }
}
