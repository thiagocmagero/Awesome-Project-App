import { useEffect, useState, FormEvent } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiBase, apiFetch } from '../lib/api';

const DEFAULT_MAX_BIZ_DAYS = 1300;
const DEFAULT_MAX_UPLOAD_SIZE_MB = 50;

interface PlatformLimitsResponse {
  maxTaskBusinessDays?: number;
  maxUploadSizeMb?: number;
  allowedMimeTypes?: string[];
  allowedFileExtensions?: string[];
}

export default function PlatformLimitsPage() {
  const { token, user } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('platform_config');
  const { t: tc } = useTranslation('common');

  const [maxBizDays, setMaxBizDays] = useState<number>(DEFAULT_MAX_BIZ_DAYS);
  const [maxUploadMb, setMaxUploadMb] = useState<number>(DEFAULT_MAX_UPLOAD_SIZE_MB);
  const [allowedMimes, setAllowedMimes] = useState<string>(''); // newline-separated
  const [allowedExtensions, setAllowedExtensions] = useState<string>(''); // ;-separated
  const [loading, setLoading] = useState(true);
  const [savingTasks, setSavingTasks] = useState(false);
  const [savingUploads, setSavingUploads] = useState(false);

  if (user && user.profileCode !== 'PLATFORM_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    if (!token) return;
    apiFetch(`${api}/platform-config/limits`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PlatformLimitsResponse | null) => {
        if (!data) return;
        if (typeof data.maxTaskBusinessDays === 'number') {
          setMaxBizDays(data.maxTaskBusinessDays);
        }
        if (typeof data.maxUploadSizeMb === 'number') {
          setMaxUploadMb(data.maxUploadSizeMb);
        }
        if (Array.isArray(data.allowedMimeTypes)) {
          setAllowedMimes(data.allowedMimeTypes.join('\n'));
        }
        if (Array.isArray(data.allowedFileExtensions)) {
          setAllowedExtensions(data.allowedFileExtensions.join(';'));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveTasks(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingTasks(true);
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
      setSavingTasks(false);
    }
  }

  async function handleSaveUploads(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSavingUploads(true);
    try {
      // Normaliza textarea → array (linhas vazias filtradas no service também).
      const mimeArray = allowedMimes
        .split(/\r?\n/)
        .map((m) => m.trim())
        .filter(Boolean);
      // Extensões — separadas por `;` (também aceita `,` ou whitespace para
      // robustez). Service faz strip-dot + lowercase + dedupe.
      const extArray = allowedExtensions
        .split(/[;,\s]+/)
        .map((e) => e.trim().replace(/^\.+/, ''))
        .filter(Boolean);
      const res = await apiFetch(`${api}/platform-config/limits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          maxUploadSizeMb: Number(maxUploadMb),
          allowedMimeTypes: mimeArray,
          allowedFileExtensions: extArray,
        }),
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
      setSavingUploads(false);
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
          {/* Tasks (existente) */}
          <div className="col-xl-6">
            <form onSubmit={handleSaveTasks} noValidate>
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
                    disabled={savingTasks}
                  >
                    {savingTasks ? (
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

          {/* Uploads — adicionado Mai 2026 (feature `upload`) */}
          <div className="col-xl-6">
            <form onSubmit={handleSaveUploads} noValidate>
              <div className="card custom-card">
                <div className="card-header">
                  <div className="card-title d-flex align-items-center gap-2">
                    <i className="ri-attachment-2 text-primary fs-16"></i>
                    {t('uploads.tab_label')}
                  </div>
                </div>
                <div className="card-body">
                  <p className="text-muted fs-13 mb-4">{t('uploads.page_subtitle')}</p>

                  <label className="form-label fw-medium fs-13" htmlFor="maxUploadMb">
                    {t('uploads.max_upload_size_mb')}
                  </label>
                  <input
                    id="maxUploadMb"
                    type="number"
                    className="form-control"
                    min={1}
                    max={2048}
                    step={1}
                    value={maxUploadMb}
                    onChange={(e) => setMaxUploadMb(Number(e.target.value))}
                  />
                  <small className="text-muted d-block mt-2">
                    {t('uploads.max_upload_size_mb_hint')}
                  </small>

                  <label
                    className="form-label fw-medium fs-13 mt-4"
                    htmlFor="allowedExtensions"
                  >
                    {t('uploads.allowed_extensions')}
                  </label>
                  <input
                    id="allowedExtensions"
                    type="text"
                    className="form-control"
                    value={allowedExtensions}
                    placeholder="pdf;png;jpg;docx;xlsx"
                    onChange={(e) => setAllowedExtensions(e.target.value)}
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                  />
                  <small className="text-muted d-block mt-2">
                    {t('uploads.allowed_extensions_hint')}
                  </small>

                  <label
                    className="form-label fw-medium fs-13 mt-4"
                    htmlFor="allowedMimes"
                  >
                    {t('uploads.allowed_mime_types')}
                  </label>
                  <textarea
                    id="allowedMimes"
                    className="form-control"
                    rows={8}
                    value={allowedMimes}
                    placeholder={'application/pdf\nimage/png\nimage/jpeg'}
                    onChange={(e) => setAllowedMimes(e.target.value)}
                    style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                  />
                  <small className="text-muted d-block mt-2">
                    {t('uploads.allowed_mime_types_hint')}
                  </small>
                </div>
                <div className="card-footer d-flex justify-content-end gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2"
                    disabled={savingUploads}
                  >
                    {savingUploads ? (
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
