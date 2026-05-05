import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import { useSessions, type ActiveSession } from '../features/sessions/useSessions';
import { useToast } from '../contexts/ToastContext';
import { formatMoment } from '../lib/dateFormatting';
import { useTimezone } from '../contexts/TimezoneContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * SessionsPage exibe MOMENTOS REAIS (createdAt, lastUsedAt, expiresAt).
 * relativeTime é tz-agnostic (Date.now() - ISO em ms é igual em qualquer tz);
 * o fallback absoluto e formatDate usam a tz activa do utilizador.
 */
function relativeTime(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return t('activity.now');
  if (m < 60) return t('activity.minutes_ago', { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('activity.hours_ago', { count: h });
  const d = Math.floor(h / 24);
  return t('activity.days_ago', { count: d });
}

function DeviceIcon({ type }: { type?: ActiveSession['device']['type'] }) {
  const icon =
    type === 'mobile'  ? 'ri-smartphone-line' :
    type === 'tablet'  ? 'ri-tablet-line'     :
    type === 'desktop' ? 'ri-computer-line'   :
                         'ri-question-line';
  return <i className={`${icon} fs-18 text-primary`}></i>;
}

function formatDevice(s: ActiveSession, t: (k: string) => string): string {
  const parts: string[] = [];
  if (s.device.browser) parts.push(s.device.browser);
  if (s.device.os) parts.push(s.device.os);
  if (parts.length === 0) {
    const key =
      s.device.type === 'mobile'  ? 'device.mobile'  :
      s.device.type === 'tablet'  ? 'device.tablet'  :
      s.device.type === 'desktop' ? 'device.desktop' :
                                    'device.unknown';
    return t(key);
  }
  return parts.join(' · ');
}

function formatLocation(s: ActiveSession, t: (k: string) => string): string {
  if (!s.location) return t('location.unknown');
  const parts = [s.location.city, s.location.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : t('location.unknown');
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const { t } = useTranslation('sessions');
  const { t: tc } = useTranslation('common');
  const { showToast } = useToast();
  const { sessions, loading, revokeSession, revokeOthers, fetchSessions } = useSessions();
  const tz = useTimezone();
  // Wrapper local — usa formatMoment (converte UTC → tz activa do user). Cross-project.
  const formatDate = (iso: string): string => formatMoment(iso, tz);

  const otherCount = sessions.filter((s) => !s.isCurrent).length;

  async function handleRevoke(s: ActiveSession) {
    const result = await Swal.fire({
      title: t('confirm.revoke.title'),
      text: t('confirm.revoke.text'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('confirm.revoke.confirm'),
      cancelButtonText: tc('actions.cancel'),
      confirmButtonColor: '#d33',
    });
    if (!result.isConfirmed) return;
    const ok = await revokeSession(s.publicId);
    if (ok) showToast('success', t('success.revoked'));
    else    showToast('danger',  t('error.revoke_failed'));
  }

  async function handleRevokeOthers() {
    if (otherCount === 0) return;
    const result = await Swal.fire({
      title: t('confirm.revoke_others.title'),
      text: t('confirm.revoke_others.text'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('confirm.revoke_others.confirm'),
      cancelButtonText: tc('actions.cancel'),
      confirmButtonColor: '#d33',
    });
    if (!result.isConfirmed) return;
    const count = await revokeOthers();
    showToast('success', t('success.revoked_others', { count }));
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page Header */}
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{t('page.title')}</h1>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <a href="/dashboard" className="text-primary">{tc('nav.dashboard')}</a>
              </li>
              <li className="breadcrumb-item active">{t('page.title')}</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-danger-light d-flex align-items-center gap-2"
            onClick={handleRevokeOthers}
            disabled={loading || otherCount === 0}
          >
            <i className="ri-logout-box-r-line fs-16"></i>
            {t('btn.revoke_others')}
          </button>
        </div>
      </div>

      {/* Sessions table */}
      <div className="card custom-card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="card-title mb-0">
            <i className="ri-shield-keyhole-line me-2 text-primary"></i>
            {t('page.title')}
          </h6>
          <button className="btn btn-sm btn-light" onClick={fetchSessions} disabled={loading}>
            <i className="ri-refresh-line"></i>
          </button>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">{t('col.device')}</th>
                    <th>{t('col.location')}</th>
                    <th>{t('col.ip')}</th>
                    <th>{t('col.last_activity')}</th>
                    <th>{t('col.started')}</th>
                    <th>{t('col.status')}</th>
                    <th style={{ width: '120px' }}>{t('col.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-5">
                        <i className="ri-shield-keyhole-line fs-24 d-block mb-2"></i>
                        {t('empty.no_sessions')}
                      </td>
                    </tr>
                  ) : sessions.map((s) => (
                    <tr key={s.publicId}>
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-2">
                          <DeviceIcon type={s.device.type} />
                          <div className="fw-medium fs-14">{formatDevice(s, t)}</div>
                        </div>
                      </td>
                      <td className="text-muted fs-13">{formatLocation(s, t)}</td>
                      <td>
                        <code className="fs-12">{s.ip || '—'}</code>
                      </td>
                      <td title={formatDate(s.lastUsedAt)}>
                        {relativeTime(s.lastUsedAt, t)}
                      </td>
                      <td className="text-muted fs-13">{formatDate(s.createdAt)}</td>
                      <td>
                        {s.isCurrent ? (
                          <span className="badge bg-success-transparent text-success">
                            <i className="ri-checkbox-circle-fill me-1"></i>
                            {t('current_badge')}
                          </span>
                        ) : (
                          <span className="badge bg-primary-transparent text-primary">
                            {t('status.active')}
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger-light"
                          onClick={() => handleRevoke(s)}
                          disabled={s.isCurrent}
                          title={s.isCurrent ? t('current_badge') : t('btn.revoke')}
                        >
                          <i className="ri-close-circle-line me-1"></i>
                          {t('btn.revoke')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
