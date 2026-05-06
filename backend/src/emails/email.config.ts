/**
 * Lê e valida as variáveis de ambiente SMTP que alimentam o EmailService.
 *
 * Os secrets vivem **fora** da BD — em `.env` do container backend. Apenas os
 * metadados editáveis (enabled, fromEmail, fromName) ficam no `EmailConfig`
 * singleton da Postgres.
 */
export interface SmtpEnv {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface SmtpEnvResult {
  /** SMTP env vars completas (host, port, username, password). */
  env: SmtpEnv | null;
  /** Lista de variáveis em falta (informativa para a UI/logs). */
  missing: string[];
}

/** Lê o ambiente do processo Node. Devolve `env=null` se algo essencial faltar. */
export function readSmtpEnv(): SmtpEnvResult {
  const host = process.env.SMTP_HOST?.trim() ?? '';
  const portRaw = process.env.SMTP_PORT?.trim() ?? '';
  const username = process.env.SMTP_USERNAME?.trim() ?? '';
  const password = process.env.SMTP_PASSWORD?.trim() ?? '';

  const missing: string[] = [];
  if (!host) missing.push('SMTP_HOST');
  if (!portRaw) missing.push('SMTP_PORT');
  if (!username) missing.push('SMTP_USERNAME');
  if (!password) missing.push('SMTP_PASSWORD');

  if (missing.length > 0) return { env: null, missing };

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    return { env: null, missing: ['SMTP_PORT (invalid number)'] };
  }

  return { env: { host, port, username, password }, missing: [] };
}

/** URL pública usada para construir links em emails. */
export function readAppUrl(): string {
  const url = process.env.APP_URL?.trim() ?? '';
  if (url) return url.replace(/\/+$/, '');
  return 'http://localhost:5173';
}
