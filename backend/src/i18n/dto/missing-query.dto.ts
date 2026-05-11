import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class MissingQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  declare resolved?: boolean;

  @IsOptional()
  @IsString()
  declare namespace?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  declare limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  declare offset?: number;
}
