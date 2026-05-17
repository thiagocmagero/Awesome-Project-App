import { useCallback } from 'react';
import { useNavigate, type NavigateOptions } from 'react-router-dom';
import { useLocale } from '../contexts/LocaleContext';
import { localizedPath } from '../lib/locale';

/**
 * Wrapper de `useNavigate` que prefixa o path com `/<locale>/` automaticamente.
 * Port literal de frontend/src/hooks/useLocalizedNavigate.ts (regra 4).
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
