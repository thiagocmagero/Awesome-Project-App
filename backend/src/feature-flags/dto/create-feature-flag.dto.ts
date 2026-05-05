import { IsString, MinLength, IsOptional, IsBoolean } from 'class-validator';

export class CreateFeatureFlagDto {
  @IsString()
  @MinLength(2)
  key!: string;

  @IsString()
  @MinLength(2)
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabledGlobally?: boolean;
}
