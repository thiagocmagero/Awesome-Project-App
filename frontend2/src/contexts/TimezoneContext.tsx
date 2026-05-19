// Provider simples de timezone para frontend2. Resolve a tz activa em runtime:
//   1. `user.timezone` (vindo do AuthContext)
//   2. browser tz via `Intl.DateTimeFormat().resolvedOptions().timeZone`
//   3. `UTC` em último caso
//
// Versão simplificada do `TimezoneContext` do frontend antigo: não persiste
// o browser tz no User via PATCH /users/me/timezone (essa lógica vive na
// página /account, ainda não portada — diferida para sub-fase 2.4).

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { browserTimezone } from '../lib/dateFormatting';

const TimezoneContext = createContext<string>('UTC');

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const tz = useMemo(() => user?.timezone || browserTimezone(), [user?.timezone]);
  return <TimezoneContext.Provider value={tz}>{children}</TimezoneContext.Provider>;
}

export function useTimezone(): string {
  return useContext(TimezoneContext);
}
