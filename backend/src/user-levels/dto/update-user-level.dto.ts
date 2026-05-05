import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateUserLevelDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
