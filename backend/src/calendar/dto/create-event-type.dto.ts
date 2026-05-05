import { IsHexColor, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEventTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name!: string;

  /** Hex color (#rrggbb). Default aplicado pelo service se omitido */
  @IsOptional()
  @IsHexColor()
  color?: string;
}
