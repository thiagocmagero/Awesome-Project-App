import { useEffect, useState, FormEvent } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiBase, apiFetch } from '../lib/api';

interface EmailConfig {
  id: number;
  enabled: boolean;
  fromEmail: string | null;
  fromName: string | null;
  updatedAt: string;
}

interface SmtpStatus {
  ready: boolean;
  host: string | null;
  port: number | null;
  missing: string[];
}

interface FormState {
  enabled: boolean;
  fromEmail: string;
  fromName: string;
}

const EMPTY: FormState = {
  enabled: false,
  fromEmail: '',
  fromName: '',
};

export default function EmailSettingsPage() {
  const { token, user } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('platform_config');
  const { t: tc } = useTranslation('common');

  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [smtp, setSmtp] = useState<SmtpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Gate: PLATFORM_ADMIN only — redireciona para dashboard caso contrário.
  if (user && user.profileCode !== 'PLATFORM_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  // Load config + smtp status em paralelo
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      apiFetch(`${api}/platform-config/email`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: EmailConfig | null) => {
          if (data) {
            setForm({
              enabled:   data.enabled,
              fromEmail: data.fromEmail ?? '',
              fromName:  data.fromName  ?? '',
            });
          }
        })
        .catch(() => {}),
      apiFetch(`${api}/platform-config/email/smtp-status`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: SmtpStatus | null) => {
          if (data) setSmtp(data);
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!token) return;

    if (form.enabled && !form.fromEmail.trim()) {
      showToast('warning', t('email.from_email_required'));
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        enabled:   form.enabled,
        fromEmail: form.fromEmail.trim() || null,
        fromName:  form.fromName.trim()  || null,
      };
      const res = await apiFetch(`${api}/platform-config/email`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { message?: string | string[] }).message;
        throw new Error(Array.isArray(msg) ? msg.join(' · ') : (msg ?? tc('errors.generic')));
      }
      showToast('success', t('email.success_saved'));
    } catch (err) {
      showToast('danger', (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Page Header */}
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{t('email.page_title')}</h1>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 breadcrumb-style2">
              <li className="breadcrumb-item">
                <NavLink to="/dashboard">{tc('nav.dashboard')}</NavLink>
              </li>
              <li className="breadcrumb-item">{tc('nav.section.platform')}</li>
              <li className="breadcrumb-item active" aria-current="page">
                {t('email.page_title')}
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
          <div className="col-xl-8">
            <form onSubmit={handleSave} noValidate>
              <div className="card custom-card">
                <div className="card-header">
                  <div className="card-title d-flex align-items-center gap-2">
                    <i className="ri-mail-settings-line text-primary fs-16"></i>
                    {t('email.tab_label')}
                  </div>
                </div>
                <div className="card-body">
                  <p className="text-muted fs-13 mb-4">{t('email.page_subtitle')}</p>

                  {/* SMTP status banner */}
                  {smtp && (
                    <div
                      className={`alert ${smtp.ready ? 'alert-success-transparent' : 'alert-warning-transparent'} d-flex align-items-start gap-2 mb-4`}
                      role="alert"
                    >
                      <i
                        className={`${smtp.ready ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'} fs-16 mt-1`}
                      />
                      <div className="flex-1">
                        <div className="fw-semibold fs-13 mb-1">
                          {smtp.ready ? t('email.smtp_status_ready') : t('email.smtp_status_missing')}
                        </div>
                        {smtp.ready && smtp.host && (
                          <div className="text-muted fs-12">
                            {t('email.smtp_host_label')}: <code>{smtp.host}</code>
                            {' · '}
                            {t('email.smtp_port_label')}: <code>{smtp.port}</code>
                          </div>
                        )}
                        {!smtp.ready && smtp.missing.length > 0 && (
                          <div className="text-muted fs-12">
                            <code>{smtp.missing.join(', ')}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Estado ── */}
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-2 fs-13 text-uppercase text-muted">
                      {t('email.section_status')}
                    </h6>
                    <div className="border rounded p-3 d-flex align-items-center justify-content-between">
                      <div>
                        <div className="fw-medium fs-14 mb-1">{t('email.enabled')}</div>
                        <small className="text-muted">{t('email.enabled_hint')}</small>
                      </div>
                      <div className="form-check form-switch ms-3 mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="emailEnabled"
                          checked={form.enabled}
                          onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                          style={{ width: '3rem', height: '1.5rem', cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Remetente ── */}
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-2 fs-13 text-uppercase text-muted">
                      {t('email.section_sender')}
                    </h6>
                    <div className="row g-3">
                      <div className="col-md-7">
                        <label className="form-label fw-medium fs-13" htmlFor="fromEmail">
                          {t('email.from_email')}
                          {form.enabled && <span className="text-danger ms-1">*</span>}
                        </label>
                        <input
                          id="fromEmail"
                          type="email"
                          className="form-control"
                          value={form.fromEmail}
                          onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))}
                          placeholder={t('email.from_email_placeholder')}
                        />
                      </div>
                      <div className="col-md-5">
                        <label className="form-label fw-medium fs-13" htmlFor="fromName">
                          {t('email.from_name')}
                        </label>
                        <input
                          id="fromName"
                          type="text"
                          className="form-control"
                          value={form.fromName}
                          onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))}
                          placeholder={t('email.from_name_placeholder')}
                        />
                      </div>
                    </div>

                    {(form.fromEmail || form.fromName) && (
                      <div className="alert alert-primary-transparent d-flex align-items-center gap-2 py-2 mt-3 mb-0">
                        <i className="ri-eye-line flex-shrink-0"></i>
                        <small>
                          <span className="text-muted me-2">{t('email.preview_label')}:</span>
                          <strong>
                            {form.fromName ? `${form.fromName} <${form.fromEmail || '...'}>` : form.fromEmail}
                          </strong>
                        </small>
                      </div>
                    )}
                  </div>
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
                        {t('email.save_btn')}
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
