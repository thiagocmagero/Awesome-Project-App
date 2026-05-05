import { IsISO8601 } from 'class-validator';

export class SubmitWeekDto {
  /** ISO date 'YYYY-MM-DD' — segunda-feira da semana */
  @IsISO8601({ strict: true })
  weekStart!: string;
}
