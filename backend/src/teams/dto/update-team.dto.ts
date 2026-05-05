import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Status } from '@prisma/client';

export class UpdateTeamDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(Status)
  @IsOptional()
  status?: Status;
}
