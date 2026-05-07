import { SetMetadata } from '@nestjs/common';
import type { ProjectIdSource } from './require-feature.decorator';

export const PLAN_LIMIT_KEY = 'plan_limit_key';

export interface CheckPlanLimitOptions {
  projectIdFrom?: ProjectIdSource;
}

export interface CheckPlanLimitMetadata {
  key: string;
  projectIdFrom?: ProjectIdSource;
}

/**
 * Marca uma rota como dependente de limite de plano. Phase 5+ aceita
 * `projectIdFrom` para resolver o plano do owner do projecto quando
 * apropriado (LICENSED workspace member).
 *
 * @example
 *   @CheckPlanLimit('max_projects')                                  // sem contexto: caller's plan
 *   @CheckPlanLimit('max_tasks', { projectIdFrom: 'params.projectId' })  // contexto-aware
 */
export const CheckPlanLimit = (limitKey: string, options?: CheckPlanLimitOptions) =>
  SetMetadata(PLAN_LIMIT_KEY, {
    key: limitKey,
    projectIdFrom: options?.projectIdFrom,
  } satisfies CheckPlanLimitMetadata);
