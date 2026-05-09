import { SetMetadata } from '@nestjs/common';
import type { ProjectIdSource } from './require-feature.decorator';
import type { LimitKey } from '../../common/entitlements';

export const PLAN_LIMIT_KEY = 'plan_limit_key';

export interface CheckPlanLimitOptions {
  projectIdFrom?: ProjectIdSource;
}

export interface CheckPlanLimitMetadata {
  key: LimitKey;
  projectIdFrom?: ProjectIdSource;
}

/**
 * Marca uma rota como dependente de limite de plano. Phase 5+ aceita
 * `projectIdFrom` para resolver o plano do owner do projecto quando
 * apropriado (LICENSED workspace member).
 *
 * `limitKey` é tipada via `LimitKey` em `common/entitlements.ts` — typos
 * são apanhados em tempo de compilação.
 *
 * @example
 *   @CheckPlanLimit(LimitKey.MAX_PROJECTS)                                  // sem contexto: caller's plan
 *   @CheckPlanLimit(LimitKey.MAX_TASKS, { projectIdFrom: 'params.projectId' })  // contexto-aware
 */
export const CheckPlanLimit = (limitKey: LimitKey, options?: CheckPlanLimitOptions) =>
  SetMetadata(PLAN_LIMIT_KEY, {
    key: limitKey,
    projectIdFrom: options?.projectIdFrom,
  } satisfies CheckPlanLimitMetadata);
