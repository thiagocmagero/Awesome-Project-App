import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserTypeDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsString()
  @MinLength(2)
  label!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
