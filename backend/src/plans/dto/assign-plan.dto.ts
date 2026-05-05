import { IsUUID, IsOptional, IsString, IsDateString } from 'class-validator';

export class AssignPlanDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  planId!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
