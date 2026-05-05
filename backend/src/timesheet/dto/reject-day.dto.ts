import { IsISO8601, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class RejectDayDto {
  @IsUUID()
  userPublicId!: string;

  /** ISO date 'YYYY-MM-DD' */
  @IsISO8601({ strict: true })
  workDate!: string;

  /** REQ-M06: motivo obrigatório */
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason!: string;
}
