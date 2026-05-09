import { useAuth } from '../contexts/AuthContext';

/**
 * Hook único para verificar se o utilizador autenticado tem perfil
 * `PLATFORM_ADMIN`. Centraliza a string literal — nenhum outro componente
 * deve referenciá-la directamente.
 *
 * Retorna `false` quando não há utilizador autenticado (carregamento ou
 * sessão expirada).
 *
 * **Quando NÃO usar:** verificações de admin combinadas com feature flag.
 * O `useFeatureFlag` já trata o bypass de PLATFORM_ADMIN internamente — não
 * combinar com este hook (`enabled || useIsPlatformAdmin()` é o padrão
 * proibido). Detalhes em CLAUDE.md "PLATFORM_ADMIN bypass das feature flags".
 */
export function useIsPlatformAdmin(): boolean {
  const { user } = useAuth();
  return user?.profileCode === 'PLATFORM_ADMIN';
}
