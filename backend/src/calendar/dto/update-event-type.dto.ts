import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateEventTypeDto {
  /**
   * Nome customizado do tipo. Para tipos sistema (`isSystem=true`):
   *  - string não-vazia → override do label
   *  - null/string vazia → repor o nome default (i18n via systemKey)
   * Para tipos custom: nome obrigatório (mínimo 1 char).
   */
  @IsOptional()
  @IsString()
  @MinLength(0)
  @MaxLength(60)
  name?: string | null;

  @IsOptional()
  @IsHexColor()
  color?: string;
}
