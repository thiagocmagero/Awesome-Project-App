/**
 * Formatos de data suportados ao nível do projecto.
 *
 * Mantido em sync com `frontend/src/lib/dateFormatting.ts` (`DATE_FORMAT_OPTIONS`).
 * Validação no DTO faz-se via `@IsIn([...PROJECT_DATE_FORMATS])`.
 */
export const PROJECT_DATE_FORMATS = [
  'DD/MM/YYYY',
  'DD-MM-YYYY',
  'YYYY-MM-DD',
  'MM/DD/YYYY',
] as const;

export type ProjectDateFormat = typeof PROJECT_DATE_FORMATS[number];
