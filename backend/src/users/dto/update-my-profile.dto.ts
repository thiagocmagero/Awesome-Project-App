import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMyProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  website?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;
}
