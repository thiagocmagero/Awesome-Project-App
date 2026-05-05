import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { format } from 'date-fns-tz';

/**
 * Default timezone usado quando user.timezone === null e o browser não pôde
 * ser detectado (ex.: chamadas server-side sem contexto de cliente).
 */
export const DEFAULT_TIMEZONE = 'UTC';

/**
 * Verifica se uma string é um IANA timezone identifier válido suportado pelo
 * runtime (Node 22+ e browsers modernos via ICU).
 */
export function isValidIanaTimezone(tz: string): boolean {
  if (typeof tz !== 'string' || tz.length === 0) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Custom class-validator constraint — usar em DTOs:
 *
 *   @IsOptional()
 *   @Validate(IsValidTimezone)
 *   timezone?: string;
 */
@ValidatorConstraint({ name: 'isValidTimezone', async: false })
export class IsValidTimezone implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    return typeof value === 'string' && isValidIanaTimezone(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid IANA timezone identifier (e.g., 'Europe/Lisbon')`;
  }
}

/**
 * Formata uma Date (UTC interno) na timezone indicada.
 *
 * Regra primordial: usar APENAS para MOMENTOS REAIS (Notification.createdAt,
 * Session.lastUsedAt, CalendarEvent.startAt/endAt, audit logs). Nunca para
 * datas puras (workDate, weekStart, Project.startDate). Ver
 * docs/claude/timezone.md.
 */
export function formatInTimezone(
  date: Date,
  tz: string,
  pattern = 'yyyy-MM-dd HH:mm:ss zzz',
): string {
  return format(date, pattern, { timeZone: tz });
}
