/**
 * Espelho CommonJS de `backend/src/common/entitlements.ts`.
 *
 * Necessário porque o seed corre via `node prisma/seeds/index.js` (sem
 * ts-node) e não consegue importar de um `.ts`. Os valores aqui DEVEM
 * coincidir exactamente com o catálogo TypeScript — qualquer nova chave
 * tem de ser adicionada nos dois ficheiros.
 *
 * O TypeScript NÃO importa daqui (mantém a sua versão tipada). Esta
 * sincronia manual é assumida; se um dia o seed for migrado para TS o
 * `.ts` passa a fonte única.
 */

const FeatureKey = Object.freeze({
  GANTT_VIEW: 'gantt_view',
  CALENDAR_VIEW: 'calendar_view',
  TIMESHEET_VIEW: 'timesheet_view',
  MULTI_HOLIDAY: 'multi_holiday',
  UPLOAD: 'upload',
  UPLOAD_SECURED: 'upload_secured',
});

const LimitKey = Object.freeze({
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
});

module.exports = { FeatureKey, LimitKey };
