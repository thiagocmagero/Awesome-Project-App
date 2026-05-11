import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { apiFetch, getApiBase } from '../lib/api';
import MissingKeysPanel from '../features/translations/MissingKeysPanel';

function getCsrfToken(): string {
  const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : '';
}

// ─── Types ────────────────────────────────────────────────────────────────────

type CellStatus = 'APPROVED' | 'AI_SUGGESTED' | 'MISSING';

interface CellData {
  value: string;
  status: CellStatus;
}

interface KeyEntry {
  key: string;
  cells: Record<string, CellData>; // locale code → cell data
}

interface NamespaceStat {
  namespace: string;
  total: number;
  missing: number;
  ai_suggested: number;
}

interface LocaleInfo {
  code: string;
  name: string;
  flag: string | null;
  isActive: boolean;
  isBuiltIn: boolean;
  order: number;
  total_keys?: number;
  missing?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NAMESPACE_DESCRIPTIONS: Record<string, string> = {
  common:       'global UI elements: buttons, status, system messages, sidebar navigation',
  auth:         'authentication: login, logout, register, credential errors',
  dashboard:    'dashboard with KPIs and platform usage metrics',
  users:        'user management: create, edit, deactivate, access profiles',
  teams:        'team management: create teams, add members, define lead',
  projects:     'project management: create projects, associate teams, invite members',
  plans:        'commercial plan management: limits, pricing, feature flags',
  holidays:     'management of holiday/non-working-day lists associated with projects',
  planning:     'project planning: tasks, dependencies, resources, Gantt chart',
  permissions:  'project permission management: roles, actions, delegation grants',
  translations: 'translation management backoffice',
  board:        'Kanban board: columns (states), cards, assignees, drag and drop',
  gantt:        'Gantt chart: tasks, links, resources, timeline view',
  sessions:     'user sessions: active devices, revoke access',
};

const LOCALE_NAMES: Record<string, string> = {
  'pt-PT': 'Português de Portugal',
  'pt-BR': 'Português do Brasil',
  'en':    'English',
  'es':    'Español',
};

type AIProvider = 'anthropic' | 'openai';

const AI_PROVIDERS: Record<AIProvider, { label: string; defaultModel: string; placeholder: string }> = {
  anthropic: { label: 'Anthropic (Claude)', defaultModel: 'claude-sonnet-4-6', placeholder: 'sk-ant-...' },
  openai:    { label: 'OpenAI (GPT)',        defaultModel: 'gpt-4o',            placeholder: 'sk-...'     },
};

// ─── AI API helpers ───────────────────────────────────────────────────────────

async function callClaudeAPI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: AI_PROVIDERS.anthropic.defaultModel,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[Claude API] Error response:', JSON.stringify(data, null, 2));
    const detail = data.error?.message ?? data.message ?? JSON.stringify(data);
    throw new Error(`${res.status}: ${detail}`);
  }
  return data.content[0].text.trim();
}

async function callOpenAIAPI(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_PROVIDERS.openai.defaultModel,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[OpenAI API] Error response:', JSON.stringify(data, null, 2));
    const detail = data.error?.message ?? data.message ?? JSON.stringify(data);
    throw new Error(`${res.status}: ${detail}`);
  }
  return (data.choices[0].message.content as string).trim();
}

async function callAIAPI(prompt: string, provider: AIProvider, apiKey: string): Promise<string> {
  return provider === 'openai' ? callOpenAIAPI(prompt, apiKey) : callClaudeAPI(prompt, apiKey);
}

function buildTranslationPrompt(params: {
  targetLocale: string;
  namespace: string;
  key: string;
  existingTranslations: Record<string, string>;
}): string {
  return `
És um tradutor especializado em software de gestão de projetos empresariais (B2B).
A aplicação é um backoffice de gestão de utilizadores, equipas, projetos e planeamento Gantt.
O tom é profissional, conciso e consistente.

Traduz o seguinte elemento de UI para ${LOCALE_NAMES[params.targetLocale] ?? params.targetLocale} (${params.targetLocale}).

Namespace: ${params.namespace} — ${NAMESPACE_DESCRIPTIONS[params.namespace] ?? ''}
Chave: ${params.key}

Traduções existentes (referência de tom e terminologia):
${Object.entries(params.existingTranslations)
    .filter(([, v]) => v)
    .map(([locale, value]) => `- ${LOCALE_NAMES[locale] ?? locale}: "${value}"`)
    .join('\n')}

Regras obrigatórias:
- Responde APENAS com o texto traduzido. Sem explicações, sem aspas, sem prefixos.
- Mantém placeholders como {{name}}, {{count}}, {{from}}, {{to}} exactamente como estão.
- Mantém o mesmo nível de formalidade das traduções de referência.
- Para pt-BR: vocabulário e ortografia brasileiros (ex: "usuário", "você", "clique").
- Para pt-PT: vocabulário e ortografia europeus (ex: "utilizador", "clique").
- Para textos de botão/acção: infinitivo (Guardar, Cancelar, Eliminar, Criar).
- Para mensagens de erro: frases curtas, sem ponto final se forem labels curtas.
  `.trim();
}

// ─── Cell component ───────────────────────────────────────────────────────────

interface CellProps {
  locale: string;
  keyName: string;
  cell: CellData;
  isEditing: boolean;
  editValue: string;
  isLoading: boolean;
  token: string;
  namespace: string;
  allCells: Record<string, CellData>;
  onStartEdit: (locale: string, key: string, value: string) => void;
  onEditChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onApprove: () => void;
  onReject: () => void;
  onAiTranslate: () => void;
}

