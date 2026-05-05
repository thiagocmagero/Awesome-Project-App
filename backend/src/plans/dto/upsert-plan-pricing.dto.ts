import { IsString, IsNumber, IsOptional, IsInt, Min, IsDateString } from 'class-validator';

export class UpsertPlanPricingDto {
  @IsString()
  billingCycle!: string; // MONTHLY | ANNUAL | ONE_TIME

  @IsNumber()
  @Min(0)
  basePrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  promotionalPrice?: number;

  @IsOptional()
  @IsDateString()
  promotionEndDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;
}
