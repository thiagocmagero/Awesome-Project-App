import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBoardSwimlaneDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string | null;

  @IsOptional()
  @IsHexColor()
  color?: string | null;
}
