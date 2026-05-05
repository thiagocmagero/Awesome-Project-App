import { IsEnum, IsOptional, IsString, IsUUID, MinLength, Validate, ValidateIf } from 'class-validator';
import { Status } from '@prisma/client';
import { IsValidTimezone } from '../../common/timezone/timezone.util';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  email?: string;

  @IsOptional()
  @IsUUID()
  profileId?: string;

  @IsOptional()
  @ValidateIf((o: UpdateUserDto) => o.userTypeId !== null)
  @IsUUID()
  userTypeId?: string | null;

  @IsOptional()
  @ValidateIf((o: UpdateUserDto) => o.levelId !== null)
  @IsUUID()
  levelId?: string | null;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  /// IANA timezone identifier (ex.: 'Europe/Lisbon'). null permitido (limpa).
  @IsOptional()
  @ValidateIf((o: UpdateUserDto) => o.timezone !== null)
  @IsString()
  @Validate(IsValidTimezone)
  timezone?: string | null;
}
