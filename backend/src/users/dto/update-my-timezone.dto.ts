import { IsOptional, IsString, Validate, ValidateIf } from 'class-validator';
import { IsValidTimezone } from '../../common/timezone/timezone.util';

/**
 * Body do PATCH /users/me/timezone — usado pela detecção do browser na primeira
 * sessão e pela aba "Região e Idioma" da UserSettingsPage.
 *
 * `timezone: null` é permitido e significa "limpar" — o frontend volta a cair
 * no detect do browser na próxima sessão.
 */
export class UpdateMyTimezoneDto {
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @Validate(IsValidTimezone)
  timezone!: string | null;
}
