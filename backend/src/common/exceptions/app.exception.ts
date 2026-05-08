import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Excepção canónica da API. Resposta JSON tem `error_code` (string estável,
 * usado para mapeamento i18n no frontend) + `statusCode`. O 3º argumento
 * opcional (`context`) injecta campos extra no body — usado para mensagens
 * mais ricas no UI (ex.: `extension`, `mime`, `maxMb`).
 *
 * O frontend interpola estes campos em strings i18n com placeholders, evitando
 * necessidade de catalogar uma chave por valor concreto.
 */
export class AppException extends HttpException {
  constructor(
    errorCode: string,
    status: HttpStatus,
    context?: Record<string, unknown>,
  ) {
    super({ error_code: errorCode, statusCode: status, ...(context ?? {}) }, status);
  }
}
