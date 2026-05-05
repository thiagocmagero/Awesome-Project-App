import { IsIn, IsObject, IsOptional, IsString, IsUUID, MinLength, Validate } from 'class-validator';
import { PROJECT_DATE_FORMATS } from './date-format.constant';
import { IsValidWorkHours } from './work-hours.validator';

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  /** Owner aplicacional — publicId do utilizador responsável pelo produto */
  @IsString()
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  /** Project Manager — publicId do responsável pela gestão */
  @IsString()
  @IsUUID()
  @IsOptional()
  managerId?: string;

  /** Data de início (ISO 8601) */
  @IsString()
  @IsOptional()
  startDate?: string;

  /** Data de fim (ISO 8601) */
  @IsString()
  @IsOptional()
  endDate?: string;

  /** "HIGH" | "MEDIUM" | "LOW" */
  @IsString()
  @IsOptional()
  priority?: string;

  /**
   * Formato de data exibido neste projecto.
   * Omitido ⇒ frontend usa default platform-wide ('DD/MM/YYYY').
   */
  @IsString()
  @IsIn([...PROJECT_DATE_FORMATS])
  @IsOptional()
  dateFormat?: string;

  /**
   * Janela horária útil para tasks com `durationUnit=HOUR`.
   * `{ start: 0..23, end: 1..24 }` com `end > start`. Omitido ⇒ default 09:00–18:00.
   * Ver docs/claude/tools/gantt/data-model.md.
   */
  @IsObject()
  @Validate(IsValidWorkHours)
  @IsOptional()
  workHours?: { start: number; end: number };
}
