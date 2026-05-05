import { IsISO8601, IsUUID } from 'class-validator';

export class ApproveWeekDto {
  @IsUUID()
  userPublicId!: string;

  /** ISO date 'YYYY-MM-DD' — segunda-feira */
  @IsISO8601({ strict: true })
  weekStart!: string;
}
