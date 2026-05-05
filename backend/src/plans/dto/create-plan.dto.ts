import { IsString, MinLength, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
