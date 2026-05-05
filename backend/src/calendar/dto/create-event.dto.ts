import {
  IsBoolean,
  IsHexColor,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
  /** publicId do CalendarEventType (sistema ou custom) */
  @IsUUID()
  typeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  /** ISO 8601 — UTC */
  @IsISO8601()
  startAt!: string;

  /** ISO 8601 — UTC */
  @IsISO8601()
  endAt!: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  /** Override de cor (hex). null/undefined = cor do tipo */
  @IsOptional()
  @IsHexColor()
  color?: string;
}
