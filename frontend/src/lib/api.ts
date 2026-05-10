/**
 * API helper central. Após B3+B4+B6 (backend cookies + CSRF):
 *   - Todas as chamadas enviam cookies (credentials: 'include')
 *   - Mutações (POST/PUT/PATCH/DELETE) injectam header X-CSRF-Token automaticamente
 *   - 401 → tenta /auth/refresh (deduplicado) → retry uma vez
 *   - Se refresh falha → redirect /login
 */

export function getApiBase(): string {
  return '/api/v1';
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUTH_SKIP_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
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

function readAuthUserWorkspacePublicId(): string | null {
  try {
    const raw = localStorage.getItem('app_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { workspacePublicId?: string | null };
    return parsed.workspacePublicId ?? null;
  } catch {
    return null;
  }
}

function buildRequestInit(init: RequestInit): RequestInit {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  // CSRF double-submit — ignorado pelo backend se não há cookie csrf_token
  if (MUTATING_METHODS.has(method)) {
    const csrf = readCsrfCookie();
    if (csrf && !headers.has('X-CSRF-Token')) {
      headers.set('X-CSRF-Token', csrf);
    }
  }

  // Default Content-Type para bodies JSON string
  if (init.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // X-Workspace-Id header — informativo em V1 (backend resolve via JWT),
  // future-ready para V2 (multi-workspace via header). Lê do localStorage do
  // AuthContext para sobreviver a F5. Sem header se não há user autenticado.
  if (!headers.has('X-Workspace-Id')) {
    const wsPublicId = readAuthUserWorkspacePublicId();
    if (wsPublicId) headers.set('X-Workspace-Id', wsPublicId);
  }

  return {
    ...init,
    headers,
    credentials: 'include',
  };
}

// ─── Refresh coordination (singleton) ────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const csrf = readCsrfCookie();
      const headers: Record<string, string> = {};
      if (csrf) headers['X-CSRF-Token'] = csrf;

      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Limpar no próximo tick para permitir que todas as requests pendentes
      // vejam o mesmo resultado. O finally corre antes de return.
      setTimeout(() => { refreshPromise = null; }, 0);
    }
  })();

  return refreshPromise;
}

const PUBLIC_PATHS = [
  '/login', '/signup', '/confirm-email', '/forgot-password',
  '/reset-password', '/create-account', '/error/',
];

/**
 * Redirige para /login quando estamos numa rota protegida.
 * Devolve `true` se de facto disparou o redirect (browser vai sair desta página);
 * `false` se já estávamos numa rota pública e nada foi feito.
 *
 * Importa este sinal: quando devolve `false`, o caller (apiFetch) **não pode**
 * suspender-se com `new Promise(() => {})` — tem de devolver a Response real
 * para que callers reactivos (ex.: AuthProvider boot) consigam reagir ao 401
 * em vez de ficarem com `loading: true` indefinidamente. Causa de tela branca
 * pós-login: AuthProvider boot dispara /auth/me em /login (sem cookies) → 401 →
 * refresh 401 → este redirect no-op → promise pendurado → loading nunca cai.
 */
function redirectToLogin(): boolean {
  try {
    localStorage.removeItem('app_user');
    localStorage.removeItem('app_token'); // legacy
  } catch {
    /* ignore */
  }
  const path = window.location.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));
  if (!isPublic) {
    window.location.href = '/login';
    return true;
  }
  return false;
}

// ─── apiFetch ─────────────────────────────────────────────────────────────────

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const firstInit = buildRequestInit(init);
  const res = await fetch(input, firstInit);

  if (res.status !== 401) return res;

  // Auth endpoints não fazem refresh — 401 é resposta legítima do backend
  if (shouldSkipRefresh(input)) return res;

  const refreshed = await refreshSession();
  if (!refreshed) {
    const redirected = redirectToLogin();
    // Em rota pública não há redirect — devolver a Response 401 para callers
    // reactivos (AuthProvider boot) reagirem em vez de suspenderem.
    if (!redirected) return res;
    return new Promise(() => {}); // browser está a navegar para /login
  }

  // Retry uma vez com cookies novos
  const retryInit = buildRequestInit(init);
  const retryRes = await fetch(input, retryInit);

  if (retryRes.status === 401) {
    const redirected = redirectToLogin();
    if (!redirected) return retryRes;
    return new Promise(() => {});
  }

  return retryRes;
}
