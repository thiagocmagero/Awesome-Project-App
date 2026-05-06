import { useEffect, useState, FormEvent } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiBase, apiFetch } from '../lib/api';

const DEFAULT_MAX_BIZ_DAYS = 1300;

export default function PlatformLimitsPage() {
  const { token, user } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('platform_config');
  const { t: tc } = useTranslation('common');

  const [maxBizDays, setMaxBizDays] = useState<number>(DEFAULT_MAX_BIZ_DAYS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  if (user && user.profileCode !== 'PLATFORM_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    if (!token) return;
    apiFetch(`${api}/platform-config/limits`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { maxTaskBusinessDays?: number } | null) => {
        if (data && typeof data.maxTaskBusinessDays === 'number') {
          setMaxBizDays(data.maxTaskBusinessDays);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const res = await apiFetch(`${api}/platform-config/limits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ maxTaskBusinessDays: Number(maxBizDays) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { message?: string | string[] }).message;
        throw new Error(Array.isArray(msg) ? msg.join(' · ') : (msg ?? tc('errors.generic')));
      }
      showToast('success', t('limits.saved'));
    } catch (err) {
      showToast('danger', (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{t('limits.page_title')}</h1>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 breadcrumb-style2">
              <li className="breadcrumb-item">
                <NavLink to="/dashboard">{tc('nav.dashboard')}</NavLink>
              </li>
              <li className="breadcrumb-item">{tc('nav.section.platform')}</li>
              <li className="breadcrumb-item active" aria-current="page">
                {t('limits.page_title')}
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {loading ? (
        <div className="d-flex align-items-center justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">...</span>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-xl-6">
            <form onSubmit={handleSave} noValidate>
              <div className="card custom-card">
                <div className="card-header">
                  <div className="card-title d-flex align-items-center gap-2">
                    <i className="ri-shield-line text-primary fs-16"></i>
                    {t('limits.tab_label')}
                  </div>
                </div>
                <div className="card-body">
                  <p className="text-muted fs-13 mb-4">{t('limits.page_subtitle')}</p>

                  <label className="form-label fw-medium fs-13" htmlFor="maxBizDays">
                    {t('limits.max_task_business_days')}
                  </label>
                  <input
                    id="maxBizDays"
                    type="number"
                    className="form-control"
                    min={1}
                    max={99999}
                    step={1}
                    value={maxBizDays}
                    onChange={(e) => setMaxBizDays(Number(e.target.value))}
                  />
                  <small className="text-muted d-block mt-2">
                    {t('limits.max_task_business_days_hint')}
                  </small>
                  <small className="text-muted d-block mt-1">
                    ≈ {(maxBizDays / 260).toFixed(1)} {t('limits.years_calendar_estimate')}
                  </small>
                </div>
                <div className="card-footer d-flex justify-content-end gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm" />
                        {tc('actions.saving')}
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line" />
                        {tc('actions.save')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
