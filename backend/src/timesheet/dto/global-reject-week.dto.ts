import { IsISO8601, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class GlobalRejectWeekDto {
  @IsUUID()
  projectPublicId!: string;

  @IsUUID()
  userPublicId!: string;

  @IsISO8601({ strict: true })
  weekStart!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string;
}
