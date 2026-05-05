import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateUserTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