function TranslationCell({
  cell, isEditing, editValue, isLoading,
  onStartEdit, onEditChange, onSave, onCancel,
  onApprove, onReject, onAiTranslate,
  locale, keyName,
}: CellProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const effectiveStatus: CellStatus =
    !cell.value ? 'MISSING' : cell.status === 'AI_SUGGESTED' ? 'AI_SUGGESTED' : 'APPROVED';

  const cellBg =
    effectiveStatus === 'MISSING'      ? 'rgba(220,53,69,0.07)' :
    effectiveStatus === 'AI_SUGGESTED' ? 'rgba(255,193,7,0.15)' :
    'transparent';

  if (isEditing) {
    return (
      <td style={{ padding: '4px 8px', background: cellBg, minWidth: 140 }}>
        <textarea
          ref={textareaRef}
          className="form-control form-control-sm"
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(); }
            if (e.key === 'Escape') onCancel();
          }}
          rows={2}
          style={{ fontSize: 12, resize: 'vertical' }}
        />
        <div className="d-flex gap-1 mt-1">
          <button type="button" className="btn btn-success btn-xs py-0 px-2 fs-11" onClick={onSave}>✓</button>
          <button type="button" className="btn btn-outline-secondary btn-xs py-0 px-2 fs-11" onClick={onCancel}>✗</button>
        </div>
      </td>
    );
  }

  return (
    <td
      style={{ padding: '4px 8px', background: cellBg, minWidth: 140, cursor: 'pointer', position: 'relative' }}
      className="translation-cell"
      title={`${locale}:${keyName}`}
      onClick={() => onStartEdit(locale, keyName, cell.value)}
    >
      {isLoading ? (
        <span className="spinner-border spinner-border-sm text-secondary" />
      ) : (
        <>
          <span className="fs-12" style={{ display: 'block', minHeight: 18 }}>
            {cell.value || <span className="text-danger fst-italic" style={{ fontSize: 11 }}>em falta</span>}
          </span>

          {effectiveStatus === 'AI_SUGGESTED' && (
            <div className="d-flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="btn btn-success btn-xs py-0 px-1 fs-10" onClick={onApprove} title="Aprovar">✓</button>
              <button type="button" className="btn btn-outline-danger btn-xs py-0 px-1 fs-10" onClick={onReject} title="Rejeitar">✗</button>
            </div>
          )}

          {(effectiveStatus === 'MISSING' || effectiveStatus === 'AI_SUGGESTED') && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-xs py-0 px-1 fs-10 ai-btn"
              style={{ position: 'absolute', top: 4, right: 4 }}
              title="Traduzir com IA"
              onClick={(e) => { e.stopPropagation(); onAiTranslate(); }}
            >
              ✨
            </button>
          )}

          {effectiveStatus === 'APPROVED' && cell.value && (
            <button
              type="button"
              className="btn btn-outline-secondary btn-xs py-0 px-1 fs-10 ai-btn-hover"
              style={{ position: 'absolute', top: 4, right: 4, display: 'none' }}
              title="Traduzir com IA"
              onClick={(e) => { e.stopPropagation(); onAiTranslate(); }}
            >
              ✨
            </button>
          )}
        </>
      )}
    </td>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TranslationsPage() {
  const { t } = useTranslation('translations');
  const { t: tc } = useTranslation('common');
  const { token } = useAuth();
  const { showToast } = useToast();
  const api = getApiBase();

  // AI Provider + keys (localStorage)
  const [aiProvider, setAiProvider] = useState<AIProvider>(
    () => (localStorage.getItem('ai_provider') as AIProvider) || 'anthropic',
  );
  const [anthropicKey, setAnthropicKey] = useState(() => localStorage.getItem('claude_api_key') || '');
  const [openaiKey, setOpenaiKey]       = useState(() => localStorage.getItem('openai_api_key') || '');
  const [showApiKey, setShowApiKey]     = useState(false);

  // Main tabs
  const [mainTab, setMainTab] = useState<'keys' | 'locales' | 'missing'>('keys');
  const [missingPending, setMissingPending] = useState<number>(0);

  // Keys tab
  const [nsStats, setNsStats] = useState<NamespaceStat[]>([]);
  const [activeNs, setActiveNs] = useState('common');
  const [subTab, setSubTab] = useState<'all' | 'missing' | 'ai'>('all');
  const [filter, setFilter] = useState('');
  const [keys, setKeys] = useState<KeyEntry[]>([]);
  const [locales, setLocales] = useState<LocaleInfo[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);

  // Global cross-namespace search
  const [globalResults, setGlobalResults] = useState<Array<{ namespace: string } & KeyEntry>>([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const nsDataCache = useRef<Record<string, KeyEntry[]>>({});

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ key: string; locale: string; value: string; namespace: string } | null>(null);

  // Cell AI loading
  const [cellLoading, setCellLoading] = useState<Set<string>>(new Set());

  // Bulk translation
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);
  const bulkCancelRef = useRef(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  // New key modal
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValues, setNewKeyValues] = useState<Record<string, string>>({});
  const [newKeyAiLoading, setNewKeyAiLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(false);

  // Locales tab
  const [allLocales, setAllLocales] = useState<LocaleInfo[]>([]);
  const [loadingLocales, setLoadingLocales] = useState(false);
  const [showNewLocaleModal, setShowNewLocaleModal] = useState(false);
  const [newLocaleCode, setNewLocaleCode] = useState('');
  const [newLocaleName, setNewLocaleName] = useState('');
  const [newLocaleFlag, setNewLocaleFlag] = useState('');
  const [savingLocale, setSavingLocale] = useState(false);
  const [togglingLocale, setTogglingLocale] = useState<string | null>(null);
  const [deletingLocale, setDeletingLocale] = useState<string | null>(null);
  const [showEditLocaleModal, setShowEditLocaleModal] = useState(false);
  const [editingLocale, setEditingLocale]             = useState<LocaleInfo | null>(null);
  const [editLocaleName, setEditLocaleName]           = useState('');
  const [editLocaleFlag, setEditLocaleFlag]           = useState('');
  const [savingLocaleEdit, setSavingLocaleEdit]       = useState(false);

  // ── Fetch locales list ──────────────────────────────────────────────────────
  const fetchLocales = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${api}/i18n/locales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setLocales(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
  }, [api, token]);

  // ── Fetch namespace stats ───────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${api}/i18n/backoffice/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.namespaces && typeof data.namespaces === 'object') {
          const stats: NamespaceStat[] = Object.entries(
            data.namespaces as Record<string, { total: number; missing: number; aiSuggested: number }>,
          )
            .map(([namespace, s]) => ({
              namespace,
              total: s.total,
              missing: s.missing,
              ai_suggested: s.aiSuggested,
            }))
            .sort((a, b) => a.namespace.localeCompare(b.namespace));
          setNsStats(stats);
        }
      }
    } catch { /* ignore */ }
  }, [api, token]);

  // ── Fetch keys for active namespace ────────────────────────────────────────
  const fetchKeys = useCallback(async (ns: string) => {
    if (!token) return;
    setLoadingKeys(true);
    try {
      const res = await fetch(`${api}/i18n/backoffice/${ns}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        // data: { namespace, keys: [{ key, translations: { [locale]: { value, status } } }] }
        const rawKeys: Array<Record<string, unknown>> = data.keys ?? [];
        const parsed: KeyEntry[] = rawKeys.map((row) => {
          const entry: KeyEntry = { key: row.key as string, cells: {} };
          // Backend returns { key, translations: { locale: { value, status } } }
          const translations = (row.translations as Record<string, { value: string; status: string }>) ?? {};
          for (const [locale, cell] of Object.entries(translations)) {
            const status: CellStatus =
              !cell.value ? 'MISSING' :
              cell.status === 'AI_SUGGESTED' ? 'AI_SUGGESTED' : 'APPROVED';
            entry.cells[locale] = { value: cell.value ?? '', status };
          }
          return entry;
        });
        setKeys(parsed);
      }
    } catch { /* ignore */ } finally {
      setLoadingKeys(false);
    }
  }, [api, token]);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchLocales();
    fetchStats();
  }, [fetchLocales, fetchStats]);

  // ── Missing keys badge ──────────────────────────────────────────────────────
  const fetchMissingStats = useCallback(async () => {
    try {
      const res = await apiFetch(`${api}/i18n/backoffice/missing/stats`);
      if (!res.ok) return;
      const data = (await res.json()) as { pending: number };
      setMissingPending(data.pending ?? 0);
    } catch { /* silent */ }
  }, [api]);

  useEffect(() => { fetchMissingStats(); }, [fetchMissingStats]);

  useEffect(() => {
    fetchKeys(activeNs);
    setSubTab('all');
    setEditingCell(null);
  }, [activeNs, fetchKeys]);

  // ── Fetch all locales (locales tab) ─────────────────────────────────────────
  const fetchAllLocales = useCallback(async () => {
    if (!token) return;
    setLoadingLocales(true);
    try {
      const res = await fetch(`${api}/i18n/locales`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAllLocales(await res.json());
    } catch { /* ignore */ } finally {
      setLoadingLocales(false);
    }
  }, [api, token]);

  useEffect(() => {
    if (mainTab === 'locales') fetchAllLocales();
  }, [mainTab, fetchAllLocales]);

  const namespaceList = useMemo(() => nsStats.map((s) => s.namespace), [nsStats]);

  // ── Global cross-namespace search ───────────────────────────────────────────
  useEffect(() => {
    if (!filter || !token || namespaceList.length === 0) {
      setGlobalResults([]);
      setGlobalSearchLoading(false);
      return;
    }
    setGlobalSearchLoading(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      const q = filter.toLowerCase();
      const allResults: Array<{ namespace: string } & KeyEntry> = [];
      for (const ns of namespaceList) {
        if (cancelled) break;
        let nsKeys = nsDataCache.current[ns];
        if (!nsKeys) {
          try {
            const res = await fetch(`${api}/i18n/backoffice/${ns}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              const rawKeys: Array<Record<string, unknown>> = data.keys ?? [];
              nsKeys = rawKeys.map((row) => {
                const entry: KeyEntry = { key: row.key as string, cells: {} };
                const translations = (row.translations as Record<string, { value: string; status: string }>) ?? {};
                for (const [locale, cell] of Object.entries(translations)) {
                  const status: CellStatus = !cell.value ? 'MISSING' : cell.status === 'AI_SUGGESTED' ? 'AI_SUGGESTED' : 'APPROVED';
                  entry.cells[locale] = { value: cell.value ?? '', status };
                }
                return entry;
              });
              nsDataCache.current[ns] = nsKeys;
            } else { nsKeys = []; }
          } catch { nsKeys = []; }
        }
        for (const row of nsKeys) {
          const matchesKey = row.key.toLowerCase().includes(q);
          const matchesValue = Object.values(row.cells).some((c) => c.value.toLowerCase().includes(q));
          if (matchesKey || matchesValue) allResults.push({ namespace: ns, ...row });
        }
      }
      if (!cancelled) { setGlobalResults(allResults); setGlobalSearchLoading(false); }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [filter, namespaceList, token, api]); // eslint-disable-line

  // ── AI provider helpers ─────────────────────────────────────────────────────
  const activeApiKey = aiProvider === 'anthropic' ? anthropicKey : openaiKey;

  function handleProviderChange(p: AIProvider) {
    setAiProvider(p);
    localStorage.setItem('ai_provider', p);
    setShowApiKey(false);
  }
  function handleSaveAnthropicKey(v: string) { setAnthropicKey(v); localStorage.setItem('claude_api_key', v); }
  function handleSaveOpenAIKey(v: string)    { setOpenaiKey(v);    localStorage.setItem('openai_api_key', v); }

  // ── Export seed ─────────────────────────────────────────────────────────────
  async function handleExportSeed() {
    if (!token) return;
    try {
      const res = await fetch(`${api}/i18n/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { showToast('danger', t('errors.export')); return; }
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'translations.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('danger', t('errors.export'));
    }
  }

  // ── Inline edit ─────────────────────────────────────────────────────────────
  function startEdit(locale: string, key: string, value: string, namespace: string = activeNs) {
    setEditingCell({ locale, key, value, namespace });
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  async function saveEdit() {
    if (!editingCell || !token) return;
    const { locale, key, value, namespace } = editingCell;
    try {
      const res = await fetch(`${api}/i18n/${locale}/${namespace}/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ value, status: 'APPROVED' }),
      });
      if (res.ok) {
        const updatedCell: CellData = { value, status: 'APPROVED' };
        if (namespace === activeNs) {
          setKeys((prev) =>
            prev.map((row) =>
              row.key === key ? { ...row, cells: { ...row.cells, [locale]: updatedCell } } : row,
            ),
          );
        }
        setGlobalResults((prev) =>
          prev.map((row) =>
            row.namespace === namespace && row.key === key
              ? { ...row, cells: { ...row.cells, [locale]: updatedCell } }
              : row,
          ),
        );
        delete nsDataCache.current[namespace];
        fetchStats();
      } else {
        showToast('danger', t('errors.save_translation'));
      }
    } catch {
      showToast('danger', tc('errors.generic'));
    }
    setEditingCell(null);
  }

  // ── Approve single AI_SUGGESTED cell ────────────────────────────────────────
  async function handleApprove(locale: string, key: string, namespace: string = activeNs) {
    if (!token) return;
    const sourceRow =
      keys.find((r) => r.key === key) ??
      globalResults.find((r) => r.namespace === namespace && r.key === key);
    const currentValue = sourceRow?.cells[locale]?.value ?? '';
    try {
      const res = await fetch(`${api}/i18n/${locale}/${namespace}/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ value: currentValue, status: 'APPROVED' }),
      });
      if (res.ok) {
        const patchApprove = (cells: Record<string, CellData>) =>
          ({ ...cells, [locale]: { ...cells[locale], status: 'APPROVED' as CellStatus } });
        if (namespace === activeNs)
          setKeys((prev) => prev.map((row) =>
            row.key === key && row.cells[locale] ? { ...row, cells: patchApprove(row.cells) } : row));
        setGlobalResults((prev) => prev.map((row) =>
          row.namespace === namespace && row.key === key && row.cells[locale]
            ? { ...row, cells: patchApprove(row.cells) } : row));
        fetchStats();
      } else {
        showToast('danger', t('errors.approve'));
      }
    } catch {
      showToast('danger', tc('errors.generic'));
    }
  }

  // ── Approve all AI_SUGGESTED in namespace ────────────────────────────────────
  async function handleApproveAll() {
    if (!token) return;
    try {
      const res = await fetch(`${api}/i18n/backoffice/${activeNs}/approve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'X-CSRF-Token': getCsrfToken() },
      });
      if (res.ok) {
        setKeys((prev) =>
          prev.map((row) => ({
            ...row,
            cells: Object.fromEntries(
              Object.entries(row.cells).map(([loc, cell]) => [
                loc,
                cell.status === 'AI_SUGGESTED' ? { ...cell, status: 'APPROVED' as CellStatus } : cell,
              ]),
            ),
          })),
        );
        fetchStats();
        showToast('success', t('actions.approve_all'));
      } else {
        showToast('danger', t('errors.approve'));
      }
    } catch {
      showToast('danger', tc('errors.generic'));
    }
  }

  // ── Reject AI_SUGGESTED ─────────────────────────────────────────────────────
  async function handleReject(locale: string, key: string, namespace: string = activeNs) {
    if (!token) return;
    try {
      const res = await fetch(`${api}/i18n/${locale}/${namespace}/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ value: '', status: 'APPROVED' }),
      });
      if (res.ok) {
        const missing: CellData = { value: '', status: 'MISSING' };
        if (namespace === activeNs)
          setKeys((prev) => prev.map((row) =>
            row.key === key ? { ...row, cells: { ...row.cells, [locale]: missing } } : row));
        setGlobalResults((prev) => prev.map((row) =>
          row.namespace === namespace && row.key === key
            ? { ...row, cells: { ...row.cells, [locale]: missing } } : row));
        fetchStats();
      } else {
        showToast('danger', t('errors.reject'));
      }
    } catch {
      showToast('danger', tc('errors.generic'));
    }
  }

  // ── AI translate single cell ─────────────────────────────────────────────────
  async function handleAiTranslate(locale: string, key: string, allCells: Record<string, CellData>, namespace: string = activeNs) {
    if (!activeApiKey) { showToast('warning', t('errors.api_key_configure', { provider: AI_PROVIDERS[aiProvider].label })); return; }
    if (!token) return;
    const cellId = `${locale}:${key}`;
    setCellLoading((prev) => new Set(prev).add(cellId));
    try {
      const existingTranslations: Record<string, string> = {};
      for (const [loc, cell] of Object.entries(allCells)) {
        if (loc !== locale && cell.value) existingTranslations[loc] = cell.value;
      }
      const prompt = buildTranslationPrompt({ targetLocale: locale, namespace, key, existingTranslations });
      const suggestion = await callAIAPI(prompt, aiProvider, activeApiKey);

      const res = await fetch(`${api}/i18n/${locale}/${namespace}/${encodeURIComponent(key)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ value: suggestion, status: 'AI_SUGGESTED' }),
      });
      if (res.ok) {
        const aiCell: CellData = { value: suggestion, status: 'AI_SUGGESTED' };
        if (namespace === activeNs)
          setKeys((prev) => prev.map((row) =>
            row.key === key ? { ...row, cells: { ...row.cells, [locale]: aiCell } } : row));
        setGlobalResults((prev) => prev.map((row) =>
          row.namespace === namespace && row.key === key
            ? { ...row, cells: { ...row.cells, [locale]: aiCell } } : row));
        fetchStats();
        if (!filter) setSubTab('ai');
      } else {
        showToast('danger', t('errors.save_ai'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      showToast('danger', t('errors.ai_error', { message: msg }));
    } finally {
      setCellLoading((prev) => { const s = new Set(prev); s.delete(cellId); return s; });
    }
  }

  // ── Bulk translate ───────────────────────────────────────────────────────────
  async function handleBulkTranslate() {
    if (!activeApiKey) { showToast('warning', t('errors.api_key_configure', { provider: AI_PROVIDERS[aiProvider].label })); return; }
    const missingCells: Array<{ locale: string; key: string; allCells: Record<string, CellData> }> = [];
    for (const row of keys) {
      for (const [locale, cell] of Object.entries(row.cells)) {
        if (!cell.value) missingCells.push({ locale, key: row.key, allCells: row.cells });
      }
    }
    if (missingCells.length === 0) { showToast('info', t('info.no_missing')); return; }

    setIsBulkTranslating(true);
    bulkCancelRef.current = false;
    setBulkProgress({ done: 0, total: missingCells.length });

    for (let i = 0; i < missingCells.length; i++) {
      if (bulkCancelRef.current) { showToast('info', t('info.cancelled')); break; }
      const { locale, key, allCells } = missingCells[i];
      await handleAiTranslate(locale, key, allCells);
      setBulkProgress({ done: i + 1, total: missingCells.length });
      if (i < missingCells.length - 1) await new Promise((r) => setTimeout(r, 300));
    }

    if (!bulkCancelRef.current) {
      showToast('success', t('progress.done'));
      setSubTab('ai');
    }
    setIsBulkTranslating(false);
    setBulkProgress(null);
  }

  // ── Delete key ──────────────────────────────────────────────────────────────
  async function handleDeleteKey(key: string) {
    if (!token) return;
    if (!window.confirm(t('confirm.delete_key', { key }))) return;
    try {
      const res = await fetch(`${api}/i18n/backoffice/${activeNs}/keys/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'X-CSRF-Token': getCsrfToken() },
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((r) => r.key !== key));
        fetchStats();
        showToast('success', t('success.key_deleted'));
      } else {
        showToast('danger', t('errors.delete_key'));
      }
    } catch {
      showToast('danger', tc('errors.generic'));
    }
  }

  // ── Create new key ──────────────────────────────────────────────────────────
  async function handleCreateKey() {
    const keyRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,2}$/;
    if (!keyRegex.test(newKeyName)) {
      showToast('danger', t('errors.invalid_key_format'));
      return;
    }
    if (!token) return;
    setSavingKey(true);
    try {
      const res = await fetch(`${api}/i18n/backoffice/${activeNs}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ key: newKeyName, values: newKeyValues }),
      });
      if (res.ok) {
        showToast('success', t('success.key_created'));
        setShowNewKeyModal(false);
        setNewKeyName('');
        setNewKeyValues({});
        await fetchKeys(activeNs);
        fetchStats();
      } else {
        const body = await res.json().catch(() => ({}));
        showToast('danger', body.message ?? t('errors.create_key'));
      }
    } catch {
      showToast('danger', tc('errors.generic'));
    } finally {
      setSavingKey(false);
    }
  }

  async function handleAiFillNewKey() {
    if (!activeApiKey) { showToast('warning', t('errors.api_key_configure', { provider: AI_PROVIDERS[aiProvider].label })); return; }
    const existingTranslations: Record<string, string> = {};
    for (const [loc, val] of Object.entries(newKeyValues)) {
      if (val) existingTranslations[loc] = val;
    }
    setNewKeyAiLoading(true);
    try {
      for (const locale of locales.map((l) => l.code)) {
        if (newKeyValues[locale]) continue; // already filled
        const prompt = buildTranslationPrompt({
          targetLocale: locale,
          namespace: activeNs,
          key: newKeyName || 'new.key',
          existingTranslations,
        });
        const suggestion = await callAIAPI(prompt, aiProvider, activeApiKey);
        setNewKeyValues((prev) => ({ ...prev, [locale]: suggestion }));
        existingTranslations[locale] = suggestion;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      showToast('danger', t('errors.ai_error', { message: msg }));
    } finally {
      setNewKeyAiLoading(false);
    }
  }

  // ── Locale management ────────────────────────────────────────────────────────
  async function handleToggleLocale(code: string, isActive: boolean) {
    if (!token) return;
    setTogglingLocale(code);
    try {
      const res = await fetch(`${api}/i18n/locales/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (res.ok) {
        setAllLocales((prev) =>
          prev.map((l) => (l.code === code ? { ...l, isActive: !isActive } : l)),
        );
        fetchLocales();
      } else {
        showToast('danger', t('errors.update_locale'));
      }
    } catch {
      showToast('danger', tc('errors.generic'));
    } finally {
      setTogglingLocale(null);
    }
  }

  async function handleDeleteLocale(code: string) {
    if (!token) return;
    if (!window.confirm(t('confirm.delete_locale', { code }))) return;
    setDeletingLocale(code);
    try {
      const res = await fetch(`${api}/i18n/locales/${code}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'X-CSRF-Token': getCsrfToken() },
      });
      if (res.ok) {
        setAllLocales((prev) => prev.filter((l) => l.code !== code));
        fetchLocales();
        showToast('success', t('success.locale_deleted'));
      } else {
        const body = await res.json().catch(() => ({}));
        showToast('danger', body.message ?? t('errors.delete_locale'));
      }
    } catch {
      showToast('danger', tc('errors.generic'));
    } finally {
      setDeletingLocale(null);
    }
  }

  async function handleCreateLocale() {
    const codeRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
    if (!codeRegex.test(newLocaleCode)) {
      showToast('danger', t('errors.invalid_locale_code'));
      return;
    }
    if (!newLocaleName.trim()) { showToast('danger', t('errors.locale_name_required')); return; }
    if (!token) return;
    setSavingLocale(true);
    try {
      const res = await fetch(`${api}/i18n/locales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({
          code: newLocaleCode,
          name: newLocaleName,
          flag: newLocaleFlag || undefined,
        }),
      });
      if (res.ok) {
        showToast('success', t('success.locale_created'));
        setShowNewLocaleModal(false);
        setNewLocaleCode('');
        setNewLocaleName('');
        setNewLocaleFlag('');
        await fetchAllLocales();
        fetchLocales();
      } else {
        const body = await res.json().catch(() => ({}));
        showToast('danger', body.message ?? t('errors.create_locale'));
      }
    } catch {
      showToast('danger', tc('errors.generic'));
    } finally {
      setSavingLocale(false);
    }
  }

  async function handleEditLocale() {
    if (!editingLocale || !token) return;
    if (!editLocaleName.trim()) { showToast('danger', t('errors.locale_name_required')); return; }
    setSavingLocaleEdit(true);
    try {
      const res = await fetch(`${api}/i18n/locales/${editingLocale.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-CSRF-Token': getCsrfToken() },
        body: JSON.stringify({ name: editLocaleName, flag: editLocaleFlag || undefined }),
      });
      if (!res.ok) { showToast('danger', t('errors.update_locale')); return; }
      setAllLocales(prev =>
        prev.map(l => l.code === editingLocale.code
          ? { ...l, name: editLocaleName, flag: editLocaleFlag || null }
          : l
        )
      );
      setShowEditLocaleModal(false);
      showToast('success', t('success.locale_updated'));
    } catch {
      showToast('danger', tc('errors.generic'));
    } finally {
      setSavingLocaleEdit(false);
    }
  }

  // ── Filtered keys ────────────────────────────────────────────────────────────
  const filteredKeys = keys.filter((row) => {
    if (filter) {
      const q = filter.toLowerCase();
      const matchesKey = row.key.toLowerCase().includes(q);
      const matchesValue = Object.values(row.cells).some((c) => c.value.toLowerCase().includes(q));
      if (!matchesKey && !matchesValue) return false;
    }
    if (subTab === 'missing') {
      return Object.values(row.cells).some((c) => !c.value);
    }
    if (subTab === 'ai') {
      return Object.values(row.cells).some((c) => c.status === 'AI_SUGGESTED');
    }
    return true;
  });

  const countSource = filter ? globalResults : keys;
  const missingCount = countSource.reduce((acc, row) =>
    acc + Object.values(row.cells).filter((c) => !c.value).length, 0);
  const aiCount = countSource.reduce((acc, row) =>
    acc + Object.values(row.cells).filter((c) => c.status === 'AI_SUGGESTED').length, 0);

  // ── Stats helpers ────────────────────────────────────────────────────────────
  function getNsStat(ns: string): NamespaceStat {
    return nsStats.find((s) => s.namespace === ns) ?? { namespace: ns, total: 0, missing: 0, ai_suggested: 0 };
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Page header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h4 className="fw-semibold mb-1">{t('page.title')}</h4>
          <p className="text-muted fs-13 mb-0">{t('page.subtitle')}</p>
        </div>
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={handleExportSeed}>
          <i className="ti ti-download me-1" />
          {t('actions.export_seed')}
        </button>
      </div>

      {/* AI Provider + API Key */}
      <div className="card mb-3">
        <div className="card-body py-2">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <label className="form-label mb-0 fw-medium text-nowrap fs-13">
              <i className="ti ti-robot me-1 text-primary" />
              IA
            </label>
            {/* Provider selector — radio pills */}
            <div className="btn-group btn-group-sm" role="group">
              {(Object.keys(AI_PROVIDERS) as AIProvider[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`btn ${aiProvider === p ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => handleProviderChange(p)}
                >
                  {AI_PROVIDERS[p].label}
                </button>
              ))}
            </div>
            {/* Dynamic API key field */}
            <div className="input-group" style={{ maxWidth: 400 }}>
              <span className="input-group-text input-group-text-sm">
                <i className="ti ti-key fs-12" />
              </span>
              <input
                type={showApiKey ? 'text' : 'password'}
                className="form-control form-control-sm"
                placeholder={AI_PROVIDERS[aiProvider].placeholder}
                value={aiProvider === 'anthropic' ? anthropicKey : openaiKey}
                onChange={(e) =>
                  aiProvider === 'anthropic'
                    ? handleSaveAnthropicKey(e.target.value)
                    : handleSaveOpenAIKey(e.target.value)
                }
              />
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowApiKey((v) => !v)}
              >
                <i className={`ti ${showApiKey ? 'ti-eye-off' : 'ti-eye'}`} />
              </button>
            </div>
            <span className="text-muted fs-11">{t('api_key.hint_full')}</span>
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <div className="card">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs" role="tablist">
            <li className="nav-item">
              <button
                className={`nav-link${mainTab === 'keys' ? ' active' : ''}`}
                onClick={() => setMainTab('keys')}
              >
                <i className="ti ti-key me-1" />
                {t('tabs.keys')}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link${mainTab === 'locales' ? ' active' : ''}`}
                onClick={() => setMainTab('locales')}
              >
                <i className="ti ti-language me-1" />
                {t('tabs.locales')}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link${mainTab === 'missing' ? ' active' : ''}`}
                onClick={() => setMainTab('missing')}
              >
                <i className="ti ti-radar me-1" />
                {t('tabs.missing_keys')}
                {missingPending > 0 && (
                  <span className="badge bg-danger ms-2 fs-10">{missingPending}</span>
                )}
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-0">

          {/* ── Tab: Chaves ─────────────────────────────────────────────── */}
          {mainTab === 'keys' && (
            <div>
              {/* Namespace tabs */}
              <div className="border-bottom px-3 pt-2" style={{ overflowX: 'auto', whiteSpace: 'nowrap' }}>
                <div className="d-flex gap-1 pb-0">
                  {namespaceList.map((ns) => {
                    const stat = getNsStat(ns);
                    const hasIssues = stat.missing + stat.ai_suggested > 0;
                    return (
                      <button
                        key={ns}
                        type="button"
                        className={`btn btn-sm me-1 mb-2${activeNs === ns ? ' btn-primary' : ' btn-outline-secondary'}`}
                        onClick={() => { setActiveNs(ns); if (filter) setFilter(''); }}
                      >
                        {ns}
                        {hasIssues ? (
                          <span className="badge bg-danger ms-1 fs-10">{stat.missing + stat.ai_suggested}</span>
                        ) : stat.total > 0 ? (
                          <span className="ms-1 text-success fs-10">✓</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search bar — linha separada, largura total */}
              <div className="px-3 py-2 border-bottom">
                <div className="input-group input-group-sm">
                  <span className="input-group-text">
                    {globalSearchLoading
                      ? <span className="spinner-border spinner-border-sm" />
                      : <i className="ti ti-search" />}
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('filter_placeholder')}
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                  {filter && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setFilter('')}
                      title={tc('actions.clear')}
                    >
                      <i className="ti ti-x fs-12" />
                    </button>
                  )}
                </div>
                {filter && !globalSearchLoading && (
                  <small className="text-muted mt-1 d-block">
                    {globalResults.length} resultado(s) em todos os namespaces
                  </small>
                )}
              </div>

              {/* Sub-tabs + actions */}
              <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom flex-wrap gap-2">
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className={`btn btn-xs${subTab === 'all' ? ' btn-secondary' : ' btn-outline-secondary'}`}
                    onClick={() => setSubTab('all')}
                  >
                    {t('subtabs.all')} ({filter ? globalResults.length : keys.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs${subTab === 'missing' ? ' btn-danger' : ' btn-outline-danger'}`}
                    onClick={() => setSubTab('missing')}
                  >
                    🔴 {t('subtabs.missing')} ({missingCount})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs${subTab === 'ai' ? ' btn-warning text-dark' : ' btn-outline-warning'}`}
                    onClick={() => setSubTab('ai')}
                  >
                    🟡 {t('subtabs.review')} ({aiCount})
                  </button>
                </div>
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  {isBulkTranslating ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => { bulkCancelRef.current = true; }}
                    >
                      ✗ {tc('actions.cancel')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleBulkTranslate}
                    >
                      ✨ {t('actions.translate_missing')}
                    </button>
                  )}
                  {aiCount > 0 && !isBulkTranslating && (
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={handleApproveAll}
                    >
                      <i className="ti ti-checks me-1" />
                      {t('actions.approve_all')} ({aiCount})
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                      setNewKeyName('');
                      setNewKeyValues({});
                      setShowNewKeyModal(true);
                    }}
                  >
                    + {t('actions.new_key')}
                  </button>
                </div>
              </div>

              {/* Progress bar — visible during bulk translation */}
              {bulkProgress && (
                <div className="px-3 pt-2 pb-1 border-bottom">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <small className="text-muted">
                      {t('progress.translating', { current: bulkProgress.done, total: bulkProgress.total })}
                    </small>
                    <small className="fw-semibold text-primary">
                      {Math.round((bulkProgress.done / bulkProgress.total) * 100)}%
                    </small>
                  </div>
                  <div className="progress" style={{ height: 6 }}>
                    <div
                      className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                      style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%`, transition: 'width 0.3s ease' }}
                    />
                  </div>
                </div>
              )}

              {/* Keys table */}
              <div style={{ overflowX: 'auto' }}>
                {filter ? (
                  /* ── Resultados globais (todos os namespaces) ── */
                  globalSearchLoading ? (
                    <div className="text-center py-5">
                      <span className="spinner-border text-primary" />
                    </div>
                  ) : globalResults.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="ti ti-search fs-2 d-block mb-2" />
                      {t('empty_keys')}
                    </div>
                  ) : (
                    <table className="table table-bordered table-sm mb-0 fs-12" style={{ tableLayout: 'auto' }}>
                      <thead className="table-light">
                        <tr>
                          <th style={{ minWidth: 90, position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 2 }}>
                            NS
                          </th>
                          <th style={{ minWidth: 200, position: 'sticky', left: 90, background: '#f8f9fa', zIndex: 2 }}>
                            {t('table.key')}
                          </th>
                          {locales.map((loc) => (
                            <th key={loc.code} style={{ minWidth: 140 }}>
                              {loc.flag && (
                                <img
                                  src={`/assets/images/flags/${loc.flag}`}
                                  alt={loc.name}
                                  style={{ width: 16, height: 12, objectFit: 'cover', marginRight: 4, borderRadius: 2 }}
                                />
                              )}
                              {loc.code.toUpperCase()}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {globalResults.map((row) => (
                          <tr key={`${row.namespace}:${row.key}`}>
                            <td style={{ position: 'sticky', left: 0, background: '#fff', zIndex: 1, padding: '4px 8px' }}>
                              <span
                                className="badge bg-primary-transparent text-primary fs-11"
                                title={`namespace: ${row.namespace}`}
                              >
                                {row.namespace}
                              </span>
                            </td>
                            <td
                              style={{
                                position: 'sticky', left: 90, background: '#fff', zIndex: 1,
                                fontFamily: 'monospace', fontSize: 11, padding: '4px 8px',
                                maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}
                              title={row.key}
                            >
                              {row.key}
                            </td>
                            {locales.map((loc) => {
                              const cell: CellData = row.cells[loc.code] ?? { value: '', status: 'MISSING' };
                              const isEditing =
                                editingCell?.key === row.key &&
                                editingCell?.locale === loc.code &&
                                editingCell?.namespace === row.namespace;
                              const cellId = `${loc.code}:${row.key}:${row.namespace}`;
                              return (
                                <TranslationCell
                                  key={loc.code}
                                  locale={loc.code}
                                  keyName={row.key}
                                  cell={cell}
                                  isEditing={isEditing}
                                  editValue={isEditing ? editingCell!.value : ''}
                                  isLoading={cellLoading.has(cellId)}
                                  token={token ?? ''}
                                  namespace={row.namespace}
                                  allCells={row.cells}
                                  onStartEdit={(locale, key, value) => startEdit(locale, key, value, row.namespace)}
                                  onEditChange={(v) => setEditingCell((prev) => prev ? { ...prev, value: v } : prev)}
                                  onSave={saveEdit}
                                  onCancel={cancelEdit}
                                  onApprove={() => handleApprove(loc.code, row.key, row.namespace)}
                                  onReject={() => handleReject(loc.code, row.key, row.namespace)}
                                  onAiTranslate={() => handleAiTranslate(loc.code, row.key, row.cells, row.namespace)}
                                />
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                ) : loadingKeys ? (
                  <div className="text-center py-5">
                    <span className="spinner-border text-primary" />
                  </div>
                ) : filteredKeys.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="ti ti-search fs-2 d-block mb-2" />
                    {t('empty_keys')}
                  </div>
                ) : (
                  <table className="table table-bordered table-sm mb-0 fs-12" style={{ tableLayout: 'auto' }}>
                    <thead className="table-light">
                      <tr>
                        <th style={{ minWidth: 200, position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 2 }}>
                          {t('table.key')}
                        </th>
                        {locales.map((loc) => (
                          <th key={loc.code} style={{ minWidth: 140 }}>
                            {loc.flag && (
                              <img
                                src={`/assets/images/flags/${loc.flag}`}
                                alt={loc.name}
                                style={{ width: 16, height: 12, objectFit: 'cover', marginRight: 4, borderRadius: 2 }}
                              />
                            )}
                            {loc.code.toUpperCase()}
                          </th>
                        ))}
                        <th style={{ width: 40 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredKeys.map((row) => (
                        <tr key={row.key}>
                          <td
                            style={{
                              position: 'sticky', left: 0, background: '#fff',
                              zIndex: 1, fontFamily: 'monospace', fontSize: 11,
                              padding: '4px 8px', maxWidth: 240,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                            title={row.key}
                          >
                            {row.key}
                          </td>
                          {locales.map((loc) => {
                            const cell: CellData = row.cells[loc.code] ?? { value: '', status: 'MISSING' };
                            const isEditing =
                              editingCell?.key === row.key && editingCell?.locale === loc.code && editingCell?.namespace === activeNs;
                            const cellId = `${loc.code}:${row.key}`;
                            return (
                              <TranslationCell
                                key={loc.code}
                                locale={loc.code}
                                keyName={row.key}
                                cell={cell}
                                isEditing={isEditing}
                                editValue={isEditing ? editingCell!.value : ''}
                                isLoading={cellLoading.has(cellId)}
                                token={token ?? ''}
                                namespace={activeNs}
                                allCells={row.cells}
                                onStartEdit={startEdit}
                                onEditChange={(v) => setEditingCell((prev) => prev ? { ...prev, value: v } : prev)}
                                onSave={saveEdit}
                                onCancel={cancelEdit}
                                onApprove={() => handleApprove(loc.code, row.key)}
                                onReject={() => handleReject(loc.code, row.key)}
                                onAiTranslate={() => handleAiTranslate(loc.code, row.key, row.cells)}
                              />
                            );
                          })}
                          <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-xs py-0 px-1"
                              title={t('btn_delete_key')}
                              onClick={() => handleDeleteKey(row.key)}
                            >
                              <i className="ti ti-trash fs-12" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── Tab: Idiomas ────────────────────────────────────────────── */}
          {mainTab === 'locales' && (
            <div className="p-3">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="fw-semibold mb-0">{t('locales.section_title')}</h6>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setNewLocaleCode('');
                    setNewLocaleName('');
                    setNewLocaleFlag('');
                    setShowNewLocaleModal(true);
                  }}
                >
                  + {t('actions.new_locale')}
                </button>
              </div>

              {loadingLocales ? (
                <div className="text-center py-5">
                  <span className="spinner-border text-primary" />
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-sm fs-13">
                    <thead className="table-light">
                      <tr>
                        <th>{t('locales.table.code')}</th>
                        <th>{t('locales.table.name')}</th>
                        <th>{t('locales.table.flag')}</th>
                        <th>{t('locales.table.status')}</th>
                        <th>{t('locales.table.keys')}</th>
                        <th>{t('locales.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allLocales.map((loc) => (
                        <tr key={loc.code}>
                          <td><code>{loc.code}</code></td>
                          <td>{loc.name}</td>
                          <td>
                            {loc.flag ? (
                              <img
                                src={`/assets/images/flags/${loc.flag}`}
                                alt={loc.name}
                                style={{ width: 24, height: 16, objectFit: 'cover', borderRadius: 2 }}
                              />
                            ) : <span className="text-muted">—</span>}
                          </td>
                          <td>
                            {loc.isActive
                              ? <span className="badge bg-success-transparent text-success">{t('locales.status.active')}</span>
                              : <span className="badge bg-danger-transparent text-danger">{t('locales.status.inactive')}</span>}
                          </td>
                          <td>
                            {loc.missing !== undefined && loc.total_keys !== undefined
                              ? `${loc.total_keys - loc.missing}/${loc.total_keys}`
                              : '—'}
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <button
                                type="button"
                                className="btn btn-outline-primary btn-xs"
                                title={tc('actions.edit')}
                                onClick={() => {
                                  setEditingLocale(loc);
                                  setEditLocaleName(loc.name);
                                  setEditLocaleFlag(loc.flag ?? '');
                                  setShowEditLocaleModal(true);
                                }}
                              >
                                <i className="ti ti-pencil" />
                              </button>
                              <button
                                type="button"
                                className={`btn btn-xs ${loc.isActive ? 'btn-outline-warning' : 'btn-outline-success'}`}
                                disabled={togglingLocale === loc.code}
                                onClick={() => handleToggleLocale(loc.code, loc.isActive)}
                              >
                                {togglingLocale === loc.code
                                  ? <span className="spinner-border spinner-border-sm" />
                                  : loc.isActive ? tc('actions.deactivate') : tc('actions.activate')}
                              </button>
                              {!loc.isBuiltIn && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-xs"
                                  disabled={deletingLocale === loc.code}
                                  onClick={() => handleDeleteLocale(loc.code)}
                                >
                                  {deletingLocale === loc.code
                                    ? <span className="spinner-border spinner-border-sm" />
                                    : <i className="ti ti-trash" />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Missing Keys ─────────────────────────────────────── */}
          {mainTab === 'missing' && (
            <MissingKeysPanel onStatsChange={setMissingPending} />
          )}

        </div>
      </div>

      {/* ── Modal: Nova Chave ──────────────────────────────────────────────── */}
      {showNewKeyModal && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            onClick={(e) => { if (e.target === e.currentTarget) setShowNewKeyModal(false); }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('modal.new_key_title')}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowNewKeyModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-medium">{t('form.namespace')}</label>
                    <input className="form-control" value={activeNs} readOnly />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      {t('form.key')} <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="modal.fields.name"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                    <div className="form-text">{t('form.key_hint')}</div>
                  </div>
                  {locales.map((loc) => (
                    <div className="mb-2" key={loc.code}>
                      <label className="form-label fw-medium mb-1 fs-13">
                        {loc.flag && (
                          <img
                            src={`/assets/images/flags/${loc.flag}`}
                            alt={loc.name}
                            style={{ width: 16, height: 12, objectFit: 'cover', marginRight: 4, borderRadius: 2 }}
                          />
                        )}
                        {loc.code.toUpperCase()}
                      </label>
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={newKeyValues[loc.code] ?? ''}
                        onChange={(e) =>
                          setNewKeyValues((prev) => ({ ...prev, [loc.code]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm mt-2 w-100"
                    disabled={newKeyAiLoading}
                    onClick={handleAiFillNewKey}
                  >
                    {newKeyAiLoading
                      ? <><span className="spinner-border spinner-border-sm me-2" />{t('ai_loading')}</>
                      : `✨ ${t('actions.ai_fill')}`}
                  </button>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowNewKeyModal(false)}
                  >
                    {tc('actions.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={savingKey}
                    onClick={handleCreateKey}
                  >
                    {savingKey ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                    {t('btn.create')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {/* ── Modal: Novo Idioma ─────────────────────────────────────────────── */}
      {showNewLocaleModal && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            onClick={(e) => { if (e.target === e.currentTarget) setShowNewLocaleModal(false); }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('modal.new_locale_title')}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowNewLocaleModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      {t('form.locale_code')} <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="fr"
                      value={newLocaleCode}
                      onChange={(e) => setNewLocaleCode(e.target.value)}
                    />
                    <div className="form-text">{t('form.locale_code_hint')}</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      {t('form.locale_name')} <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Français"
                      value={newLocaleName}
                      onChange={(e) => setNewLocaleName(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">{t('form.locale_flag')}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="french_flag.jpg"
                      value={newLocaleFlag}
                      onChange={(e) => setNewLocaleFlag(e.target.value)}
                    />
                    <div className="form-text">{t('form.locale_flag_hint')}</div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowNewLocaleModal(false)}
                  >
                    {tc('actions.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={savingLocale}
                    onClick={handleCreateLocale}
                  >
                    {savingLocale ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                    {t('btn.create')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {/* ── Modal: Editar Idioma ──────────────────────────────────────────────── */}
      {showEditLocaleModal && editingLocale && (
        <>
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            onClick={(e) => { if (e.target === e.currentTarget) setShowEditLocaleModal(false); }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('modal.edit_locale_title')}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowEditLocaleModal(false)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-medium">{t('form.locale_code')}</label>
                    <input type="text" className="form-control" value={editingLocale.code} disabled />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      {t('form.locale_name')} <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editLocaleName}
                      onChange={(e) => setEditLocaleName(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium">{t('form.locale_flag')}</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="portuguese_flag.jpg"
                      value={editLocaleFlag}
                      onChange={(e) => setEditLocaleFlag(e.target.value)}
                    />
                    <div className="form-text">{t('form.locale_flag_hint')}</div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowEditLocaleModal(false)}
                  >
                    {tc('actions.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={savingLocaleEdit || !editLocaleName.trim()}
                    onClick={handleEditLocale}
                  >
                    {savingLocaleEdit ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                    {tc('actions.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      <style>{`
        .translation-cell:hover .ai-btn-hover { display: inline-block !important; }
      `}</style>
    </div>
  );
}
