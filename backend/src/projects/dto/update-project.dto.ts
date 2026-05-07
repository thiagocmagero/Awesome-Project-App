import { IsEnum, IsIn, IsObject, IsOptional, IsString, IsUUID, MinLength, Validate, ValidateIf } from 'class-validator';
import { Status } from '@prisma/client';
import { PROJECT_DATE_FORMATS } from './date-format.constant';
import { IsValidWorkHours } from './work-hours.validator';

export class UpdateProjectDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  /**
   * Project Manager — publicId do utilizador.
   * Enviar null para limpar a associação.
   */
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @IsUUID()
  @IsOptional()
  managerId?: string | null;

  @IsString()
  @IsOptional()
  startDate?: string | null;

  @IsString()
  @IsOptional()
  endDate?: string | null;

  /** "HIGH" | "MEDIUM" | "LOW" */
  @IsString()
  @IsOptional()
  priority?: string | null;

  /**
   * Formato de data exibido neste projecto.
   * null ⇒ usa default platform-wide ('DD/MM/YYYY') no frontend.
   */
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @IsIn([...PROJECT_DATE_FORMATS])
  @IsOptional()
  dateFormat?: string | null;

  /**
   * Janela horária útil para tasks com `durationUnit=HOUR`.
   * null ⇒ apaga (cai no default 09:00–18:00 no helper).
   * Ver docs/claude/tools/gantt/data-model.md.
   */
  @ValidateIf((_o, v) => v !== null)
  @IsObject()
  @Validate(IsValidWorkHours)
  @IsOptional()
  workHours?: { start: number; end: number } | null;
}
