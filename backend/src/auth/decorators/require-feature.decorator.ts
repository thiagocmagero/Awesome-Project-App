import { SetMetadata } from '@nestjs/common';
import type { FeatureKey } from '../../common/entitlements';

export const FEATURE_FLAG_KEY = 'required_feature';

/**
 * Onde extrair o `projectPublicId` do request para resolução context-aware
 * (Phase 5+). Quando o utilizador é LICENSED no workspace do owner do
 * projecto, a flag resolve via plano do owner.
 *
 * - `params.projectId` (default) — `:projectId` no path
 * - `params.id`                  — `:id` no path (controllers /projects/:id)
 * - `body.projectPublicId`       — campo no body POST
 * - `none`                       — sem contexto, resolve sempre via plano do caller
 */
export type ProjectIdSource = 'params.projectId' | 'params.id' | 'body.projectPublicId' | 'none';

export interface RequireFeatureOptions {
  projectIdFrom?: ProjectIdSource;
}

export interface RequireFeatureMetadata {
  key: FeatureKey;
  projectIdFrom?: ProjectIdSource;
}

/**
 * Marca uma rota como dependente de feature flag.
 * Deve ser usado com `JwtAuthGuard + FeatureFlagGuard`.
 *
 * `featureKey` é tipada via `FeatureKey` em `common/entitlements.ts` —
 * typos são apanhados em tempo de compilação.
 *
 * @example
 *   @RequireFeature(FeatureKey.GANTT_VIEW)                                    // default: tenta params.projectId → params.id → body.projectPublicId
 *   @RequireFeature(FeatureKey.GANTT_VIEW, { projectIdFrom: 'params.projectId' })  // explícito
 *   @RequireFeature(FeatureKey.MULTI_HOLIDAY, { projectIdFrom: 'none' })      // global, sem contexto
 */
export const RequireFeature = (featureKey: FeatureKey, options?: RequireFeatureOptions) =>
  SetMetadata(FEATURE_FLAG_KEY, {
    key: featureKey,
    projectIdFrom: options?.projectIdFrom,
  } satisfies RequireFeatureMetadata);
