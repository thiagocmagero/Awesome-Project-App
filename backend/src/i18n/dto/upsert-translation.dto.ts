import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TranslationStatus } from '@prisma/client';

export class UpsertTranslationDto {
  @IsString()
  declare value: string;

  @IsOptional()
  @IsEnum(TranslationStatus)
  status?: TranslationStatus;
}
