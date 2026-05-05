import { SetMetadata } from '@nestjs/common';

export const PLAN_LIMIT_KEY = 'plan_limit_key';

/**
 * Marks a route as requiring a plan limit check before execution.
 * Must be used together with JwtAuthGuard + PlanLimitGuard.
 *
 * @example
 * @UseGuards(JwtAuthGuard, PlanLimitGuard)
 * @CheckPlanLimit('max_projects')
 */
export const CheckPlanLimit = (limitKey: string) =>
  SetMetadata(PLAN_LIMIT_KEY, limitKey);
