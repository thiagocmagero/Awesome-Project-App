import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateLinkDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsInt()
  lag?: number;
}
