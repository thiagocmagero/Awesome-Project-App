import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import type {
  GanttConfigData,
  GanttConfigColors,
  GanttConfigBehavior,
  GanttConfigDefaults,
  CellPattern,
} from '../hooks/useGanttConfig';
import { getCellPatternPreviewStyle, CELL_PATTERN_OPTIONS, CELL_STYLE_FIELDS } from '../lib/ganttPatterns';

// ─── Constantes ────────────────────────────────────────────────────────────────

const HARDCODED_DEFAULTS: GanttConfigData = {
  columns: { start_date: true, end_date: true, owner: true, duration: true, priority: false },
};

const DEFAULT_COLORS = {
  taskBar:        '#3db9d3',
  taskBarProject: '#65c16f',
  milestone:      '#e84e4e',
  links:          '#9db9d3',
  todayMarker:    '#ff4040',
} as const;

const DEFAULT_BEHAVIOR: Required<GanttConfigBehavior> = {
  dragMove: true, dragResize: true, dragLinks: true, dragProgress: true, openTreeInitially: true,
};

type InnerTab = 'columns' | 'colors' | 'behavior' | 'defaults';

// ─── Sub-componente: painel de configuração por scope ─────────────────────────

interface ConfigPanelProps {
  config: GanttConfigData;
  onChange: (c: GanttConfigData) => void;
  scope: 'global' | 'user';
}

