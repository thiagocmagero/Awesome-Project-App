import { IsBoolean, IsEnum, IsISO8601, IsOptional } from 'class-validator';

export enum CopyWeekMode {
  TASKS_ONLY            = 'TASKS_ONLY',
  TASKS_HOURS           = 'TASKS_HOURS',
  TASKS_HOURS_COMMENTS  = 'TASKS_HOURS_COMMENTS',
}

export class CopyWeekDto {
  /** ISO date 'YYYY-MM-DD' — segunda-feira da semana de origem */
  @IsISO8601({ strict: true })
  fromWeekStart!: string;

  /** ISO date 'YYYY-MM-DD' — segunda-feira da semana de destino */
  @IsISO8601({ strict: true })
  toWeekStart!: string;

  @IsEnum(CopyWeekMode)
  mode!: CopyWeekMode;

  /**
   * Default false — em conflito (entry destino existe), saltar.
   * Se true, sobrescreve. REQ-C08.
   */
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;
}
