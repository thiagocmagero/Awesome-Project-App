import type { Response } from 'express';
import type { ConfigService } from '@nestjs/config';

export interface AuthCookiePayload {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
}

/** Parse "15m" / "7d" / "3600" para milissegundos. */
export function parseExpiresInToMs(raw: string | undefined, defaultMs: number): number {
  if (!raw) return defaultMs;
  const trimmed = raw.trim();
  const m = /^(\d+)([smhd])$/.exec(trimmed);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2];
    const mult = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit as 's' | 'm' | 'h' | 'd'];
    return n * mult;
  }
  const asNum = Number(trimmed);
  if (!isNaN(asNum)) return asNum * 1000;
  return defaultMs;
}

function cookieBase(cfg: ConfigService): { secure: boolean; domain?: string } {
  const secure = cfg.get<string>('COOKIE_SECURE', 'false') === 'true';
  const domain = cfg.get<string>('COOKIE_DOMAIN') || undefined;
  return { secure, domain };
}

export function setAuthCookies(
  res: Response,
  payload: AuthCookiePayload,
  cfg: ConfigService,
): void {
  const { secure, domain } = cookieBase(cfg);

  // access — visível a toda a API
  res.cookie('access_token', payload.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api',
    maxAge: payload.accessMaxAgeMs,
    domain,
  });

  // refresh — restrito ao endpoint de refresh (minimiza superfície)
  res.cookie('refresh_token', payload.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/api/auth/refresh',
    maxAge: payload.refreshMaxAgeMs,
    domain,
  });

  // CSRF — NÃO-HttpOnly (frontend tem de ler). Double-submit pattern.
  res.cookie('csrf_token', payload.csrfToken, {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: payload.refreshMaxAgeMs,
    domain,
  });
}

export function clearAuthCookies(res: Response, cfg: ConfigService): void {
  const { secure, domain } = cookieBase(cfg);
  const common = { secure, sameSite: 'lax' as const, domain };

  res.clearCookie('access_token', { ...common, httpOnly: true, path: '/api' });
  res.clearCookie('refresh_token', { ...common, httpOnly: true, path: '/api/auth/refresh' });
  res.clearCookie('csrf_token', { ...common, httpOnly: false, path: '/' });
}
