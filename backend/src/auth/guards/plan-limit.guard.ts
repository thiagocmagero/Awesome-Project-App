import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLAN_LIMIT_KEY } from '../decorators/check-plan-limit.decorator';
import { UsageService } from '../../usage/usage.service';

@Injectable()
export class PlanLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(UsageService) private readonly usageService: UsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitKey = this.reflector.getAllAndOverride<string>(PLAN_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No limit check required
    if (!limitKey) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: { sub?: number; profileCode?: string } }>();
    if (!user?.sub) return true;

    // PLATFORM_ADMIN bypasses plan limits
    if (user.profileCode === 'PLATFORM_ADMIN') return true;

    const check = await this.usageService.checkLimit(user.sub, limitKey);

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
