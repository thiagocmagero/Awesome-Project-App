/**
 * apiFetch — fetch wrapper alinhado com o backend Awesome Project App.
 *
 * - Sempre `credentials: 'include'` (cookies HttpOnly access_token + refresh_token).
 * - CSRF double-submit: lê cookie `csrf_token` e envia em `X-CSRF-Token` em mutações.
 * - 401 → tenta `POST /api/v1/auth/refresh` 1x (deduplicado) → retry. Falha → redirect /login.
 * - Endpoints de auth (`/auth/login`, `/auth/register`, `/auth/refresh`) NÃO disparam refresh.
 * - Em rotas públicas (login/register/...), 401 é devolvido sem redirect — para o
 *   AuthProvider boot reagir em vez de suspender ("tela branca pós-login" pitfall).
 *
 * Port adaptado de frontend/src/lib/api.ts.
 */

import { looksLikeLocale, stripLocaleFromPath } from './locale';

/** API base path — todas as rotas vivem sob /api/v1 (alinhado com backend). */
export function getApiBase(): string {
  return '/api/v1';
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUTH_SKIP_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/create-account-from-invite'];

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/confirm-email',
  '/forgot-password',
  '/reset-password',
  '/create-account',
  '/resend-confirmation',
  '/error/',
];

function readCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Workspace activo do request — usado para injectar `X-Workspace-Id` em todas
 * as chamadas HTTP. Mantido como módulo-level porque `apiFetch` não tem acesso
 * a React state. O `WorkspacesProvider` chama `setActiveWorkspaceId(publicId)`
 * cada vez que o `activeWorkspace` muda.
 *
 * Backend (V2) resolve `workspaceId` via este header e, sem ele, cai no
 * workspace default do user.
 */
let activeWorkspacePublicId: string | null = null;
export function setActiveWorkspaceId(publicId: string | null): void {
  activeWorkspacePublicId = publicId;
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return (input as Request).url;
}

function shouldSkipRefresh(input: RequestInfo | URL): boolean {
  const url = urlOf(input);
  return AUTH_SKIP_REFRESH_PATHS.some((p) => url.includes(p));
}

function buildRequestInit(init: RequestInit): RequestInit {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (MUTATING_METHODS.has(method)) {
    const csrf = readCsrfCookie();
    if (csrf && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrf);
    }
  }

  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (activeWorkspacePublicId && !headers.has('X-Workspace-Id')) {
    headers.set('X-Workspace-Id', activeWorkspacePublicId);
  }

  return { ...init, headers, credentials: 'include' };
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const csrf = readCsrfCookie();
      const headers: Record<string, string> = {};
      if (csrf) headers['X-CSRF-Token'] = csrf;

      const res = await fetch(`${getApiBase()}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setTimeout(() => { refreshPromise = null; }, 0);
    }
  })();

  return refreshPromise;
}

function redirectToLogin(): boolean {
  try {
    localStorage.removeItem('app_user');
  } catch {
    /* ignore */
  }
  // Path tem prefixo `/{locale}/...` — stripa antes de comparar com
  // PUBLIC_PATHS (que são `/login`, `/create-account`, ...). Sem strip,
  // `/pt-pt/login` não match-ava `/login` e o redirect disparava em loop
  // entre `/pt-pt/login` ↔ `/login` (bug Mai 2026 no fluxo do email de
  // convite).
  const path = window.location.pathname;
  const stripped = stripLocaleFromPath(path);
  const isPublic = PUBLIC_PATHS.some((p) => stripped.startsWith(p));
  if (!isPublic) {
    // Preserva o segmento de locale se existir, para evitar a hop extra
    // pelo `RedirectWithLocale`.
    const firstSegment = path.split('/').filter(Boolean)[0];
    const localePrefix = looksLikeLocale(firstSegment) ? `/${firstSegment}` : '';
    window.location.href = `${localePrefix}/login`;
    return true;
  }
  return false;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(input, buildRequestInit(init));
  if (res.status !== 401) return res;
  if (shouldSkipRefresh(input)) return res;

  const refreshed = await refreshSession();
  if (!refreshed) {
    const redirected = redirectToLogin();
    if (!redirected) return res;
    return new Promise(() => {});
  }

  const retry = await fetch(input, buildRequestInit(init));
  if (retry.status === 401) {
    const redirected = redirectToLogin();
    if (!redirected) return retry;
    return new Promise(() => {});
  }
  return retry;
}

/** Convenience helpers. Levantam Error com `.message` = JSON do body (se houver). */

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const url = path.startsWith('http') ? path : `${getApiBase()}${path}`;
  const res = await apiFetch(url, {
    method: 'POST',
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await errorFrom(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${getApiBase()}${path}`;
  const res = await apiFetch(url);
  if (!res.ok) throw await errorFrom(res);
  return res.json() as Promise<T>;
}

export async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  const url = path.startsWith('http') ? path : `${getApiBase()}${path}`;
  const res = await apiFetch(url, {
    method: 'PATCH',
    body: body != null ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await errorFrom(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const url = path.startsWith('http') ? path : `${getApiBase()}${path}`;
  const res = await apiFetch(url, { method: 'DELETE' });
  if (!res.ok) throw await errorFrom(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function errorFrom(res: Response): Promise<Error> {
  let body: unknown = null;
  try { body = await res.json(); } catch { /* ignore */ }
  const msg = (body as { message?: unknown })?.message;
  const text = Array.isArray(msg) ? msg.join(' · ') : (typeof msg === 'string' ? msg : `HTTP ${res.status}`);
  const err = new Error(text) as Error & { status: number; body: unknown };
  err.status = res.status;
  err.body = body;
  return err;
}
