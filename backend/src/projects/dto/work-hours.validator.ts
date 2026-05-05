import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

/**
 * Custom validator para `Project.workHours`.
 *
 * Aceita:
 *   - null (campo opcional, fallback para 09:00–18:00).
 *   - { start: number, end: number } com start em [0..23], end em [1..24], end > start.
 *
 * Valores de start/end são inteiros — janela horária à hora cheia.
 *
 * Usar em DTOs com:
 *   @IsOptional()
 *   @ValidateIf((_o, v) => v !== null)
 *   @IsObject()
 *   @Validate(IsValidWorkHours)
 *   workHours?: { start: number; end: number } | null;
 *
 * Ver docs/claude/tools/gantt/data-model.md.
 */
@ValidatorConstraint({ name: 'isValidWorkHours', async: false })
export class IsValidWorkHours implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value !== 'object') return false;
    const obj = value as Record<string, unknown>;
    const { start, end } = obj;
    if (typeof start !== 'number' || typeof end !== 'number') return false;
    if (!Number.isInteger(start) || !Number.isInteger(end)) return false;
    if (start < 0 || start > 23) return false;
    if (end < 1 || end > 24) return false;
    if (end <= start) return false;
    // Restringir a apenas estes 2 keys (sem campos extra).
    const keys = Object.keys(obj);
    if (keys.length !== 2 || !keys.includes('start') || !keys.includes('end')) return false;
    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be { start: 0..23, end: 1..24 } with end > start`;
  }
}
