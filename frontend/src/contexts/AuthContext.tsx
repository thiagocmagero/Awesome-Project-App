import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '../lib/api';

export interface AuthUser {
  publicId: string;
  email: string;
  name: string;
  status: string;
  profileCode: string;
  profileLabel: string;
  userTypeCode: string | null;
  userTypeLabel: string | null;
  levelCode: string | null;
  levelLabel: string | null;
  planCode: string | null;
  planName: string | null;
  /** IANA timezone identifier — null antes da detecção do browser na primeira sessão. */
  timezone: string | null;
  /** Locale preferido (ex.: 'pt-PT', 'en'). null antes do sync com o i18next. */
  locale: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  /** URL pública (S3) do avatar do utilizador. null ⇒ UI mostra iniciais. */
  avatarUrl: string | null;
  /** Timestamp da última actualização do avatar — usado para cache busting na URL. */
  avatarUpdatedAt: string | null;
  currentSessionPublicId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  /**
   * Compat shim durante transição para cookies HttpOnly (B5/B7).
   * Retorna `'cookie'` quando há user autenticado, `null` caso contrário.
   * Código legacy usa `if (!token) return` — este valor mantém esse check correcto.
   * Headers `Authorization: Bearer ${token}` passam a enviar `Bearer cookie`, ignorado
   * pelo backend (que autentica via cookie access_token).
   */
  token: string | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const COOKIE_AUTH_SENTINEL = 'cookie';
const AuthContext = createContext<AuthContextValue | null>(null);

function readCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// /auth/me e /auth/login devolvem relações aninhadas (profile, userType, level).
// AuthUser é flat. Sem este achatamento, user.profileCode fica undefined após F5
// e o ProtectedRoute redirecciona para /login.
export interface ApiAuthUser {
  publicId: string;
  email: string;
  name: string;
  status: string;
  profile: { publicId: string; code: string; label: string };
  userType: { publicId: string; code: string; label: string } | null;
  level: { publicId: string; code: string; label: string; order: number } | null;
  planCode: string | null;
  planName: string | null;
  timezone: string | null;
  locale: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
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
    userTypeCode: raw.userType?.code ?? null,
    userTypeLabel: raw.userType?.label ?? null,
    levelCode: raw.level?.code ?? null,
    levelLabel: raw.level?.label ?? null,
    planCode: raw.planCode ?? null,
    planName: raw.planName ?? null,
    timezone: raw.timezone ?? null,
    locale: raw.locale ?? null,
    phone: raw.phone ?? null,
    website: raw.website ?? null,
    address: raw.address ?? null,
    avatarUrl: raw.avatarUrl ?? null,
    avatarUpdatedAt: raw.avatarUpdatedAt ?? null,
    currentSessionPublicId: raw.currentSessionPublicId,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('app_user');
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Boot: validar cookie HttpOnly via /auth/me. Usa apiFetch para auto-refresh em 401
  // (access_token expira em 15min; refresh_token aguenta 7d). Sem apiFetch, F5 após
  // 15min de inactividade dá 401 e kicka o user para /login mesmo com refresh válido.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (cancelled) return;
        if (res.ok) {
          const raw = (await res.json()) as ApiAuthUser;
          const data = toAuthUser(raw);
          setUser(data);
          localStorage.setItem('app_user', JSON.stringify(data));
        } else if (res.status === 401) {
          // apiFetch já tentou refresh e falhou → limpar e deixar redirect acontecer
          setUser(null);
          localStorage.removeItem('app_user');
          localStorage.removeItem('app_token');
        }
      } catch {
        // network error — manter user cached (offline mode tolerante)
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function login(newUser: AuthUser) {
    setUser(newUser);
    localStorage.setItem('app_user', JSON.stringify(newUser));
    localStorage.removeItem('app_token'); // limpar qualquer token legacy
  }

  async function logout() {
    try {
      const csrf = readCsrfCookie();
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: csrf ? { 'X-CSRF-Token': csrf } : {},
      });
    } catch {
      // Mesmo que falhe, limpar estado local
    }
    setUser(null);
    localStorage.removeItem('app_user');
    localStorage.removeItem('app_token');
  }

  async function refreshUser() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const raw = (await res.json()) as ApiAuthUser;
        const data = toAuthUser(raw);
        setUser(data);
        localStorage.setItem('app_user', JSON.stringify(data));
      }
    } catch {
      /* ignore */
    }
  }

  const token = user ? COOKIE_AUTH_SENTINEL : null;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
