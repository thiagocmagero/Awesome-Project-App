import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import {
  NOTIFICATION_TYPES,
  NotificationPreference,
  NotificationType,
  NotificationChannel,
  isEnabled,
} from '../features/notifications/types';

export default function NotificationPreferencesPage() {
  const { token } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('notifications');
  const { t: tc } = useTranslation('common');

  const [prefs, setPrefs] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // key = `${type}_${channel}`
  // Disponibilidade do canal email — devolve `false` se o admin desligou OU
  // se as env vars SMTP estão em falta. A UI usa um único estado opaco; a
  // razão técnica nunca é exposta ao utilizador.
  const [emailAvailable, setEmailAvailable] = useState(true);

  const fetchPrefs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await apiFetch(`${api}/notifications/preferences`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setPrefs(await res.json());
    } finally {
      setLoading(false);
    }
  }, [token, api]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  // Disponibilidade do canal email (independente do load das prefs)
  useEffect(() => {
    if (!token) return;
    apiFetch(`${api}/platform-config/email/availability`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { available: boolean } | null) => {
        if (d) setEmailAvailable(d.available);
      })
      .catch(() => {/* fail-open: assume available; backend continua a validar no envio */});
  }, [token, api]);

  async function handleToggle(type: NotificationType, channel: NotificationChannel, newValue: boolean) {
    // Defesa em profundidade — o `disabled` do DOM já bloqueia, mas se algum
    // cliente contornar (ex.: chamada manual) ignoramos a mutação.
    if (channel === 'EMAIL' && !emailAvailable) return;
    const key = `${type}_${channel}`;
    setSaving(key);

    // Optimistic update
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
      showToast('success', t('success.saved'));
    } catch {
      // Revert optimistic update
      setPrefs((prev) =>
        prev.map((p) =>
          p.type === type && p.channel === channel ? { ...p, enabled: !newValue } : p,
        ),
      );
      showToast('danger', t('error.save'));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="container-fluid">
      {/* Breadcrumb */}
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

      {/* Card */}
      <div className="row">
        {!emailAvailable && (
          <div className="col-xl-10">
            <div className="alert alert-warning-transparent d-flex align-items-start gap-2 mb-3">
              <i className="ri-error-warning-line fs-16 mt-1" />
              <div className="fs-13">
                {t('email_unavailable.message')}{' '}
                <a href="mailto:support@awesomeproject.app">support@awesomeproject.app</a>
              </div>
            </div>
          </div>
        )}
        <div className="col-xl-10">
          <div className="card custom-card">
            <div className="card-header">
              <div className="card-title">{t('page.subtitle')}</div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="p-4 text-center text-muted">
                  <div className="spinner-border spinner-border-sm me-2" role="status" />
                  {tc('messages.loading')}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover text-nowrap mb-0">
                    <thead>
                      <tr>
                        <th className="ps-4" style={{ minWidth: 200 }}>{t('table.type')}</th>
                        <th style={{ minWidth: 260 }}>{t('table.description')}</th>
                        {/* IN_APP — active */}
                        <th className="text-center" style={{ width: 110 }}>
                          {t('table.in_app')}
                        </th>
                        {/* EMAIL — gated by EmailConfig.enabled + SMTP availability */}
                        <th className="text-center" style={{ width: 110 }}>
                          {emailAvailable ? (
                            t('table.email')
                          ) : (
                            <span className="d-flex flex-column align-items-center gap-1">
                              {t('table.email')}
                              <span className="badge bg-secondary-transparent text-secondary fs-10">
                                {t('table.email_unavailable')}
                              </span>
                            </span>
                          )}
                        </th>
                        {/* BROWSER — coming soon */}
                        <th className="text-center" style={{ width: 110 }}>
                          <span className="d-flex flex-column align-items-center gap-1">
                            {t('table.browser')}
                            <span className="badge bg-secondary-transparent text-secondary fs-10">
                              {t('table.coming_soon')}
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
                            <td className="ps-4 fw-medium">{t(`type.${type}`)}</td>
                            <td className="text-muted">{t(`desc.${type}`)}</td>

                            {/* IN_APP toggle */}
                            <td className="text-center">
                              <div className="form-check form-switch d-inline-flex justify-content-center">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  id={`toggle-${type}-IN_APP`}
                                  checked={inAppEnabled}
                                  disabled={saving === inAppKey}
                                  onChange={(e) => handleToggle(type, 'IN_APP', e.target.checked)}
                                />
                              </div>
                            </td>

                            {/* EMAIL toggle — disabled se canal indisponível */}
                            <td className="text-center">
                              <div className="form-check form-switch d-inline-flex justify-content-center">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  id={`toggle-${type}-EMAIL`}
                                  checked={emailEnabled}
                                  disabled={saving === emailKey || !emailAvailable}
                                  onChange={(e) => handleToggle(type, 'EMAIL', e.target.checked)}
                                />
                              </div>
                            </td>

                            {/* BROWSER — disabled placeholder */}
                            <td className="text-center">
                              <div
                                className="form-check form-switch d-inline-flex justify-content-center"
                                title={t('table.coming_soon')}
                              >
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  disabled
                                  checked={false}
                                  onChange={() => {}}
                                />
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
        </div>
      </div>
    </div>
  );
}
