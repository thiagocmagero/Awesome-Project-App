import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, type StrategyOptions } from 'passport-jwt';
import type { Request } from 'express';
import { SessionsService } from './sessions.service';

export type JwtPayload = {
  sub: number;
  email: string;
  profileCode: string;
  /** Session.publicId — obrigatório em tokens emitidos após B3 (multi-sessão) */
  sid?: string;
};

function cookieExtractor(req: Request & { cookies?: Record<string, string> }): string | null {
  if (req.cookies && typeof req.cookies.access_token === 'string') {
    return req.cookies.access_token;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly sessions: SessionsService,
  ) {
    const secret = configService.getOrThrow<string>('JWT_SECRET');

    const options: StrategyOptions = {
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        // Fallback: aceita Bearer durante a transição B7 (tokens legacy)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    };

    super(options);
  }

  async validate(payload: JwtPayload): Promise<JwtPayload & { internalSessionId: number }> {
    // Legacy tokens sem `sid` (antes de B3) ainda passam — sem session lookup.
    // Serão eliminados naturalmente quando B7 remover os Bearer do frontend.
    if (!payload.sid) {
      return { ...payload, internalSessionId: 0 };
    }

    const session = await this.sessions.findActiveByPublicId(payload.sid);
    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('SESSION_INVALID');
    }
    return { ...payload, internalSessionId: session.id };
  }
}
