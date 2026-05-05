import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SessionsService } from './sessions.service';
import type { JwtPayload } from './jwt.strategy';
import { parseDevice, lookupLocation } from './sessions-enrich.util';

type AuthRequest = Request & {
  user: JwtPayload & { internalSessionId: number };
};

@Controller('auth/sessions')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  async list(@Req() req: AuthRequest) {
    const userId = req.user.sub;
    const currentSid = req.user.sid;
    const active = await this.sessions.listActiveForUser(userId);
    return active.map((s) => {
      const ip = s.lastUsedIp ?? s.ip ?? null;
      return {
        publicId: s.publicId,
        isCurrent: s.publicId === currentSid,
        device: parseDevice(s.userAgent),
        location: lookupLocation(ip),
        ip: ip ?? '',
        createdAt: s.createdAt.toISOString(),
        lastUsedAt: s.lastUsedAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
      };
    });
  }

  @Post(':publicId/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@Req() req: AuthRequest, @Param('publicId') publicId: string) {
    const revoked = await this.sessions.revokeSessionByPublicId(
      publicId,
      req.user.sub,
      'REVOKED_BY_USER',
    );
    if (!revoked) throw new NotFoundException('SESSION_NOT_FOUND');
  }

  @Post('revoke-others')
  async revokeOthers(@Req() req: AuthRequest) {
    const count = await this.sessions.revokeOthersForUser(
      req.user.sub,
      req.user.internalSessionId,
      'REVOKED_BY_USER',
    );
    return { revokedCount: count };
  }
}
