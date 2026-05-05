import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateUserLevelDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsString()
  @MinLength(2)
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
