import { useCallback } from 'react';
import { useNavigate, type NavigateOptions } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import { localizedPath } from '../lib/locale';

/**
 * Wrapper de `useNavigate` que prefixa o path com `/<locale>/` automaticamente.
 *
 * - Aceita `string` (path absoluto) ou `number` (history navigation; passa
 *   directo sem alteração — ex.: `navigate(-1)`).
 * - Para `string`, normaliza via `localizedPath` (remove qualquer prefixo de
 *   locale residual e injecta o actual).
 *
 * **Uso**: substituto directo do `useNavigate()` em componentes dentro do
 * `<LocaleProvider>`. Em componentes públicos fora do Provider (raro), usar
 * `useNavigate` + `localizedPath(path, locale)` com locale do `useParams`.
 */
export function useLocalizedNavigate() {
  const navigate = useNavigate();
  const { locale } = useLocale();

  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === 'number') {
        navigate(to);
        return;
      }
      navigate(localizedPath(to, locale), options);
    },
    [navigate, locale],
  );
}
