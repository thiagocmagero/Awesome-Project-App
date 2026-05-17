import { useAuth } from '../contexts/AuthContext';

/**
 * Hook único responsável por saber se o utilizador autenticado é PLATFORM_ADMIN.
 * Centraliza a string literal `'PLATFORM_ADMIN'` — nenhum outro componente
 * deve comparar inline contra `user.profileCode`.
 *
 * Port da regra documentada em CLAUDE.md / docs/claude/auth.md.
 */
export function useIsPlatformAdmin(): boolean {
  const { user } = useAuth();
  return user?.profileCode === 'PLATFORM_ADMIN';
}
