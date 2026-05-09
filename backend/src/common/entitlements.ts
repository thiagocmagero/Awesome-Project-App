/**
 * Catálogo formal de chaves de entitlement (feature flags e limites de
 * plano). Fonte única de verdade — qualquer chave usada em
 * `@RequireFeature`, `@CheckPlanLimit`, `FeatureFlagsService.isEnabled`,
 * `UsageService.checkLimit`, seeds, fixtures, etc. **deve** vir daqui.
 *
 * Strings literais espalhadas (typos silenciosos) são proibidas — ver
 * regra obrigatória "Catálogo formal de entitlement keys" em CLAUDE.md.
 *
 * Para adicionar uma chave nova:
 *   1. Acrescentar entrada ao objecto `FeatureKey` ou `LimitKey` abaixo.
 *   2. Acrescentar a mesma chave ao espelho CommonJS
 *      (`backend/prisma/seeds/entitlement-keys.js`) — o seed roda via
 *      `node` e não consegue importar de `.ts`.
 *   3. Acrescentar ao espelho do frontend
 *      (`frontend/src/lib/entitlements.ts`).
 *   4. Acrescentar à seed (`prisma/seeds/02-plans.seed.js` para limites
 *      ou feature flags) usando os valores do espelho CJS.
 */

export const FeatureKey = {
  GANTT_VIEW: 'gantt_view',
  CALENDAR_VIEW: 'calendar_view',
  TIMESHEET_VIEW: 'timesheet_view',
  MULTI_HOLIDAY: 'multi_holiday',
  UPLOAD: 'upload',
  UPLOAD_SECURED: 'upload_secured',
} as const;

export type FeatureKey = (typeof FeatureKey)[keyof typeof FeatureKey];

export const LimitKey = {
  MAX_PROJECTS: 'max_projects',
  MAX_TEAMS: 'max_teams',
  MAX_MEMBERS: 'max_members',
  MAX_TASKS: 'max_tasks',
  MAX_STORAGE_MB: 'max_storage_mb',
  MAX_API_CALLS: 'max_api_calls',
  MAX_HOLIDAYS: 'max_holidays',
  MAX_LICENSED_SEATS: 'max_licensed_seats',
  MAX_UPLOADS_COUNT: 'max_uploads_count',
  MAX_UPLOAD_SIZE_MB: 'max_upload_size_mb',
} as const;

export type LimitKey = (typeof LimitKey)[keyof typeof LimitKey];

/** Lista exaustiva — usada por seeds, runtime checks, e validação. */
export const ALL_FEATURE_KEYS: readonly FeatureKey[] = Object.values(FeatureKey);
export const ALL_LIMIT_KEYS: readonly LimitKey[] = Object.values(LimitKey);
