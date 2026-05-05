import { useState, useEffect, FormEvent } from 'react';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';

interface EmailConfig {
  id: number;
  enabled: boolean;
  host: string | null;
  port: number;
  secure: boolean;
  username: string | null;
  fromEmail: string | null;
  fromName: string | null;
  hasPassword: boolean;
  updatedAt: string;
}

const EMPTY: Omit<EmailConfig, 'id' | 'updatedAt'> & { password: string } = {
  enabled: false,
  host: '',
  port: 587,
  secure: false,
  username: '',
  password: '',
  fromEmail: '',
  fromName: '',
  hasPassword: false,
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PlatformConfigPanel({ open, onClose }: Props) {
  const { token } = useAuth();
  const api = getApiBase();
  const { t } = useTranslation('common');

  const [activeTab, setActiveTab] = useState<'email' | 'limits'>('email');
  const [form, setForm] = useState({ ...EMPTY });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Platform Limits — singleton id=1, lido/escrito via /platform-config/limits.
  const [limitsForm, setLimitsForm] = useState({ maxTaskBusinessDays: 1300 });
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsSaving, setLimitsSaving] = useState(false);

  function h() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  // Load config when panel opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiFetch(`${api}/platform-config/email`, { headers: h() })
      .then(r => r.ok ? r.json() : null)
      .then((data: EmailConfig | null) => {
        if (data) {
          setForm({
            enabled:   data.enabled,
            host:      data.host      ?? '',
            port:      data.port,
            secure:    data.secure,
            username:  data.username  ?? '',
            password:  '',            // never pre-filled — server never returns it
            fromEmail: data.fromEmail ?? '',
            fromName:  data.fromName  ?? '',
            hasPassword: data.hasPassword,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Carrega limites em paralelo (separadamente para não bloquear o email).
    setLimitsLoading(true);
    apiFetch(`${api}/platform-config/limits`, { headers: h() })
      .then(r => r.ok ? r.json() : null)
      .then((data: { maxTaskBusinessDays?: number } | null) => {
        if (data && typeof data.maxTaskBusinessDays === 'number') {
          setLimitsForm({ maxTaskBusinessDays: data.maxTaskBusinessDays });
        }
      })
      .catch(() => {})
      .finally(() => setLimitsLoading(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveLimits(e: FormEvent) {
    e.preventDefault();
    setLimitsSaving(true);
    try {
      const res = await apiFetch(`${api}/platform-config/limits`, {
        method: 'PATCH',
        headers: h(),
        body: JSON.stringify({ maxTaskBusinessDays: Number(limitsForm.maxTaskBusinessDays) }),
      });
      if (res.ok) {
        await Swal.fire({
          icon: 'success', title: t('config.limits.saved'),
          timer: 1400, showConfirmButton: false,
        });
      } else {
        const body = await res.json().catch(() => ({}));
        await Swal.fire({
          icon: 'error', title: t('errors.generic'),
          text: Array.isArray(body.message) ? body.message.join(' · ') : (body.message ?? t('errors.generic')),
        });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: t('errors.generic'), text: t('errors.generic') });
    } finally {
      setLimitsSaving(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        enabled:   form.enabled,
        host:      form.host      || null,
        port:      Number(form.port),
        secure:    form.secure,
        username:  form.username  || null,
        fromEmail: form.fromEmail || null,
        fromName:  form.fromName  || null,
      };
      // Only send password if user typed something
      if (form.password.trim()) body.password = form.password.trim();

      const res = await apiFetch(`${api}/platform-config/email`, {
        method: 'PATCH',
        headers: h(),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data: EmailConfig = await res.json();
        setForm(f => ({
          ...f,
          hasPassword: data.hasPassword,
          password: '',
        }));
        await Swal.fire({
          position: 'top-end',
          icon: 'success',
          title: t('config.email.success_saved'),
          showConfirmButton: false,
          timer: 2000,
          toast: true,
        });
      } else {
        const err = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg = err.message;
        await Swal.fire({
          icon: 'error',
          title: t('errors.generic'),
          text: Array.isArray(msg) ? msg.join(' · ') : (msg ?? t('errors.generic')),
        });
      }
    } catch {
      await Swal.fire({ icon: 'error', title: t('errors.generic'), text: t('errors.generic') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop — visível apenas quando o painel está aberto */}
      <div
        className={`offcanvas-backdrop fade${open ? ' show' : ''}`}
        onClick={onClose}
        style={{ zIndex: 1044, display: open ? 'block' : 'none' }}
      />

      {/* Panel */}
      <div
        className={`offcanvas offcanvas-end${open ? ' show' : ''}`}
        style={{ width: '480px', zIndex: 1045 }}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="offcanvas-header border-bottom d-block p-0">
          <div className="d-flex align-items-center justify-content-between px-4 py-3">
            <div className="d-flex align-items-center gap-2">
              <div className="avatar avatar-sm bg-primary-transparent text-primary rounded d-flex align-items-center justify-content-center">
                <i className="ri-settings-3-line fs-18"></i>
              </div>
              <div>
                <h6 className="mb-0 fw-semibold fs-15">{t('config.email.tab_label')}</h6>
                <small className="text-muted">{t('nav.section.platform')}</small>
              </div>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label={t('actions.close')}
            />
          </div>

          {/* Tabs */}
          <nav className="border-top">
            <div className="nav nav-tabs nav-justified px-2" role="tablist">
              <button
                className={`nav-link py-3 fw-medium fs-13 d-flex align-items-center justify-content-center gap-2${activeTab === 'email' ? ' active' : ''}`}
                onClick={() => setActiveTab('email')}
                type="button"
              >
                <i className="ri-mail-settings-line"></i>
                {t('config.email.tab_label')}
              </button>
              <button
                className={`nav-link py-3 fw-medium fs-13 d-flex align-items-center justify-content-center gap-2${activeTab === 'limits' ? ' active' : ''}`}
                onClick={() => setActiveTab('limits')}
                type="button"
              >
                <i className="ri-shield-line"></i>
                {t('config.limits.tab_label')}
              </button>
            </div>
          </nav>
        </div>

        {/* Body */}
        <div className="offcanvas-body p-0" style={{ overflowY: 'auto' }}>
          {loading ? (
            <div className="d-flex align-items-center justify-content-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">...</span>
              </div>
            </div>
          ) : activeTab === 'email' ? (
            <form onSubmit={handleSave} noValidate>
              <div className="p-4 d-flex flex-column gap-4">

                {/* ── Estado ── */}
                <div className="card custom-card mb-0 border">
                  <div className="card-body">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h6 className="fw-semibold mb-1 fs-14">
                          <i className="ri-toggle-line me-2 text-primary"></i>
                          {t('config.email.enabled')}
                        </h6>
                      </div>
                      <div className="form-check form-switch ms-3 mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="emailEnabled"
                          checked={form.enabled}
                          onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                          style={{ width: '3rem', height: '1.5rem', cursor: 'pointer' }}
                        />
                      </div>
                    </div>
                    {form.enabled && (
                      <div className="mt-2">
                        <span className="badge bg-success-transparent text-success">
                          <i className="ri-checkbox-circle-line me-1"></i>{t('status.active')}
                        </span>
                      </div>
                    )}
                    {!form.enabled && (
                      <div className="mt-2">
                        <span className="badge bg-warning-transparent text-warning">
                          <i className="ri-error-warning-line me-1"></i>{t('status.inactive')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Servidor SMTP ── */}
                <div>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="ri-server-line text-primary fs-16"></i>
                    <span className="fw-semibold fs-14">{t('config.email.host')}</span>
                  </div>

                  <div className="row g-3">
                    <div className="col-8">
                      <label className="form-label fw-medium fs-13">
                        {t('config.email.host')} <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.host ?? ''}
                        onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                        placeholder="smtp.exemplo.com"
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label fw-medium fs-13">{t('config.email.port')}</label>
                      <input
                        type="number"
                        className="form-control"
                        value={form.port}
                        onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
                        min={1}
                        max={65535}
                      />
                    </div>
                    <div className="col-12">
                      <div className="card custom-card mb-0 border bg-light">
                        <div className="card-body py-2 px-3">
                          <div className="d-flex align-items-center justify-content-between">
                            <div>
                              <span className="fw-medium fs-13">
                                <i className="ri-lock-line me-1 text-primary"></i>
                                {t('config.email.secure')}
                              </span>
                            </div>
                            <div className="form-check form-switch mb-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="smtpSecure"
                                checked={form.secure}
                                onChange={e => {
                                  const secure = e.target.checked;
                                  setForm(f => ({
                                    ...f,
                                    secure,
                                    port: secure ? 465 : 587,
                                  }));
                                }}
                                style={{ width: '2.5rem', height: '1.25rem', cursor: 'pointer' }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Autenticação ── */}
                <div>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="ri-key-line text-primary fs-16"></i>
                    <span className="fw-semibold fs-14">{t('config.email.username')}</span>
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-medium fs-13">{t('config.email.username')}</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.username ?? ''}
                        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                        placeholder="utilizador@smtp.com"
                        autoComplete="off"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium fs-13">
                        {t('config.email.password')}
                        {form.hasPassword && (
                          <span className="badge bg-success-transparent text-success ms-2 fs-10">
                            <i className="ri-check-line me-1"></i>{t('config.email.has_password_hint')}
                          </span>
                        )}
                      </label>
                      <div className="input-group">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="form-control"
                          value={form.password}
                          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                          placeholder={form.hasPassword ? t('config.email.has_password_hint') : t('config.email.no_password_hint')}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="btn btn-light border"
                          onClick={() => setShowPassword(v => !v)}
                          tabIndex={-1}
                        >
                          <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Remetente ── */}
                <div>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="ri-mail-open-line text-primary fs-16"></i>
                    <span className="fw-semibold fs-14">{t('config.email.from_email')}</span>
                  </div>

                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-medium fs-13">
                        {t('config.email.from_email')} <span className="text-danger">*</span>
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        value={form.fromEmail ?? ''}
                        onChange={e => setForm(f => ({ ...f, fromEmail: e.target.value }))}
                        placeholder="noreply@meudominio.com"
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium fs-13">{t('config.email.from_name')}</label>
                      <input
                        type="text"
                        className="form-control"
                        value={form.fromName ?? ''}
                        onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))}
                        placeholder="Awesome Project App"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Pré-visualização ── */}
                {(form.fromEmail || form.fromName) && (
                  <div className="alert alert-primary-transparent d-flex align-items-center gap-2 py-2 mb-0">
                    <i className="ri-eye-line flex-shrink-0"></i>
                    <small>
                      <strong>
                        {form.fromName ? `${form.fromName} <${form.fromEmail}>` : form.fromEmail}
                      </strong>
                    </small>
                  </div>
                )}

              </div>

              {/* Footer sticky */}
              <div className="sticky-bottom bg-white border-top px-4 py-3 d-flex align-items-center justify-content-between gap-2">
                <small className="text-muted">
                  <i className="ri-information-line me-1"></i>
                  {t('config.email.no_password_hint')}
                </small>
                <button
                  type="submit"
                  className="btn btn-primary d-flex align-items-center gap-2"
                  disabled={saving}
                >
                  {saving
                    ? <><span className="spinner-border spinner-border-sm"></span>...</>
                    : <><i className="ri-save-line"></i>{t('config.email.save_btn')}</>}
                </button>
              </div>
            </form>
          ) : activeTab === 'limits' ? (
            limitsLoading ? (
              <div className="d-flex align-items-center justify-content-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">...</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveLimits} noValidate>
                <div className="p-4 d-flex flex-column gap-4">
                  <div className="card custom-card mb-0 border">
                    <div className="card-body">
                      <h6 className="fw-semibold mb-3 fs-14">
                        <i className="ri-time-line me-2 text-primary"></i>
                        {t('config.limits.max_task_business_days')}
                      </h6>
                      <div className="mb-2">
                        <input
                          type="number"
                          className="form-control"
                          min={1}
                          max={99999}
                          step={1}
                          value={limitsForm.maxTaskBusinessDays}
                          onChange={(e) => setLimitsForm({ maxTaskBusinessDays: Number(e.target.value) })}
                        />
                      </div>
                      <small className="text-muted d-block">
                        {t('config.limits.max_task_business_days_hint')}
                      </small>
                      <small className="text-muted d-block mt-1">
                        ≈ {(limitsForm.maxTaskBusinessDays / 260).toFixed(1)} {t('config.limits.years_calendar_estimate')}
                      </small>
                    </div>
                  </div>
                </div>
                <div className="border-top px-4 py-3 d-flex justify-content-end gap-2 bg-light">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={onClose}
                    disabled={limitsSaving}
                  >
                    {t('actions.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center gap-2"
                    disabled={limitsSaving}
                  >
                    {limitsSaving
                      ? <><span className="spinner-border spinner-border-sm"></span>...</>
                      : <><i className="ri-save-line"></i>{t('actions.save')}</>}
                  </button>
                </div>
              </form>
            )
          ) : null}
        </div>
      </div>
    </>
  );
}
