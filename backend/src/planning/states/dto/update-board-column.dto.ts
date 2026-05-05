import { IsHexColor, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateBoardColumnDto {
  /** Rótulo customizado. Enviar null para repor o valor i18n por defeito (estados sistema). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string | null;

  @IsOptional()
  @IsHexColor()
  color?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  wipLimit?: number | null;
}
