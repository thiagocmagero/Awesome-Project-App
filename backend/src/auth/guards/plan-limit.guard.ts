import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLAN_LIMIT_KEY, CheckPlanLimitMetadata } from '../decorators/check-plan-limit.decorator';
import { ProjectIdSource } from '../decorators/require-feature.decorator';
import { UsageService } from '../../usage/usage.service';

function extractProjectPublicId(
  req: { params?: Record<string, unknown>; body?: Record<string, unknown> },
  source?: ProjectIdSource,
): string | null {
  const params = req.params ?? {};
  const body = req.body ?? {};

  if (source === 'none') return null;
  if (source === 'params.projectId') return (params.projectId as string) ?? null;
  if (source === 'params.id') return (params.id as string) ?? null;
  if (source === 'body.projectPublicId') return (body.projectPublicId as string) ?? null;

  return (
    (params.projectId as string) ??
    (params.id as string) ??
    (body.projectPublicId as string) ??
    null
  );
}

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(UsageService) private readonly usageService: UsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<CheckPlanLimitMetadata | string | undefined>(
      PLAN_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No limit check required
    if (!meta) return true;

    const limitKey = typeof meta === 'string' ? meta : meta.key;
    const projectIdFrom = typeof meta === 'string' ? undefined : meta.projectIdFrom;

    const req = context.switchToHttp().getRequest<{
      user?: { sub?: number; profileCode?: string };
      params?: Record<string, unknown>;
      body?: Record<string, unknown>;
    }>();
    const user = req.user;
    if (!user?.sub) return true;

    // PLATFORM_ADMIN bypasses plan limits
    if (user.profileCode === 'PLATFORM_ADMIN') return true;

    const projectPublicId = extractProjectPublicId(req, projectIdFrom);
    // Cast: o decorator garante LimitKey, mas o reflector aceita string em
    // legacy mode. Runtime trata chaves desconhecidas como sem limite.
    const check = await this.usageService.checkLimit(
      user.sub,
      limitKey as import('../../common/entitlements').LimitKey,
      { projectPublicId },
    );

    if (!check.allowed) {
      throw new ForbiddenException({
        message: `Limite do plano atingido para '${limitKey}'. Atual: ${check.current}/${check.limit}.`,
        code: 'PLAN_LIMIT_EXCEEDED',
        limitKey,
        current: check.current,
        limit: check.limit,
      });
    }

    return true;
  }
}
