import { IsOptional, IsString, Matches, ValidateIf } from 'class-validator';

/**
 * Body do PATCH /users/me/locale.
 *
 * Aceita um código de locale (ex.: 'pt-PT', 'en') OU `null` para limpar
 * (frontend volta a cair na detecção do browser na próxima sessão).
 *
 * O DTO valida apenas o **formato** (regex). A validação de existência
 * (deve coincidir com um `Locale.code` activo na BD) é feita no service
 * — evita bater na BD dentro do validator e devolve mensagem 400 limpa.
 */
export class UpdateMyLocaleDto {
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  // Formato: 2 letras minúsculas, opcionalmente seguido de '-' + 2 letras maiúsculas.
  // Aceita 'en', 'pt', 'pt-PT', 'pt-BR', 'es', 'en-US', etc.
  @Matches(/^[a-z]{2}(-[A-Z]{2})?$/, {
    message: 'locale must match BCP 47 short form (e.g. "en", "pt-PT")',
  })
  locale!: string | null;
}
