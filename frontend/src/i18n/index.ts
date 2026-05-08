import i18n from 'i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common',
      'auth',
      'dashboard',
      'users',
      'teams',
      'projects',
      'plans',
      'holidays',
      'planning',
      'permissions',
      'translations',
      'calendar',
      'gantt',
      'board',
      'sessions',
      'notifications',
      'timesheet',
      'account',
      'platform_config',
      'workspace_members',
      'files',
    ],
    backend: {
      loadPath: '/api/i18n/{{lng}}/{{ns}}',
    },
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18n_locale',
    },
    parseMissingKeyHandler: (key) => key,
    saveMissing: true,
    saveMissingTo: 'all',
    missingKeyHandler: (lngs, ns, key) => {
      // Só reporta se há user autenticado (cookie auth — /auth/me populou app_user no boot)
      if (!localStorage.getItem('app_user')) return;
      const locale = Array.isArray(lngs) ? lngs[0] : lngs;
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
      const csrf = csrfMatch ? decodeURIComponent(csrfMatch[1]) : '';
      fetch('/api/i18n/missing', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        body: JSON.stringify({ locale, namespace: ns, key }),
      }).catch(() => {});
    },
  });

export default i18n;
