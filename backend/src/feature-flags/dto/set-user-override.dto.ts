import { IsUUID, IsBoolean } from 'class-validator';

export class SetUserOverrideDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  featureFlagId!: string;

  @IsBoolean()
  enabled!: boolean;
}
