import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_FLAG_KEY, RequireFeatureMetadata, ProjectIdSource } from '../decorators/require-feature.decorator';
import { FeatureFlagsService } from '../../feature-flags/feature-flags.service';

/**
 * Phase 5 — extracts `projectPublicId` from the request based on the decorator's
 * `projectIdFrom` option and passes it to the service for context-aware
 * resolution. Default fallback chain: params.projectId → params.id → body.
 */
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

  // Default fallback chain
  return (
    (params.projectId as string) ??
    (params.id as string) ??
    (body.projectPublicId as string) ??
    null
  );
}

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(FeatureFlagsService) private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<RequireFeatureMetadata | string | undefined>(
      FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No feature requirement
    if (!meta) return true;

    // Backwards compat: a few legacy decorators may have stored a plain string.
    const featureKey = typeof meta === 'string' ? meta : meta.key;
    const projectIdFrom = typeof meta === 'string' ? undefined : meta.projectIdFrom;

    const req = context.switchToHttp().getRequest<{
      user?: { sub?: number; profileCode?: string };
      params?: Record<string, unknown>;
      body?: Record<string, unknown>;
    }>();
    const user = req.user;
    if (!user?.sub) return true;

    // PLATFORM_ADMIN bypasses feature flags
    if (user.profileCode === 'PLATFORM_ADMIN') return true;

    const projectPublicId = extractProjectPublicId(req, projectIdFrom);
    // Cast: o decorator garante FeatureKey, mas o reflector aceita string em
    // legacy mode. Runtime trata strings desconhecidas como flag inexistente.
    const enabled = await this.featureFlagsService.isEnabled(
      user.sub,
      featureKey as import('../../common/entitlements').FeatureKey,
      { projectPublicId },
    );

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
