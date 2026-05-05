/**
 * Timezone do utilizador autenticado — usado para exibição visual de momentos
 * reais (notificações, eventos de calendário, audit logs, sessões).
 *
 * Não existe mais timezone de projecto — removido em Mai 2026.
 * Ver docs/claude/timezone.md para a regra primordial datas puras vs momentos.
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react';

export type TimezoneSource = 'user' | 'browser';

interface TimezoneContextValue {
  timezone: string;
  source: TimezoneSource;
}

const FALLBACK_TZ = 'UTC';

function detectBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || FALLBACK_TZ;
  } catch {
    return FALLBACK_TZ;
  }
}

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

interface ProviderProps {
  /** Timezone do utilizador autenticado (de `user.timezone`). */
  userTimezone?: string | null;
  children: ReactNode;
}

export function TimezoneProvider({ userTimezone, children }: ProviderProps) {
  const value = useMemo<TimezoneContextValue>(() => {
    if (userTimezone) return { timezone: userTimezone, source: 'user' };
    return { timezone: detectBrowserTimezone(), source: 'browser' };
  }, [userTimezone]);

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

/** Devolve a timezone IANA activa (sempre resolvida — nunca null). */
export function useTimezone(): string {
  const ctx = useContext(TimezoneContext);
  return ctx?.timezone ?? detectBrowserTimezone();
}

/** Devolve a fonte da timezone activa: 'user' | 'browser'. */
export function useTimezoneSource(): TimezoneSource {
  const ctx = useContext(TimezoneContext);
  return ctx?.source ?? 'browser';
}
