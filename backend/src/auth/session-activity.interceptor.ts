import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { SessionsService } from './sessions.service';
import type { JwtPayload } from './jwt.strategy';

type AuthRequest = Request & {
  user?: JwtPayload & { internalSessionId?: number };
};

/**
 * Actualiza `lastUsedAt`/`lastUsedIp` da sessão actual após cada request autenticado.
 * Interno: throttled a 1×/60s por sessão via SessionsService.touchSession.
 */
@Injectable()
export class SessionActivityInterceptor implements NestInterceptor {
  constructor(private readonly sessions: SessionsService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    return next.handle().pipe(
      tap(() => {
        const iid = req.user?.internalSessionId;
        if (!iid || iid <= 0) return;
        this.sessions.touchSession(iid, req.ip);
      }),
    );
  }
}
