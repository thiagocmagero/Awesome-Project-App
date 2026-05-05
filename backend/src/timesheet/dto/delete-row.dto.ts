import { IsISO8601, IsUUID } from 'class-validator';

export class DeleteRowDto {
  @IsUUID()
  taskPublicId!: string;

  /** ISO date 'YYYY-MM-DD' — segunda-feira da semana */
  @IsISO8601({ strict: true })
  weekStart!: string;
}
