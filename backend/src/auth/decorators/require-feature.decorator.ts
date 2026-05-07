import { SetMetadata } from '@nestjs/common';

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
  key: string;
  projectIdFrom?: ProjectIdSource;
}

/**
 * Marca uma rota como dependente de feature flag.
 * Deve ser usado com `JwtAuthGuard + FeatureFlagGuard`.
 *
 * @example
 *   @RequireFeature('gantt_view')                                     // default: tenta params.projectId → params.id → body.projectPublicId
 *   @RequireFeature('gantt_view', { projectIdFrom: 'params.projectId' })  // explícito
 *   @RequireFeature('multi_holiday', { projectIdFrom: 'none' })       // global, sem contexto
 */
export const RequireFeature = (featureKey: string, options?: RequireFeatureOptions) =>
  SetMetadata(FEATURE_FLAG_KEY, {
    key: featureKey,
    projectIdFrom: options?.projectIdFrom,
  } satisfies RequireFeatureMetadata);
