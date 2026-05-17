import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

/** Guarda de rotas autenticadas. Aceita qualquer perfil autenticado (diferente
 *  do frontend actual que limita a PLATFORM_ADMIN). Mostra splash enquanto o
 *  /auth/me boot termina; redirige para /{locale}/login se sem sessão. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { urlLocale } = useLocale();

  if (loading) {
    return (
      <div style={{
        position: 'fixed', inset: 0, display: 'grid', placeItems: 'center',
        background: 'var(--bg, #f7f7f9)', color: 'var(--mute, #999)', fontSize: 13,
      }}>
        …
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/${urlLocale}/login`} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
