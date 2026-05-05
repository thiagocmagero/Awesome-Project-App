import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBoardSwimlaneDto {
  @IsString()
  @MaxLength(100)
  label!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
