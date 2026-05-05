import { IsISO8601, IsUUID } from 'class-validator';

export class ApproveDayDto {
  @IsUUID()
  userPublicId!: string;

  /** ISO date 'YYYY-MM-DD' */
  @IsISO8601({ strict: true })
  workDate!: string;
}
