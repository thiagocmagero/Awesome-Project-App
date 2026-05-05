import { IsString, MinLength, IsInt, IsOptional } from 'class-validator';

export class UpsertPlanLimitDto {
  @IsString()
  @MinLength(1)
  limitKey!: string;

  @IsInt()
  limitValue!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
