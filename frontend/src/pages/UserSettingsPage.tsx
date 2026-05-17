import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useToast } from '../contexts/ToastContext';
import { getApiBase, apiFetch } from '../lib/api';
import { TimezoneSelect } from '../components/TimezoneSelect';
import {
  NOTIFICATION_TYPES,
  NotificationPreference,
  NotificationType,
  NotificationChannel,
  isEnabled,
} from '../features/notifications/types';

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export default function UserSettingsPage() {
  const { user, refreshUser, token } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('account');
  const { t: tc } = useTranslation('common');
  const { t: tn } = useTranslation('notifications');

  // ── Timezone ─────────────────────────────────────────────────────────────
  const [savingTz, setSavingTz] = useState(false);
  const [tzValue, setTzValue] = useState<string | null>(user?.timezone ?? null);
  const lastSyncedTz = useRef<string | null>(user?.timezone ?? null);

  useEffect(() => {
    setTzValue(user?.timezone ?? null);
    lastSyncedTz.current = user?.timezone ?? null;
  }, [user?.timezone]);

  async function handleTimezoneChange(next: string | null) {
    if (next === tzValue) return;
    if (next === null && lastSyncedTz.current === null) return;
    const previous = tzValue;
    setTzValue(next);
    setSavingTz(true);
    try {
      const res = await apiFetch(`${api}/users/me/timezone`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: next }),
      });
      if (!res.ok) throw new Error('save failed');
      lastSyncedTz.current = next;
      await refreshUser();
      showToast('success', t('success.timezone_saved'));
    } catch {
      setTzValue(previous);
      showToast('danger', t('error.timezone_save'));
    } finally {
      setSavingTz(false);
    }
  }

  // ── Locale ────────────────────────────────────────────────────────────────
  const [savingLocale, setSavingLocale] = useState(false);
  const [localeValue, setLocaleValue] = useState<string | null>(user?.locale ?? null);
  const { urlLocale: currentUrlLocale, activeLocales: locales, setLocale: applyLocale } = useLocale();

  useEffect(() => {
    setLocaleValue(user?.locale ?? null);
  }, [user?.locale]);

  function handleLocaleChange(next: string) {
    if (next === localeValue) return;
    setLocaleValue(next);
    setSavingLocale(true);
    // applyLocale orquestra navigate(replace) + i18n.changeLanguage + PATCH
    // (fire-and-forget). Mostra toast optimista — em caso de falha o PATCH
    // fica silencioso e o user pode tentar de novo (raro: locale válido na
    // lista activa não falha o backend).
    applyLocale(next);
    showToast('success', t('success.language_saved'));
    setSavingLocale(false);
  }

  // ── Profile (name, phone, website, address) ───────────────────────────────
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profilePhone, setProfilePhone] = useState(user?.phone ?? '');
  const [profileWebsite, setProfileWebsite] = useState(user?.website ?? '');
  const [profileAddress, setProfileAddress] = useState(user?.address ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setProfileName(user?.name ?? '');
    setProfilePhone(user?.phone ?? '');
    setProfileWebsite(user?.website ?? '');
    setProfileAddress(user?.address ?? '');
  }, [user?.name, user?.phone, user?.website, user?.address]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await apiFetch(`${api}/users/me/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName || undefined,
          phone: profilePhone || null,
          website: profileWebsite || null,
          address: profileAddress || null,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      await refreshUser();
      showToast('success', t('success.profile_saved'));
    } catch {
      showToast('danger', t('error.profile_save'));
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Change Password ───────────────────────────────────────────────────────
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);

    if (pwNew.length < 8) {
      setPwError(t('change_password.min_length'));
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError(t('change_password.mismatch'));
      return;
    }

    setSavingPw(true);
    try {
      const res = await apiFetch(`${api}/users/me/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body?.message === 'INVALID_CURRENT_PASSWORD') {
          setPwError(t('change_password.invalid_current'));
        } else {
          throw new Error('save failed');
        }
        return;
      }
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
      showToast('success', t('success.password_changed'));
    } catch {
      showToast('danger', t('error.password_change'));
    } finally {
      setSavingPw(false);
    }
  }

  // ── Avatar (upload + remove) ───────────────────────────────────────────
  // Os botões só ficam activos se o backend confirmar que o storage S3 está
  // disponível (env vars AWS_* presentes). Quando indisponível mostramos
  // hint genérico — o utilizador final nunca vê motivos técnicos.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  /** Preview optimista (data URL) enquanto o upload está em curso. */
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    apiFetch(`${api}/platform-config/storage/availability`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { available: boolean } | null) => {
        if (d) setStorageAvailable(d.available);
      })
      .catch(() => {});
  }, [api]);

  async function handleAvatarFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação client-side (UX) — backend revalida via file-type magic bytes.
    if (file.size > 5 * 1024 * 1024) {
      showToast('danger', t('avatar.size_error'));
      e.target.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      showToast('danger', t('avatar.type_error'));
      e.target.value = '';
      return;
    }

    // Preview optimista — mostra a imagem enquanto o upload está em curso.
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await apiFetch(`${api}/users/me/avatar`, {
        method: 'POST',
        body: fd,
        // Sem `Content-Type` header — o browser injecta o boundary correcto.
      });
      if (!res.ok) throw new Error();
      await refreshUser();
      showToast('success', t('success.avatar_uploaded'));
    } catch {
      showToast('danger', t('avatar.upload_error'));
    } finally {
      setAvatarPreview(null);
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true);
    try {
      const res = await apiFetch(`${api}/users/me/avatar`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      await refreshUser();
      showToast('success', t('avatar.removed'));
    } catch {
      showToast('danger', t('avatar.upload_error'));
    } finally {
      setUploadingAvatar(false);
    }
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingPref, setSavingPref] = useState<string | null>(null);
  const [emailAvailable, setEmailAvailable] = useState(true);

  const fetchPrefs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch(`${api}/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPrefs(await res.json());
    } finally {
      setLoadingPrefs(false);
    }
  }, [token, api]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  useEffect(() => {
    if (!token) return;
    apiFetch(`${api}/platform-config/email/availability`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { available: boolean } | null) => {
        if (d) setEmailAvailable(d.available);
      })
      .catch(() => {});
  }, [token, api]);

  async function handleToggle(type: NotificationType, channel: NotificationChannel, newValue: boolean) {
    if (channel === 'EMAIL' && !emailAvailable) return;
    const key = `${type}_${channel}`;
    setSavingPref(key);

    setPrefs((prev) => {
      const existing = prev.find((p) => p.type === type && p.channel === channel);
      if (existing) {
        return prev.map((p) =>
          p.type === type && p.channel === channel ? { ...p, enabled: newValue } : p,
        );
      }
      return [...prev, { publicId: '', type, channel, enabled: newValue }];
    });

    try {
      const res = await apiFetch(`${api}/notifications/preferences/${type}/${channel}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: newValue }),
      });
      if (!res.ok) throw new Error();
      showToast('success', tn('success.saved'));
    } catch {
      setPrefs((prev) =>
        prev.map((p) =>
          p.type === type && p.channel === channel ? { ...p, enabled: !newValue } : p,
        ),
      );
      showToast('danger', tn('error.save'));
    } finally {
      setSavingPref(null);
    }
  }

  return (
    <div className="container-fluid">
      {/* Page header (Zynix profile-settings pattern: title first, breadcrumb below) */}
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{t('page.title')}</h1>
          <div>
            <nav aria-label="breadcrumb">
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <NavLink to={`/${currentUrlLocale}/`}>{tc('nav.dashboard')}</NavLink>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  {t('page.title')}
                </li>
              </ol>
            </nav>
          </div>
        </div>
      </div>

      <div className="row">
        {/* ── Left column (col-xl-3) — vertical nav + Change Password ── */}
        <div className="col-xl-3">
          {/* Vertical nav pills (tab-style-7) */}
          <div className="card custom-card">
            <div className="card-body p-2">
              <ul className="nav flex-column gap-1 nav-pills tab-style-7" id="account-tabs-nav" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    type="button"
                    className="nav-link bg-light active w-100 text-start d-flex align-items-center gap-2"
                    data-bs-toggle="tab"
                    data-bs-target="#tab-account"
                    role="tab"
                    aria-controls="tab-account"
                    aria-selected="true"
                  >
                    <i className="ri-user-3-line" />
                    {t('tab.account')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    type="button"
                    className="nav-link bg-light w-100 text-start d-flex align-items-center gap-2"
                    data-bs-toggle="tab"
                    data-bs-target="#tab-region"
                    role="tab"
                    aria-controls="tab-region"
                    aria-selected="false"
                  >
                    <i className="ri-global-line" />
                    {t('tab.region_language')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    type="button"
                    className="nav-link bg-light w-100 text-start d-flex align-items-center gap-2"
                    data-bs-toggle="tab"
                    data-bs-target="#tab-notifications"
                    role="tab"
                    aria-controls="tab-notifications"
                    aria-selected="false"
                  >
                    <i className="ri-notification-3-line" />
                    {t('tab.notifications')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    type="button"
                    className="nav-link bg-light w-100 text-start d-flex align-items-center gap-2"
                    data-bs-toggle="tab"
                    data-bs-target="#tab-security"
                    role="tab"
                    aria-controls="tab-security"
                    aria-selected="false"
                  >
                    <i className="ri-lock-line" />
                    {t('tab.security')}
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Change Password card */}
          <div className="card custom-card mt-3">
            <div className="card-header">
              <div className="card-title">{t('change_password.title')}</div>
            </div>
            <div className="card-body">
              <form onSubmit={handleChangePassword}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="pw-current">
                    {t('change_password.current')}
                  </label>
                  <input
                    id="pw-current"
                    type="password"
                    className="form-control"
                    value={pwCurrent}
                    onChange={(e) => setPwCurrent(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="pw-new">
                    {t('change_password.new')}
                  </label>
                  <input
                    id="pw-new"
                    type="password"
                    className="form-control"
                    value={pwNew}
                    onChange={(e) => setPwNew(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="pw-confirm">
                    {t('change_password.confirm')}
                  </label>
                  <input
                    id="pw-confirm"
                    type="password"
                    className="form-control"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                {pwError && (
                  <div className="alert alert-danger py-2 px-3 fs-13 mb-3">{pwError}</div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={savingPw}
                >
                  {savingPw ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status" />
                  ) : null}
                  {t('change_password.btn')}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Right column (col-xl-9) — tab content ── */}
        <div className="col-xl-9">
          <div className="card custom-card">
            <div className="tab-content">

              {/* ── Tab: Account ── */}
              <div
                className="tab-pane fade show active"
                id="tab-account"
                role="tabpanel"
              >
                <div className="card-header">
                  <div className="card-title">{t('tab.account')}</div>
                </div>
                <div className="card-body">
                  {/* Avatar section */}
                  <div className="d-flex align-items-center gap-4 mb-4 pb-3 border-bottom">
                    {avatarPreview || user?.avatarUrl ? (
                      <img
                        src={
                          avatarPreview ??
                          `${user!.avatarUrl}${
                            user!.avatarUpdatedAt
                              ? `?v=${encodeURIComponent(user!.avatarUpdatedAt)}`
                              : ''
                          }`
                        }
                        alt={user?.name ?? ''}
                        className="rounded-circle flex-shrink-0"
                        style={{
                          width: 80,
                          height: 80,
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center fw-semibold text-white fs-20 flex-shrink-0"
                        style={{ width: 80, height: 80, background: '#845adf' }}
                      >
                        {initialsOf(user?.name ?? '')}
                      </div>
                    )}
                    <div>
                      <div className="fw-semibold fs-15 mb-1">{user?.name}</div>
                      <div className="text-muted fs-13 mb-2">{user?.email}</div>
                      <div className="d-flex gap-2 align-items-center">
                        {/* Input file hidden — disparado pelo botão "Alterar Imagem". */}
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          style={{ display: 'none' }}
                          onChange={handleAvatarFileSelected}
                        />
                        <button
                          type="button"
                          className="btn btn-sm btn-light"
                          disabled={!storageAvailable || uploadingAvatar}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploadingAvatar ? (
                            <span
                              className="spinner-border spinner-border-sm me-1"
                              role="status"
                              aria-hidden="true"
                            />
                          ) : (
                            <i className="ri-camera-line me-1" />
                          )}
                          {uploadingAvatar ? t('avatar.uploading') : t('avatar.change')}
                        </button>
                        {user?.avatarUrl && (
                          <button
                            type="button"
                            className="btn btn-sm btn-light text-danger"
                            disabled={uploadingAvatar}
                            onClick={handleRemoveAvatar}
                          >
                            {t('avatar.remove')}
                          </button>
                        )}
                      </div>
                      {!storageAvailable && (
                        <div className="text-muted fs-12 mt-2">
                          {t('avatar.unavailable')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile form */}
                  <form onSubmit={handleSaveProfile}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="profile-name">
                          {t('form.name')}
                        </label>
                        <input
                          id="profile-name"
                          type="text"
                          className="form-control"
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">{t('form.email')}</label>
                        <input
                          type="email"
                          className="form-control"
                          value={user?.email ?? ''}
                          readOnly
                          disabled
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="profile-phone">
                          {t('form.phone')}
                        </label>
                        <input
                          id="profile-phone"
                          type="tel"
                          className="form-control"
                          placeholder={t('form.phone_placeholder')}
                          value={profilePhone}
                          onChange={(e) => setProfilePhone(e.target.value)}
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" htmlFor="profile-website">
                          {t('form.website')}
                        </label>
                        <input
                          id="profile-website"
                          type="url"
                          className="form-control"
                          placeholder={t('form.website_placeholder')}
                          value={profileWebsite}
                          onChange={(e) => setProfileWebsite(e.target.value)}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label" htmlFor="profile-address">
                          {t('form.address')}
                        </label>
                        <input
                          id="profile-address"
                          type="text"
                          className="form-control"
                          placeholder={t('form.address_placeholder')}
                          value={profileAddress}
                          onChange={(e) => setProfileAddress(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingProfile}
                      >
                        {savingProfile ? (
                          <span className="spinner-border spinner-border-sm me-2" role="status" />
                        ) : null}
                        {t('btn.save_changes')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* ── Tab: Region & Language ── */}
              <div
                className="tab-pane fade"
                id="tab-region"
                role="tabpanel"
              >
                <div className="card-header">
                  <div className="card-title">{t('tab.region_language')}</div>
                </div>
                <div className="card-body">
                  <div className="row g-4">
                    <div className="col-md-8">
                      <label className="form-label" htmlFor="user-timezone">
                        {t('form.timezone')}
                        {savingTz && (
                          <span className="ms-2 spinner-border spinner-border-sm" role="status" />
                        )}
                      </label>
                      <TimezoneSelect
                        id="user-timezone"
                        value={tzValue}
                        onChange={handleTimezoneChange}
                        placeholder={tc('timezone.placeholder')}
                        disabled={savingTz}
                      />
                      <div className="form-text">{t('form.timezone_hint')}</div>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label" htmlFor="user-locale">
                        {t('form.language')}
                        {savingLocale && (
                          <span className="ms-2 spinner-border spinner-border-sm" role="status" />
                        )}
                      </label>
                      <select
                        id="user-locale"
                        className="form-select"
                        value={localeValue ?? ''}
                        onChange={(e) => handleLocaleChange(e.target.value)}
                        disabled={savingLocale || locales.length === 0}
                      >
                        {!localeValue && <option value="" disabled>—</option>}
                        {locales.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                      <div className="form-text">{t('form.language_hint')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Tab: Notifications ── */}
              <div
                className="tab-pane fade"
                id="tab-notifications"
                role="tabpanel"
              >
                <div className="card-header">
                  <div className="card-title">{t('tab.notifications')}</div>
                </div>
                <div className="card-body p-0">
                  {!emailAvailable && (
                    <div className="mx-3 mt-3">
                      <div className="alert alert-warning-transparent d-flex align-items-start gap-2">
                        <i className="ri-error-warning-line fs-16 mt-1" />
                        <div className="fs-13">
                          {tn('email_unavailable.message')}{' '}
                          <a href="mailto:support@awesomeproject.app">support@awesomeproject.app</a>
                        </div>
                      </div>
                    </div>
                  )}
                  {loadingPrefs ? (
                    <div className="p-4 text-center text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status" />
                      {tc('messages.loading')}
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover text-nowrap mb-0">
                        <thead>
                          <tr>
                            <th className="ps-4" style={{ minWidth: 200 }}>{tn('table.type')}</th>
                            <th style={{ minWidth: 240 }}>{tn('table.description')}</th>
                            <th className="text-center" style={{ width: 110 }}>
                              {tn('table.in_app')}
                            </th>
                            <th className="text-center" style={{ width: 110 }}>
                              {emailAvailable ? (
                                tn('table.email')
                              ) : (
                                <span className="d-flex flex-column align-items-center gap-1">
                                  {tn('table.email')}
                                  <span className="badge bg-secondary-transparent text-secondary fs-10">
                                    {tn('table.email_unavailable')}
                                  </span>
                                </span>
                              )}
                            </th>
                            <th className="text-center" style={{ width: 110 }}>
                              <span className="d-flex flex-column align-items-center gap-1">
                                {tn('table.browser')}
                                <span className="badge bg-secondary-transparent text-secondary fs-10">
                                  {tn('table.coming_soon')}
                                </span>
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {NOTIFICATION_TYPES.map((type) => {
                            const inAppEnabled = isEnabled(prefs, type, 'IN_APP');
                            const emailEnabled = isEnabled(prefs, type, 'EMAIL');
                            const inAppKey = `${type}_IN_APP`;
                            const emailKey = `${type}_EMAIL`;
                            return (
                              <tr key={type}>
                                <td className="ps-4 fw-medium">{tn(`type.${type}`)}</td>
                                <td className="text-muted">{tn(`desc.${type}`)}</td>
                                <td className="text-center">
                                  <div className="toggle-switch">
                                    <input
                                      type="checkbox"
                                      id={`notif-toggle-${type}-IN_APP`}
                                      className="toggle toggle-success"
                                      checked={inAppEnabled}
                                      disabled={savingPref === inAppKey}
                                      onChange={(e) => handleToggle(type, 'IN_APP', e.target.checked)}
                                    />
                                    <label htmlFor={`notif-toggle-${type}-IN_APP`} />
                                  </div>
                                </td>
                                <td className="text-center">
                                  <div className="toggle-switch">
                                    <input
                                      type="checkbox"
                                      id={`notif-toggle-${type}-EMAIL`}
                                      className="toggle toggle-success"
                                      checked={emailEnabled}
                                      disabled={savingPref === emailKey || !emailAvailable}
                                      onChange={(e) => handleToggle(type, 'EMAIL', e.target.checked)}
                                    />
                                    <label htmlFor={`notif-toggle-${type}-EMAIL`} />
                                  </div>
                                </td>
                                <td className="text-center">
                                  <div className="toggle-switch" title={tn('table.coming_soon')}>
                                    <input
                                      type="checkbox"
                                      id={`notif-toggle-${type}-BROWSER`}
                                      className="toggle toggle-success"
                                      checked={false}
                                      disabled
                                      onChange={() => {}}
                                    />
                                    <label htmlFor={`notif-toggle-${type}-BROWSER`} />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Tab: Security ── */}
              <div
                className="tab-pane fade"
                id="tab-security"
                role="tabpanel"
              >
                <div className="card-header">
                  <div className="card-title">{t('security.title')}</div>
                </div>
                <div className="card-body">
                  {/* 2FA section */}
                  <div className="mb-4 pb-4 border-bottom">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h6 className="fw-semibold mb-1">{t('security.2fa.title')}</h6>
                        <p className="text-muted fs-13 mb-0">
                          {t('security.2fa.title')}
                        </p>
                      </div>
                      <span className="badge bg-secondary-transparent text-secondary">
                        {t('security.2fa.coming_soon')}
                      </span>
                    </div>
                  </div>

                  {/* Active Sessions section */}
                  <div>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h6 className="fw-semibold mb-1">{t('security.sessions.title')}</h6>
                        <p className="text-muted fs-13 mb-0">
                          {t('security.sessions.title')}
                        </p>
                      </div>
                      <NavLink to={`/${currentUrlLocale}/settings/sessions`} className="btn btn-sm btn-light">
                        {t('security.sessions.link')}
                        <i className="ri-arrow-right-line ms-1" />
                      </NavLink>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
