import { useAuth } from '../contexts/AuthContext';

/**
 * Single source of truth para o profileCode de PLATFORM_ADMIN.
 * Nenhum outro ficheiro deve referenciar a string literal directamente.
 */
export const PLATFORM_ADMIN_PROFILE_CODE = 'PLATFORM_ADMIN' as const;

/**
 * Helper puro — verifica se um `profileCode` arbitrário corresponde a
 * PLATFORM_ADMIN. Usar quando o sujeito da verificação NÃO é o utilizador
 * autenticado (ex.: linhas de tabelas, props de componentes, funções puras
 * fora de componentes React onde não é possível chamar o hook).
 */
export function isPlatformAdminProfileCode(code: string | null | undefined): boolean {
  return code === PLATFORM_ADMIN_PROFILE_CODE;
}

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
 *
 * **Quando o sujeito não é o user autenticado** (ex.: badge de uma linha
 * com profileCode de outro user), usar `isPlatformAdminProfileCode(code)`.
 */
export function useIsPlatformAdmin(): boolean {
  const { user } = useAuth();
  return isPlatformAdminProfileCode(user?.profileCode);
}
