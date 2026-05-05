import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { csrfEquals, isMutatingMethod } from './csrf.util';
import { SKIP_CSRF_KEY } from './skip-csrf.decorator';

/**
 * Double-submit cookie CSRF guard.
 *   - GET/HEAD/OPTIONS → passa
 *   - Rotas com @SkipCsrf() → passa
 *   - Outras: valida cookie `csrf_token` === header `X-CSRF-Token` (timing-safe)
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { cookies?: Record<string, string> }>();

    if (!isMutatingMethod(req.method)) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (skip) return true;

    const cookie = req.cookies?.csrf_token;

    // Transição: se não há cookie CSRF, o user está autenticado via Bearer legacy
    // (pré-B3). CSRF não se aplica a auth explícito por header. Será removido em B7.
    if (!cookie) return true;

    const headerRaw = req.headers['x-csrf-token'];
    const header = typeof headerRaw === 'string'
      ? headerRaw
      : Array.isArray(headerRaw) ? headerRaw[0] : '';

    if (!header || !csrfEquals(cookie, header)) {
      throw new ForbiddenException('CSRF_TOKEN_INVALID');
    }

    return true;
  }
}
