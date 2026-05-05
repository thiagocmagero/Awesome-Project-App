import { IsBoolean } from 'class-validator';

export class UpsertPreferenceDto {
  @IsBoolean()
  enabled!: boolean;
}
