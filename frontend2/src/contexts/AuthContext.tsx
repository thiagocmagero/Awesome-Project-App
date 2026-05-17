import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiFetch } from '../lib/api';
import { getApiBase } from '../lib/env';

export interface AuthUser {
  publicId: string;
  email: string;
  name: string;
  status: string;
  profileCode: string;
  profileLabel: string;
  planCode: string | null;
  planName: string | null;
  workspacePublicId: string | null;
  timezone: string | null;
  locale: string | null;
  avatarUrl: string | null;
  avatarUpdatedAt: string | null;
  currentSessionPublicId?: string;
}

/** Shape devolvida pelo backend (/auth/me, /auth/login, /auth/create-account-from-invite). */
export interface ApiAuthUser {
  publicId: string;
  email: string;
  name: string;
  status: string;
  profile: { publicId: string; code: string; label: string };
  planCode: string | null;
  planName: string | null;
  workspacePublicId: string | null;
  timezone: string | null;
  locale: string | null;
  avatarUrl: string | null;
  avatarUpdatedAt: string | null;
  currentSessionPublicId?: string;
}

export function toAuthUser(raw: ApiAuthUser): AuthUser {
  return {
    publicId: raw.publicId,
    email: raw.email,
    name: raw.name,
    status: raw.status,
    profileCode: raw.profile.code,
    profileLabel: raw.profile.label,
    planCode: raw.planCode ?? null,
    planName: raw.planName ?? null,
    workspacePublicId: raw.workspacePublicId ?? null,
    timezone: raw.timezone ?? null,
    locale: raw.locale ?? null,
    avatarUrl: raw.avatarUrl ?? null,
    avatarUpdatedAt: raw.avatarUpdatedAt ?? null,
    currentSessionPublicId: raw.currentSessionPublicId,
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (u: AuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readCsrfCookie(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

const PUBLIC_PATH_SEGMENTS = new Set([
  'login', 'register', 'confirm-email', 'forgot-password',
  'reset-password', 'create-account', 'resend-confirmation', 'error',
]);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('app_user');
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Boot — valida cookie via /auth/me. SKIP em rotas públicas para evitar
  // o pitfall "tela branca pós-login" (ver memória project_auth_boot_pitfall).
  useEffect(() => {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const isPublic = segments[0] !== undefined && PUBLIC_PATH_SEGMENTS.has(segments[0]);
    if (isPublic) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`${getApiBase()}/auth/me`);
        if (cancelled) return;
        if (res.ok) {
          const raw = (await res.json()) as ApiAuthUser;
          const data = toAuthUser(raw);
          setUser(data);
          localStorage.setItem('app_user', JSON.stringify(data));
        } else if (res.status === 401) {
          setUser(null);
          localStorage.removeItem('app_user');
        }
      } catch {
        /* network/offline — manter user em cache */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  function login(newUser: AuthUser) {
    setUser(newUser);
    setLoading(false);
    localStorage.setItem('app_user', JSON.stringify(newUser));
  }

  async function logout() {
    try {
      const csrf = readCsrfCookie();
      await fetch(`${getApiBase()}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: csrf ? { 'X-CSRF-Token': csrf } : {},
      });
    } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem('app_user');
  }

  async function refreshUser() {
    try {
      const res = await apiFetch(`${getApiBase()}/auth/me`);
      if (res.ok) {
        const raw = (await res.json()) as ApiAuthUser;
        const data = toAuthUser(raw);
        setUser(data);
        localStorage.setItem('app_user', JSON.stringify(data));
      }
    } catch { /* ignore */ }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
