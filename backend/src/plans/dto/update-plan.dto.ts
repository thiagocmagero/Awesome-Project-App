import { IsString, MinLength, IsOptional, IsBoolean, IsDateString, IsEnum, ValidateIf } from 'class-validator';
import { PlanStatus } from '@prisma/client';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @ValidateIf((o) => o.description !== null)
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsEnum(PlanStatus)
  planStatus?: PlanStatus;

  @IsOptional()
  @ValidateIf((o) => o.validUntil !== null)
  @IsDateString()
  validUntil?: string | null;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
