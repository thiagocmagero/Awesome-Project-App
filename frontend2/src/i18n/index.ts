import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import type { BackendModule, ResourceKey } from 'i18next';

/**
 * i18next setup — port literal de frontend/src/i18n/index.ts (regra 4).
 *
 * - Backend custom que faz fetch a `/api/v1/i18n/:locale` (bundle inteiro),
 *   cacheia em `localStorage`, e usa `If-None-Match` ETag para 304s.
 * - Detect: localStorage → navigator. Cache: `i18n_locale`.
 * - 23 namespaces registados (alinhado com `backend/prisma/seeds/translations/`).
 * - `missingKeyHandler`: reporta chaves em falta para o backend
 *   (apenas com user autenticado, anti-spam).
 */

const STORAGE_BUNDLE_KEY = (lng: string) => `i18n_bundle_${lng}`;
const STORAGE_VERSION_KEY = (lng: string) => `i18n_version_${lng}`;

const safeStorage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* quota / private mode — ignore */ }
  },
};

type BundleData = Record<string, ResourceKey>;

type BundleResult =
  | { fresh: false }
  | { fresh: true; version: string; data: BundleData };

const _pendingBundles = new Map<string, Promise<BundleResult>>();

async function fetchBundle(lng: string, etag: string | null): Promise<BundleResult> {
  const existing = _pendingBundles.get(lng);
  if (existing) return existing;

  const promise = (async (): Promise<BundleResult> => {
    const res = await fetch(`/api/v1/i18n/${lng}`, {
      headers: etag ? { 'If-None-Match': etag } : {},
    });
    if (res.status === 304) return { fresh: false };
    const { version, data } = await res.json();
    return { fresh: true, version, data };
  })();

  _pendingBundles.set(lng, promise);
  try {
    return await promise;
  } finally {
    _pendingBundles.delete(lng);
  }
}

const LocalStorageBackend: BackendModule = {
  type: 'backend',
  init() {},

  async read(language, namespace, callback) {
    try {
      const storedVersion = safeStorage.get(STORAGE_VERSION_KEY(language));
      const storedBundle  = safeStorage.get(STORAGE_BUNDLE_KEY(language));
      const etag = storedVersion ? `"${storedVersion}"` : null;

      const result = await fetchBundle(language, etag);

      if (!result.fresh) {
        if (storedBundle) {
          const bundle = JSON.parse(storedBundle) as BundleData;
          return callback(null, bundle[namespace] ?? {});
        }
        return callback(null, {});
      }

      safeStorage.set(STORAGE_BUNDLE_KEY(language), JSON.stringify(result.data));
      safeStorage.set(STORAGE_VERSION_KEY(language), result.version);
      callback(null, result.data[namespace] ?? {});
    } catch (err) {
      const storedBundle = safeStorage.get(STORAGE_BUNDLE_KEY(language));
      if (storedBundle) {
        try {
          const bundle = JSON.parse(storedBundle) as BundleData;
          return callback(null, bundle[namespace] ?? {});
        } catch { /* corrupt cache — fall through */ }
      }
      callback(err as Error, null);
    }
  },
};

i18n
  .use(LocalStorageBackend)
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
      'audit',
      'tags',
    ],
    backend: {},
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
      if (!safeStorage.get('app_user')) return;
      const locale = Array.isArray(lngs) ? lngs[0] : lngs;
      const csrfMatch = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
      const csrf = csrfMatch ? decodeURIComponent(csrfMatch[1]) : '';
      fetch('/api/v1/i18n/missing', {
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
