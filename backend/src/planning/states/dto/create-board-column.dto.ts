import { IsHexColor, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateBoardColumnDto {
  @IsString()
  @MaxLength(100)
  label!: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  wipLimit?: number;
}
