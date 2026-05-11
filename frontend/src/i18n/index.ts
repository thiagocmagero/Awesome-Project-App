import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import type { BackendModule } from 'i18next';

const STORAGE_BUNDLE_KEY = (lng: string) => `i18n_bundle_${lng}`;
const STORAGE_VERSION_KEY = (lng: string) => `i18n_version_${lng}`;

// Wraps localStorage to handle Safari private mode and storage quota errors gracefully
const safeStorage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* quota / private mode — ignore */ }
  },
};

type BundleResult =
  | { fresh: false }
  | { fresh: true; version: string; data: Record<string, Record<string, unknown>> };

// Deduplicates the 22 parallel read() calls into a single fetch per language
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

  async read(language: string, namespace: string, callback: (err: Error | null, data: unknown) => void) {
    try {
      const storedVersion = safeStorage.get(STORAGE_VERSION_KEY(language));
      const storedBundle  = safeStorage.get(STORAGE_BUNDLE_KEY(language));
      const etag = storedVersion ? `"${storedVersion}"` : null;

      const result = await fetchBundle(language, etag);

      if (!result.fresh) {
        // 304 — serve from localStorage cache
        if (storedBundle) {
          const bundle = JSON.parse(storedBundle) as Record<string, Record<string, unknown>>;
          return callback(null, bundle[namespace] ?? {});
        }
        // 304 but no local cache (edge case: storage was cleared mid-session)
        return callback(null, {});
      }

      // 200 — persist fresh bundle and serve namespace
      safeStorage.set(STORAGE_BUNDLE_KEY(language), JSON.stringify(result.data));
      safeStorage.set(STORAGE_VERSION_KEY(language), result.version);
      callback(null, result.data[namespace] ?? {});
    } catch (err) {
      // Network error — fall back to stale cache rather than breaking the app
      const storedBundle = safeStorage.get(STORAGE_BUNDLE_KEY(language));
      if (storedBundle) {
        try {
          const bundle = JSON.parse(storedBundle) as Record<string, Record<string, unknown>>;
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
