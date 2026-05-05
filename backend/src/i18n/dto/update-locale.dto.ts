import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateLocaleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  flag?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;
}
