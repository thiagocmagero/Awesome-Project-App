import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateEntryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? parseFloat(value) : value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(999.99)
  hours?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
