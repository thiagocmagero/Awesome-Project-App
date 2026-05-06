import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiBase, apiFetch } from '../lib/api';
import { TimezoneSelect } from '../components/TimezoneSelect';

interface ActiveLocale {
  code: string;
  name: string;
  flag: string | null;
}

/**
 * Página "Conta" do utilizador — configurações pessoais.
 * Hoje: aba "Região e Idioma" com seletor de timezone.
 * Futuramente: nome, email (read-only por agora), idioma da UI, dateFormat user-level.
 *
 * Ver docs/claude/timezone.md.
 */
export default function UserSettingsPage() {
  const { user, refreshUser } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t, i18n } = useTranslation('account');
  const { t: tc } = useTranslation('common');

  const [savingTz, setSavingTz] = useState(false);
  // Local optimistic state — só usado para feedback visual; truth = user.timezone após refreshUser.
  const [tzValue, setTzValue] = useState<string | null>(user?.timezone ?? null);
  const lastSyncedTz = useRef<string | null>(user?.timezone ?? null);

  useEffect(() => {
    setTzValue(user?.timezone ?? null);
    lastSyncedTz.current = user?.timezone ?? null;
  }, [user?.timezone]);

  // Locale (idioma)
  const [savingLocale, setSavingLocale] = useState(false);
  const [localeValue, setLocaleValue] = useState<string | null>(user?.locale ?? null);
  const [locales, setLocales] = useState<ActiveLocale[]>([]);

  useEffect(() => {
    setLocaleValue(user?.locale ?? null);
  }, [user?.locale]);

  useEffect(() => {
    fetch('/api/i18n/locales/active')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLocales(data); })
      .catch(() => {});
  }, []);

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

  async function handleLocaleChange(next: string) {
    if (next === localeValue) return;
    const previous = localeValue;
    setLocaleValue(next);
    setSavingLocale(true);
    try {
      const res = await apiFetch(`${api}/users/me/locale`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: next }),
      });
      if (!res.ok) throw new Error('save failed');
      // Aplica imediatamente no i18next para a UI reflectir.
      i18n.changeLanguage(next).catch(() => {});
      await refreshUser();
      showToast('success', t('success.language_saved'));
    } catch {
      setLocaleValue(previous);
      showToast('danger', t('error.language_save'));
    } finally {
      setSavingLocale(false);
    }
  }

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between page-header-breadcrumb flex-wrap gap-2 mb-4">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-1 breadcrumb-style2">
              <li className="breadcrumb-item">
                <NavLink to="/dashboard">{tc('nav.dashboard')}</NavLink>
              </li>
              <li className="breadcrumb-item active" aria-current="page">
                {t('page.title')}
              </li>
            </ol>
          </nav>
          <h1 className="page-title fw-medium fs-18 mb-0">{t('page.title')}</h1>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-10">
          <div className="card custom-card">
            <div className="card-header">
              <div className="card-title">{t('page.subtitle')}</div>
            </div>
            <div className="card-body">
              <ul className="nav nav-tabs tab-style-2 nav-justified mb-3 d-sm-flex d-block" id="account-tabs" role="tablist">
                <li className="nav-item" role="presentation">
                  <button
                    type="button"
                    className="nav-link active"
                    data-bs-toggle="tab"
                    data-bs-target="#tab-account"
                    role="tab"
                    aria-controls="tab-account"
                    aria-selected="true"
                  >
                    {t('tab.account')}
                  </button>
                </li>
                <li className="nav-item" role="presentation">
                  <button
                    type="button"
                    className="nav-link"
                    data-bs-toggle="tab"
                    data-bs-target="#tab-region"
                    role="tab"
                    aria-controls="tab-region"
                    aria-selected="false"
                  >
                    {t('tab.region_language')}
                  </button>
                </li>
              </ul>

              <div className="tab-content">
                {/* Aba Conta — placeholder read-only */}
                <div
                  className="tab-pane fade show active"
                  id="tab-account"
                  role="tabpanel"
                >
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">{t('form.name')}</label>
                      <input
                        type="text"
                        className="form-control"
                        value={user?.name ?? ''}
                        readOnly
                        disabled
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
                  </div>
                </div>

                {/* Aba Região e Idioma — timezone + idioma */}
                <div
                  className="tab-pane fade"
                  id="tab-region"
                  role="tabpanel"
                >
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
