import { IsString, MinLength, IsOptional, IsBoolean, ValidateIf } from 'class-validator';

export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  label?: string;

  @IsOptional()
  @ValidateIf((o) => o.description !== null)
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  enabledGlobally?: boolean;
}
