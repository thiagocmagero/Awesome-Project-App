import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateHolidayDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;
}
