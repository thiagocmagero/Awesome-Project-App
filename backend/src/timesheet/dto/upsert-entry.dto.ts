import { IsISO8601, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpsertEntryDto {
  @IsUUID()
  taskPublicId!: string;

  /** ISO date 'YYYY-MM-DD' (UTC midnight será calculado pelo service) */
  @IsISO8601({ strict: true })
  workDate!: string;

  /**
   * REQ-D01: mín 0.10 horas. REQ-D02: zero/negativo rejeitado (use DELETE em vez disso).
   * REQ-D03: até 1 casa decimal. REQ-D04: sem máx — usamos 999.99 (Decimal(5,2)).
   */
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(999.99)
  hours!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