function ConfigPanel({ config, onChange, scope }: ConfigPanelProps) {
  const { t } = useTranslation('gantt');
  const [innerTab, setInnerTab] = useState<InnerTab>('columns');

  const TOGGLEABLE_COLS: { key: keyof GanttConfigData['columns']; label: string }[] = [
    { key: 'start_date', label: t('gantt.col.start_date') },
    { key: 'end_date',   label: t('gantt.col.end_date') },
    { key: 'owner',      label: t('gantt.col.owner') },
    { key: 'duration',   label: t('gantt.col.duration') },
    { key: 'priority',   label: t('gantt.col.priority') },
  ];

  const COLOR_FIELDS: { key: keyof GanttConfigColors; label: string; hint: string }[] = [
    { key: 'taskBar',        label: t('gantt.color.task_bar.label'),     hint: t('gantt.color.task_bar.hint') },
    { key: 'taskBarProject', label: t('gantt.color.task_project.label'), hint: t('gantt.color.task_project.hint') },
    { key: 'milestone',      label: t('gantt.color.milestone.label'),    hint: t('gantt.color.milestone.hint') },
    { key: 'links',          label: t('gantt.color.links.label'),        hint: t('gantt.color.links.hint') },
    { key: 'todayMarker',    label: t('gantt.color.today.label'),        hint: t('gantt.color.today.hint') },
  ];

  const BEHAVIOR_FIELDS: { key: keyof GanttConfigBehavior; label: string; hint: string }[] = [
    { key: 'dragMove',          label: t('gantt.behavior.drag_move.label'),    hint: t('gantt.behavior.drag_move.hint') },
    { key: 'dragResize',        label: t('gantt.behavior.drag_resize.label'),  hint: t('gantt.behavior.drag_resize.hint') },
    { key: 'dragLinks',         label: t('gantt.behavior.drag_links.label'),   hint: t('gantt.behavior.drag_links.hint') },
    { key: 'dragProgress',      label: t('gantt.behavior.drag_progress.label'), hint: t('gantt.behavior.drag_progress.hint') },
    { key: 'openTreeInitially', label: t('gantt.behavior.open_tree.label'),    hint: t('gantt.behavior.open_tree.hint') },
  ];

  const ZOOM_LABELS = [
    t('gantt.zoom.0'), t('gantt.zoom.1'), t('gantt.zoom.2'), t('gantt.zoom.3'), t('gantt.zoom.4'),
  ];

  const tabBtns: { id: InnerTab; icon: string; label: string }[] = [
    { id: 'columns',  icon: 'ti-columns',                label: t('gantt.settings.tab_columns') },
    { id: 'colors',   icon: 'ti-palette',                label: t('gantt.settings.tab_colors') },
    { id: 'behavior', icon: 'ti-adjustments-horizontal', label: t('gantt.settings.tab_behavior') },
    { id: 'defaults', icon: 'ti-sliders',                label: t('gantt.settings.tab_defaults') },
  ];

  function setColumns(key: keyof GanttConfigData['columns'], val: boolean) {
    onChange({ ...config, columns: { ...config.columns, [key]: val } });
  }
  function setColor(key: keyof GanttConfigColors, val: string) {
    onChange({ ...config, colors: { ...(config.colors ?? {}), [key]: val } });
  }
  function resetColor(key: keyof GanttConfigColors) {
    const next = { ...(config.colors ?? {}) };
    delete next[key];
    onChange({ ...config, colors: next });
  }
  function resetCellStyle(colorKey: keyof GanttConfigColors, patternKey: keyof GanttConfigColors) {
    const next = { ...(config.colors ?? {}) };
    delete next[colorKey];
    delete next[patternKey];
    onChange({ ...config, colors: next });
  }
  function setBehavior(key: keyof GanttConfigBehavior, val: boolean) {
    onChange({ ...config, behavior: { ...(config.behavior ?? {}), [key]: val } });
  }
  function setZoom(val: number) {
    onChange({ ...config, defaults: { ...(config.defaults ?? {}), zoomLevel: val } });
  }
  function setDefault<K extends keyof GanttConfigDefaults>(key: K, val: GanttConfigDefaults[K]) {
    onChange({ ...config, defaults: { ...(config.defaults ?? {}), [key]: val } });
  }

  return (
    <>
      {/* Tabs internas */}
      <ul className="nav nav-tabs mb-4">
        {tabBtns.map(({ id, icon, label }) => (
          <li key={id} className="nav-item">
            <button
              type="button"
              className={`nav-link${innerTab === id ? ' active' : ''}`}
              onClick={() => setInnerTab(id)}
            >
              <i className={`ti ${icon} me-1`} />{label}
            </button>
          </li>
        ))}
      </ul>

      {/* ── Colunas ── */}
      {innerTab === 'columns' && (
        <>
          <p className="text-muted fs-13 mb-3">
            {scope === 'global'
              ? t('gantt.settings.col_global_hint')
              : t('gantt.settings.col_user_hint')}
          </p>
          {TOGGLEABLE_COLS.map(({ key, label }) => (
            <div key={key} className="d-flex align-items-center justify-content-between mb-3">
              <span className="fs-14">{label}</span>
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={config.columns[key]}
                  onChange={() => setColumns(key, !config.columns[key])}
                />
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Cores ── */}
      {innerTab === 'colors' && (
        <>
          <p className="text-muted fs-13 mb-3">
            {scope === 'global'
              ? t('gantt.settings.color_global_hint')
              : t('gantt.settings.color_user_hint')}
          </p>
          {COLOR_FIELDS.map(({ key, label, hint }) => {
            const storedVal  = config.colors?.[key] as string | undefined;
            const displayVal = storedVal ?? DEFAULT_COLORS[key as keyof typeof DEFAULT_COLORS];
            const isCustom   = !!storedVal;
            return (
              <div key={key} className="mb-3">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <div>
                    <span className="fs-14 fw-medium">{label}</span>
                    <span className="text-muted fs-12 ms-2">{hint}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="color"
                      className="form-control form-control-color"
                      value={displayVal}
                      onChange={(e) => setColor(key, e.target.value)}
                      style={{ width: 40, height: 32, padding: 2, cursor: 'pointer' }}
                      title={displayVal}
                    />
                    <span className="text-muted fs-12" style={{ fontFamily: 'monospace', minWidth: 68 }}>
                      {displayVal}
                    </span>
                    {isCustom && (
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        title={t('gantt.settings.reset_color_btn')}
                        onClick={() => resetColor(key)}
                      >
                        <i className="ti ti-rotate fs-14" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Padrões de Células ── */}
          <h6 className="fw-semibold mt-4 mb-3 fs-12 text-muted text-uppercase letter-spacing-1">
            {t('gantt.settings.cell_patterns')}
          </h6>
          {CELL_STYLE_FIELDS.map(({ colorKey, patternKey, label, hint, defaultColor }) => {
            const colorVal   = (config.colors?.[colorKey]   ?? defaultColor) as string;
            const patternVal = (config.colors?.[patternKey] ?? 'diagonal')   as CellPattern;
            const isCustom   = !!(config.colors?.[colorKey] || config.colors?.[patternKey]);
            return (
              <div key={String(colorKey)} className="mb-4">
                <div className="mb-2">
                  <span className="fs-14 fw-medium">{label}</span>
                  <span className="text-muted fs-12 ms-2">{hint}</span>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <input
                    type="color"
                    className="form-control form-control-color"
                    value={colorVal}
                    onChange={(e) => setColor(colorKey, e.target.value)}
                    style={{ width: 40, height: 32, padding: 2, cursor: 'pointer' }}
                    title={colorVal}
                  />
                  <div style={getCellPatternPreviewStyle(colorVal, patternVal)} />
                  <select
                    className="form-select form-select-sm flex-grow-1"
                    value={patternVal}
                    onChange={(e) => setColor(patternKey, e.target.value)}
                  >
                    {CELL_PATTERN_OPTIONS.map(({ value, label: lbl }) => (
                      <option key={value} value={value}>{lbl}</option>
                    ))}
                  </select>
                  {isCustom && (
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      title={t('gantt.settings.reset_btn')}
                      onClick={() => resetCellStyle(colorKey, patternKey)}
                    >
                      <i className="ti ti-rotate fs-14" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Comportamento ── */}
      {innerTab === 'behavior' && (
        <>
          <p className="text-muted fs-13 mb-3">
            {scope === 'global'
              ? t('gantt.settings.behavior_global_hint')
              : t('gantt.settings.behavior_user_hint')}
          </p>
          {BEHAVIOR_FIELDS.map(({ key, label, hint }) => {
            const storedVal = config.behavior?.[key] as boolean | undefined;
            const effective = storedVal ?? DEFAULT_BEHAVIOR[key];
            return (
              <div key={key} className="d-flex align-items-center justify-content-between mb-3">
                <div>
                  <div className="fs-14">{label}</div>
                  <div className="text-muted fs-12">{hint}</div>
                </div>
                <div className="form-check form-switch mb-0 ms-3 flex-shrink-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={effective}
                    onChange={() => setBehavior(key, !effective)}
                  />
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ── Defaults ── */}
      {innerTab === 'defaults' && (
        <>
          <p className="text-muted fs-13 mb-3">
            {scope === 'global'
              ? t('gantt.settings.defaults_global_hint')
              : t('gantt.settings.defaults_user_hint')}
          </p>
          <div className="mb-4">
            <label className="form-label fw-semibold">{t('gantt.settings.zoom_label')}</label>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 260 }}
              value={config.defaults?.zoomLevel ?? 2}
              onChange={(e) => setZoom(Number(e.target.value))}
            >
              {ZOOM_LABELS.map((lbl, i) => (
                <option key={i} value={i}>{lbl}</option>
              ))}
            </select>
            <div className="text-muted fs-12 mt-1">
              {t('gantt.settings.zoom_hint')}
            </div>
          </div>
          <div className="mb-4">
            <label className="form-label fw-semibold">{t('gantt.settings.end_date_mode_label')}</label>
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 280 }}
              value={(config.defaults?.endDateMode as string | undefined) ?? 'exclusive'}
              onChange={(e) => setDefault('endDateMode', e.target.value as 'inclusive' | 'exclusive')}
            >
              <option value="exclusive">{t('gantt.settings.end_date_exclusive')}</option>
              <option value="inclusive">{t('gantt.settings.end_date_inclusive')}</option>
            </select>
            <div className="text-muted fs-12 mt-1">
              {t('gantt.settings.end_date_example')}
            </div>
            <div className="alert alert-soft-warning d-flex align-items-start gap-2 py-2 mt-2 mb-0" style={{ fontSize: 12 }}>
              <i className="ti ti-info-circle fs-14 mt-1 flex-shrink-0" />
              <span>
                {t('gantt.settings.end_date_warning')}
                {' '}<i className="ti ti-settings fs-12" />{' '}
                {t('gantt.settings.end_date_warning_suffix')}
              </span>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function GanttSettingsPage() {
  const { token, user } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('gantt');
  const { t: tc } = useTranslation('common');

  const isAdmin = user?.profileCode === 'PLATFORM_ADMIN';

  // ── Global config (admin only) ───────────────────────────────────────────────
  const [globalConfig, setGlobalConfig] = useState<GanttConfigData>(HARDCODED_DEFAULTS);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [globalSaving, setGlobalSaving] = useState(false);

  // ── User config ───────────────────────────────────────────────────────────────
  const [userConfig, setUserConfig] = useState<GanttConfigData>(HARDCODED_DEFAULTS);
  const [userLoading, setUserLoading] = useState(true);
  const [userSaving, setUserSaving] = useState(false);

  // ── Load raw configs ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    if (isAdmin) {
      apiFetch(`${api}/gantt-config/global`, { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.config) setGlobalConfig(data.config as GanttConfigData);
        })
        .catch(console.error)
        .finally(() => setGlobalLoading(false));
    } else {
      setGlobalLoading(false);
    }

    apiFetch(`${api}/gantt-config/user`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.config) setUserConfig(data.config as GanttConfigData);
      })
      .catch(console.error)
      .finally(() => setUserLoading(false));
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save handlers ─────────────────────────────────────────────────────────────
  async function saveGlobal() {
    if (!token) return;
    setGlobalSaving(true);
    try {
      const r = await apiFetch(`${api}/gantt-config/global`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(globalConfig),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? tc('errors.generic'));
      }
      showToast('success', t('gantt.settings.success_global'));
    } catch (e) {
      showToast('danger', (e as Error).message);
    } finally {
      setGlobalSaving(false);
    }
  }

  async function saveUser() {
    if (!token) return;
    setUserSaving(true);
    try {
      const r = await apiFetch(`${api}/gantt-config/user`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(userConfig),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? tc('errors.generic'));
      }
      showToast('success', t('gantt.settings.success_user'));
    } catch (e) {
      showToast('danger', (e as Error).message);
    } finally {
      setUserSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Page Header */}
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{t('gantt.settings.title')}</h1>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <a href="/dashboard" className="text-primary">{tc('nav.dashboard')}</a>
              </li>
              <li className="breadcrumb-item">{t('gantt.settings.breadcrumb_parent')}</li>
              <li className="breadcrumb-item active">Gantt</li>
            </ol>
          </nav>
        </div>
      </div>

      <div className="row">
        <div className="col-xl-9 col-lg-11">
          <div className="card custom-card">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="card-title mb-0">
                <i className="ti ti-adjustments-horizontal me-2 text-primary"></i>
                {t('gantt.settings.card_title')}
              </h6>
            </div>
            <div className="card-body">
              <p className="text-muted fs-13 mb-4">
                  {t('gantt.settings.card_desc')}
                  {' '}<i className="ti ti-settings" />{' '}
                  {t('gantt.settings.card_desc_suffix')}
                </p>

                {/* Tabs externas — Global | Utilizador */}
                <ul className="nav nav-tabs mb-0" role="tablist">
                  {isAdmin && (
                    <li className="nav-item" role="presentation">
                      <button
                        className="nav-link active"
                        data-bs-toggle="tab"
                        data-bs-target="#tab-global"
                        type="button"
                        role="tab"
                      >
                        <i className="ti ti-world me-1" />{t('gantt.settings.tab_global')}
                      </button>
                    </li>
                  )}
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link${!isAdmin ? ' active' : ''}`}
                      data-bs-toggle="tab"
                      data-bs-target="#tab-user"
                      type="button"
                      role="tab"
                    >
                      <i className="ti ti-user me-1" />{t('gantt.settings.tab_user')}
                    </button>
                  </li>
                </ul>

                <div className="tab-content border border-top-0 rounded-bottom p-4">

                  {/* ── Tab: Global ──────────────────────────────────────── */}
                  {isAdmin && (
                    <div className="tab-pane fade show active" id="tab-global" role="tabpanel">
                      {globalLoading ? (
                        <div className="text-center py-5">
                          <div className="spinner-border spinner-border-sm text-primary" role="status" />
                        </div>
                      ) : (
                        <>
                          <ConfigPanel
                            config={globalConfig}
                            onChange={setGlobalConfig}
                            scope="global"
                          />
                          <div className="mt-4 pt-3 border-top">
                            <button
                              className="btn btn-primary"
                              onClick={saveGlobal}
                              disabled={globalSaving}
                            >
                              {globalSaving ? (
                                <><span className="spinner-border spinner-border-sm me-2" role="status" />{tc('actions.saving')}</>
                              ) : (
                                <><i className="ti ti-device-floppy me-1" />{t('gantt.settings.save_global_btn')}</>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── Tab: Utilizador ──────────────────────────────────── */}
                  <div
                    className={`tab-pane fade${!isAdmin ? ' show active' : ''}`}
                    id="tab-user"
                    role="tabpanel"
                  >
                    {userLoading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      </div>
                    ) : (
                      <>
                        <ConfigPanel
                          config={userConfig}
                          onChange={setUserConfig}
                          scope="user"
                        />
                        <div className="mt-4 pt-3 border-top">
                          <button
                            className="btn btn-primary"
                            onClick={saveUser}
                            disabled={userSaving}
                          >
                            {userSaving ? (
                              <><span className="spinner-border spinner-border-sm me-2" role="status" />{tc('actions.saving')}</>
                            ) : (
                              <><i className="ti ti-device-floppy me-1" />{t('gantt.settings.save_user_btn')}</>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                </div>{/* end tab-content */}
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
