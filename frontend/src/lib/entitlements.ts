/**
 * Espelho frontend do catálogo formal de entitlement keys.
 *
 * Fonte de verdade: `backend/src/common/entitlements.ts`. Este ficheiro
 * existe porque o frontend não tem acesso directo ao código do backend —
 * a sincronia é manual: qualquer chave nova tem de ser adicionada aqui
 * E no `.ts` do backend E no espelho CJS dos seeds.
 *
 * Strings literais de feature/limit fora deste ficheiro são proibidas —
 * usar sempre `FeatureKey.GANTT_VIEW` em vez de `'gantt_view'`.
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

export const ALL_FEATURE_KEYS: readonly FeatureKey[] = Object.values(FeatureKey);
export const ALL_LIMIT_KEYS: readonly LimitKey[] = Object.values(LimitKey);
