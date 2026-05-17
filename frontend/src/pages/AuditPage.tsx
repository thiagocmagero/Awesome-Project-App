import { useEffect } from 'react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useTranslation } from 'react-i18next';
import { useIsPlatformAdmin } from '../hooks/useIsPlatformAdmin';
import { useAuth } from '../contexts/AuthContext';
import { AuditLogTable } from '../features/audit/components/AuditLogTable';

/**
 * Página `/audit` — visível apenas a `PLATFORM_ADMIN`. Lista todos os
 * audit logs da plataforma com filtros + paginação server-side.
 *
 * Defesa em profundidade: `ProtectedRoute` aceita `BASIC_USER` também,
 * por isso reforçamos aqui o gate ao perfil específico.
 */
export default function AuditPage() {
  const { t } = useTranslation('audit');
  const { t: tc } = useTranslation('common');
  const isAdmin = useIsPlatformAdmin();
  const { user } = useAuth();
  const navigate = useLocalizedNavigate();

  // `user === null` enquanto AuthProvider arranca — não fazer nada.
  // Só redirecciona quando confirmamos que NÃO é admin.
  useEffect(() => {
    if (user && !isAdmin) navigate('/', { replace: true });
  }, [user, isAdmin, navigate]);

  if (!user || !isAdmin) return null;

  return (
    <div className="container-fluid">
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{t('page.title')}</h1>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <a href="/" className="text-primary">{tc('nav.dashboard')}</a>
              </li>
              <li className="breadcrumb-item active">{t('breadcrumb.current')}</li>
            </ol>
          </nav>
        </div>
        <div className="text-muted fs-13">{t('page.subtitle')}</div>
      </div>

      <AuditLogTable endpoint="/audit-logs" pageSizeOptions={[10, 20, 30, 50, 100]} />
    </div>
  );
}
