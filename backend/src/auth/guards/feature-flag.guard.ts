import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAG_KEY } from '../decorators/require-feature.decorator';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(FeatureFlagsService) private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No feature requirement
    if (!featureKey) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: { sub?: number; profileCode?: string } }>();
    if (!user?.sub) return true;

    // PLATFORM_ADMIN bypasses feature flags
    if (user.profileCode === 'PLATFORM_ADMIN') return true;

    const enabled = await this.featureFlagsService.isEnabled(user.sub, featureKey);

    if (!enabled) {
      throw new ForbiddenException({
        message: `Funcionalidade '${featureKey}' não está disponível no seu plano.`,
        code: 'FEATURE_NOT_AVAILABLE',
        featureKey,
      });
    }

    return true;
  }
}
