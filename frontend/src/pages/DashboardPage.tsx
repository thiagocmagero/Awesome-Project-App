import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';

interface UsageItem {
  usageKey: string;
  current: number;
  limit: number;
  percentage: number;
  description: string | null;
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState<'ok' | 'error' | 'loading'>('loading');
  const [usage, setUsage] = useState<UsageItem[]>([]);

  useEffect(() => {
    // Healthcheck
    apiFetch(`${getApiBase()}/hello`)
      .then((r) => r.ok ? setApiStatus('ok') : setApiStatus('error'))
      .catch(() => setApiStatus('error'));

    // Total users count
    apiFetch(`${getApiBase()}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setTotalUsers(data.length);
      })
      .catch(() => setTotalUsers(null));

    // Usage summary
    apiFetch(`${getApiBase()}/usage/my`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : [])
      .then((data: unknown) => { if (Array.isArray(data)) setUsage(data); })
      .catch(() => {});
  }, [token]);

  return (
    <>
      {/* Page Header */}
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{t('page.title')}</h1>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item active" aria-current="page">{t('page.title')}</li>
            </ol>
          </nav>
        </div>
        <div className="btn-list">
          <span className="badge bg-primary-transparent text-primary fs-12 fw-medium px-3 py-2">
            <i className="ri-shield-star-line me-1"></i>{user?.profileLabel ?? 'Admin'}
          </span>
        </div>
      </div>

      {/* Welcome banner */}
      <div className="row mb-4">
        <div className="col-xl-12">
          <div className="card custom-card overflow-hidden">
            <div className="card-body p-0">
              <div className="d-flex align-items-center gap-4 p-4"
                style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #7c3aed 100%)' }}>
                <div className="avatar avatar-xl rounded-circle bg-white bg-opacity-25 d-flex align-items-center justify-content-center flex-shrink-0">
                  <i className="ri-shield-star-line fs-28 text-white"></i>
                </div>
                <div>
                  <h4 className="text-white fw-semibold mb-1">
                    {t('welcome.greeting', { name: user?.name })}
                  </h4>
                  <p className="text-white text-opacity-75 mb-0">
                    {t('welcome.subtitle', { profile: user?.profileLabel })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-4 mb-4">

        {/* API status */}
        <div className="col">
          <div className="card custom-card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span className="avatar avatar-md bg-primary-transparent rounded">
                  <i className="ri-server-line fs-20 text-primary"></i>
                </span>
                <span className={`badge ${apiStatus === 'ok' ? 'bg-success-transparent text-success' : apiStatus === 'error' ? 'bg-danger-transparent text-danger' : 'bg-warning-transparent text-warning'}`}>
                  {apiStatus === 'ok' ? t('api.status_ok') : apiStatus === 'error' ? t('api.status_error') : t('api.status_loading')}
                </span>
              </div>
              <h4 className="fw-semibold mb-1">{t('kpi.api_status')}</h4>
              <p className="text-muted mb-0 fs-13">{t('kpi.api_status_label')}</p>
            </div>
          </div>
        </div>

        {/* Users */}
        <div className="col">
          <div className="card custom-card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span className="avatar avatar-md bg-secondary-transparent rounded">
                  <i className="ri-group-line fs-20 text-secondary"></i>
                </span>
                <NavLink to="/users" className="badge bg-secondary-transparent text-secondary text-decoration-none">
                  {t('actions.view_all')}
                </NavLink>
              </div>
              <h4 className="fw-semibold mb-1">
                {totalUsers === null ? '—' : totalUsers}
              </h4>
              <p className="text-muted mb-0 fs-13">{t('kpi.total_users_label')}</p>
            </div>
          </div>
        </div>

        {/* Profile */}
        <div className="col">
          <div className="card custom-card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span className="avatar avatar-md bg-warning-transparent rounded">
                  <i className="ri-admin-line fs-20 text-warning"></i>
                </span>
                <span className="badge bg-success-transparent text-success">{tc('status.active')}</span>
              </div>
              <h4 className="fw-semibold mb-1 fs-15">{user?.profileLabel ?? '—'}</h4>
              <p className="text-muted mb-0 fs-13">{t('account.profile')}</p>
            </div>
          </div>
        </div>

        {/* Session */}
        <div className="col">
          <div className="card custom-card h-100">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span className="avatar avatar-md bg-info-transparent rounded">
                  <i className="ri-time-line fs-20 text-info"></i>
                </span>
                <span className="badge bg-info-transparent text-info">JWT</span>
              </div>
              <h4 className="fw-semibold mb-1">1 {t('kpi.total_users')}</h4>
              <p className="text-muted mb-0 fs-13">{t('kpi.api_status_label')}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Account details */}
      <div className="row">
        <div className="col-xl-6">
          <div className="card custom-card">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="ri-account-circle-line me-2 text-primary"></i>
                {t('account.label')}
              </h6>
            </div>
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted fw-medium ps-4" style={{ width: '40%' }}>{t('account.email')}</td>
                    <td className="fw-semibold">{user?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted fw-medium ps-4">{t('account.email')}</td>
                    <td className="fw-semibold">{user?.email}</td>
                  </tr>
                  <tr>
                    <td className="text-muted fw-medium ps-4">{t('account.profile')}</td>
                    <td>
                      <span className="badge bg-primary-transparent text-primary">
                        <i className="ri-shield-star-line me-1"></i>
                        {user?.profileLabel}
                      </span>
                    </td>
                  </tr>
                  {user?.userTypeLabel && (
                    <tr>
                      <td className="text-muted fw-medium ps-4">{t('account.profile')}</td>
                      <td>
                        <span className="badge bg-info-transparent text-info">{user.userTypeLabel}</span>
                      </td>
                    </tr>
                  )}
                  {user?.levelLabel && (
                    <tr>
                      <td className="text-muted fw-medium ps-4">{t('account.profile')}</td>
                      <td>
                        <span className="badge bg-secondary-transparent text-secondary">{user.levelLabel}</span>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-muted fw-medium ps-4">ID</td>
                    <td className="fw-semibold text-muted">#{user?.publicId?.slice(0, 8)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card custom-card">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="ri-stack-line me-2 text-primary"></i>
                {t('tech_stack.label')}
              </h6>
            </div>
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted fw-medium ps-4" style={{ width: '40%' }}>{t('tech_stack.frontend')}</td>
                    <td><span className="badge bg-info-transparent text-info">React 18 + Vite 6</span></td>
                  </tr>
                  <tr>
                    <td className="text-muted fw-medium ps-4">{t('tech_stack.backend')}</td>
                    <td><span className="badge bg-success-transparent text-success">NestJS 10</span></td>
                  </tr>
                  <tr>
                    <td className="text-muted fw-medium ps-4">{t('tech_stack.orm')}</td>
                    <td><span className="badge bg-warning-transparent text-warning">Prisma 6</span></td>
                  </tr>
                  <tr>
                    <td className="text-muted fw-medium ps-4">{t('tech_stack.database')}</td>
                    <td><span className="badge bg-primary-transparent text-primary">PostgreSQL 16</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Section */}
      {usage.length > 0 && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card custom-card">
              <div className="card-header">
                <h6 className="card-title mb-0">
                  <i className="ri-bar-chart-box-line me-2 text-primary"></i>
                  {t('usage.label')} {user?.planName ? `— ${user.planName}` : ''}
                </h6>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  {usage.filter(u => u.limit !== -1).map(item => {
                    const pct = Math.min(item.percentage, 100);
                    const color = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : pct >= 50 ? 'info' : 'success';
                    return (
                      <div className="col-md-4" key={item.usageKey}>
                        <div className="d-flex justify-content-between mb-1">
                          <span className="fw-medium fs-13">{t(`usage.keys.${item.usageKey}`, { defaultValue: item.usageKey })}</span>
                          <span className="text-muted fs-12">{item.current}/{item.limit}</span>
                        </div>
                        <div className="progress progress-sm">
                          <div
                            className={`progress-bar bg-${color}`}
                            role="progressbar"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        {pct >= 100 && (
                          <small className="text-danger d-flex align-items-center gap-1 mt-1">
                            <i className="ri-lock-line"></i> {t('usage.no_data')}
                          </small>
                        )}
                      </div>
                    );
                  })}
                  {usage.filter(u => u.limit === -1).map(item => (
                    <div className="col-md-4" key={item.usageKey}>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="fw-medium fs-13">{t(`usage.keys.${item.usageKey}`, { defaultValue: item.usageKey })}</span>
                        <span className="text-muted fs-12">{item.current} / <i className="ri-infinity-line"></i></span>
                      </div>
                      <div className="progress progress-sm">
                        <div className="progress-bar bg-success" role="progressbar" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
