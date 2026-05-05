import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../jwt.strategy';

/**
 * Extrai o utilizador autenticado (JWT payload) do request.
 * Requer que JwtAuthGuard tenha sido aplicado antes.
 *
 * @example
 *   async findAll(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    return ctx.switchToHttp().getRequest().user as JwtPayload;
  },
);
