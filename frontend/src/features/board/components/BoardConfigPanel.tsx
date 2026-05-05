// Offcanvas Bootstrap (lateral direita) para configuração visual + comportamento
// do Board. Âmbito sempre PROJECT — as alterações aplicam-se a todos os membros.
// Pattern idêntico ao offcanvas do Gantt: nav-tabs Tab Style-2, auto-save por toggle,
// sem botões de Save/Cancel/Reset no footer.

import { Fragment, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBootstrapOffcanvas } from '../../../hooks/useBootstrapOffcanvas';
import {
  type BoardAccentStyle,
  type BoardConfigData,
  type BoardDensity,
  type BoardPriorityStyle,
  DEFAULT_BOARD_CONFIG,
} from '../types';

type ConfigTab = 'visual' | 'behavior' | 'colors';

interface Props {
  open: boolean;
  onClose: () => void;
  config: BoardConfigData;
  /** Persistência ao nível PROJECT. Chamada imediatamente a cada alteração. */
  onSaveProject: (c: BoardConfigData) => Promise<boolean>;
  /** Atualiza apenas o estado local sem persistir (usado por color picker live preview). */
  onLocalChange: (c: BoardConfigData) => void;
}

const DENSITIES: BoardDensity[] = ['compact', 'normal', 'wide'];
const ACCENTS: BoardAccentStyle[] = ['cap', 'bar', 'dot', 'soft'];
const PRIORITIES: BoardPriorityStyle[] = ['pill', 'dot', 'stripe'];

export function BoardConfigPanel({
  open,
  onClose,
  config,
  onSaveProject,
  onLocalChange,
}: Props) {
  const { t } = useTranslation('board');
  const { t: tc } = useTranslation('common');
  const ref = useRef<HTMLDivElement>(null);
  useBootstrapOffcanvas(ref, open, onClose);

  const [configTab, setConfigTab] = useState<ConfigTab>('visual');

  const visual   = config.visual   ?? DEFAULT_BOARD_CONFIG.visual!;
  const behavior = config.behavior ?? DEFAULT_BOARD_CONFIG.behavior!;
  const colors   = config.colors   ?? DEFAULT_BOARD_CONFIG.colors!;

  /** Produz um objecto BoardConfigData com o patch aplicado sobre o config actual. */
  const merge = (patch: Partial<BoardConfigData>): BoardConfigData => ({
    visual:   { ...visual,   ...(patch.visual   ?? {}) },
    behavior: { ...behavior, ...(patch.behavior ?? {}) },
    colors: {
      ...colors,
      ...(patch.colors ?? {}),
      priority: {
        ...(colors.priority ?? {}),
        ...(patch.colors?.priority ?? {}),
      },
      systemColumns: {
        ...(colors.systemColumns ?? {}),
        ...(patch.colors?.systemColumns ?? {}),
      },
    },
  });

  /**
   * Aplica o patch localmente (feedback imediato) e persiste no PROJECT.
   * Usado por toggles e btn-groups — fire-and-forget da Promise.
   */
  const updateAndSave = (patch: Partial<BoardConfigData>) => {
    const merged = merge(patch);
    onLocalChange(merged);
    void onSaveProject(merged);
  };

  const CONFIG_TABS: ConfigTab[] = ['visual', 'behavior', 'colors'];

  // IDs únicos para os radio btn-check (evita colisões se o offcanvas reusar IDs)
  const uid = 'bcp';

  return (
    <div
      ref={ref}
      className="offcanvas offcanvas-end"
      tabIndex={-1}
      style={{ width: 380 }}
      aria-labelledby="boardConfigPanelLabel"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="offcanvas-header">
        <h5 id="boardConfigPanelLabel" className="offcanvas-title d-flex align-items-center gap-2">
          <i className="ri-layout-grid-line" />
          {t('config.title')}
        </h5>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="offcanvas"
          aria-label={tc('actions.close')}
          onClick={onClose}
        />
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="offcanvas-body">
        <p className="text-muted small mb-3">{t('config.description')}</p>

        {/* Nav-tabs Tab Style-2 — Visual | Comportamento | Cores */}
        <ul className="nav nav-tabs tab-style-2 nav-justified mb-3 d-sm-flex d-block">
          {CONFIG_TABS.map((tab) => (
            <li key={tab} className="nav-item">
              <button
                type="button"
                className={`nav-link${configTab === tab ? ' active' : ''}`}
                onClick={() => setConfigTab(tab)}
              >
                {t(`config.section.${tab}`)}
              </button>
            </li>
          ))}
        </ul>

        {/* ── Visual ─────────────────────────────────────────────────── */}
        {configTab === 'visual' && (
          <>
            <div>
              <p className="switcher-style-head">{t('config.density_label')}:</p>
              <div className="row switcher-style gx-0">
                <div className="btn-group" role="group" aria-label={t('config.density_label')}>
                  {DENSITIES.map((d) => (
                    <Fragment key={d}>
                      <input
                        type="radio"
                        className="btn-check"
                        name={`${uid}-density`}
                        id={`${uid}-density-${d}`}
                        autoComplete="off"
                        checked={visual.density === d}
                        onChange={() => updateAndSave({ visual: { density: d } })}
                      />
                      <label
                        className="btn btn-outline-primary"
                        htmlFor={`${uid}-density-${d}`}
                      >
                        {t(`config.density.${d}`)}
                      </label>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="switcher-style-head">{t('config.accent_label')}:</p>
              <div className="row switcher-style gx-0">
                <div className="btn-group" role="group" aria-label={t('config.accent_label')}>
                  {ACCENTS.map((a) => (
                    <Fragment key={a}>
                      <input
                        type="radio"
                        className="btn-check"
                        name={`${uid}-accent`}
                        id={`${uid}-accent-${a}`}
                        autoComplete="off"
                        checked={visual.columnAccentStyle === a}
                        onChange={() => updateAndSave({ visual: { columnAccentStyle: a } })}
                      />
                      <label
                        className="btn btn-outline-primary"
                        htmlFor={`${uid}-accent-${a}`}
                      >
                        {t(`config.accent.${a}`)}
                      </label>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="switcher-style-head">{t('config.priority_style_label')}:</p>
              <div className="row switcher-style gx-0">
                <div className="btn-group" role="group" aria-label={t('config.priority_style_label')}>
                  {PRIORITIES.map((p) => (
                    <Fragment key={p}>
                      <input
                        type="radio"
                        className="btn-check"
                        name={`${uid}-priority`}
                        id={`${uid}-priority-${p}`}
                        autoComplete="off"
                        checked={visual.priorityStyle === p}
                        onChange={() => updateAndSave({ visual: { priorityStyle: p } })}
                      />
                      <label
                        className="btn btn-outline-primary"
                        htmlFor={`${uid}-priority-${p}`}
                      >
                        {t(`config.priority_style.${p}`)}
                      </label>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Comportamento ──────────────────────────────────────────── */}
        {configTab === 'behavior' && (
          <>
            <ToggleRow
              label={t('settings.behavior.show_subtasks.label')}
              hint={t('settings.behavior.show_subtasks.hint')}
              checked={behavior.showSubtasks !== false}
              onChange={(v) => updateAndSave({ behavior: { showSubtasks: v } })}
            />
            <ToggleRow
              label={t('settings.behavior.show_progress.label')}
              hint={t('settings.behavior.show_progress.hint')}
              checked={behavior.showProgress !== false}
              onChange={(v) => updateAndSave({ behavior: { showProgress: v } })}
            />
            <ToggleRow
              label={t('settings.behavior.show_dates.label')}
              hint={t('settings.behavior.show_dates.hint')}
              checked={behavior.showDates !== false}
              onChange={(v) => updateAndSave({ behavior: { showDates: v } })}
            />
            <ToggleRow
              label={t('settings.behavior.show_assignees.label')}
              hint={t('settings.behavior.show_assignees.hint')}
              checked={behavior.showAssignees !== false}
              onChange={(v) => updateAndSave({ behavior: { showAssignees: v } })}
            />
            <ToggleRow
              label={t('settings.behavior.show_priority.label')}
              hint={t('settings.behavior.show_priority.hint')}
              checked={behavior.showPriority !== false}
              onChange={(v) => updateAndSave({ behavior: { showPriority: v } })}
            />
          </>
        )}

        {/* ── Cores ──────────────────────────────────────────────────── */}
        {configTab === 'colors' && (
          <>
            {/* Cor primária (era tab Visual) */}
            <div>
              <p className="switcher-style-head">{t('config.density_color_label')}:</p>
              <div className="row switcher-style gx-0">
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="color"
                    className="form-control form-control-color"
                    value={visual.primaryColor ?? '#7c5cff'}
                    onChange={(e) => onLocalChange(merge({ visual: { primaryColor: e.target.value } }))}
                    onBlur={(e) => updateAndSave({ visual: { primaryColor: e.target.value } })}
                    style={{ width: 40, height: 30 }}
                  />
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={visual.primaryColor ?? ''}
                    onChange={(e) => onLocalChange(merge({ visual: { primaryColor: e.target.value } }))}
                    onBlur={(e) => updateAndSave({ visual: { primaryColor: e.target.value } })}
                    placeholder="#7c5cff"
                  />
                </div>
              </div>
            </div>

            {/* Cores de prioridade */}
            <div>
              <p className="switcher-style-head">{t('config.priority_colors_label')}:</p>
              <div className="row switcher-style gx-0">
                <ColorRow
                  label={t('settings.priority.high.label')}
                  value={colors.priority?.high ?? '#ef4444'}
                  onChange={(v) => onLocalChange(merge({ colors: { priority: { high: v } } }))}
                  onSave={(v) => updateAndSave({ colors: { priority: { high: v } } })}
                />
                <ColorRow
                  label={t('settings.priority.medium.label')}
                  value={colors.priority?.medium ?? '#f59e0b'}
                  onChange={(v) => onLocalChange(merge({ colors: { priority: { medium: v } } }))}
                  onSave={(v) => updateAndSave({ colors: { priority: { medium: v } } })}
                />
                <ColorRow
                  label={t('settings.priority.low.label')}
                  value={colors.priority?.low ?? '#3b82f6'}
                  onChange={(v) => onLocalChange(merge({ colors: { priority: { low: v } } }))}
                  onSave={(v) => updateAndSave({ colors: { priority: { low: v } } })}
                />
                <ColorRow
                  label={t('settings.priority.none.label')}
                  value={colors.priority?.none ?? '#9ca3af'}
                  onChange={(v) => onLocalChange(merge({ colors: { priority: { none: v } } }))}
                  onSave={(v) => updateAndSave({ colors: { priority: { none: v } } })}
                />
              </div>
            </div>

            {/* Cores das colunas de sistema */}
            <div>
              <p className="switcher-style-head">{t('config.system_column_colors_label')}:</p>
              <div className="row switcher-style gx-0">
                <ColorRow
                  label={t('settings.system_columns.todo.label')}
                  value={colors.systemColumns?.todo ?? '#9ca3af'}
                  onChange={(v) => onLocalChange(merge({ colors: { systemColumns: { todo: v } } }))}
                  onSave={(v) => updateAndSave({ colors: { systemColumns: { todo: v } } })}
                />
                <ColorRow
                  label={t('settings.system_columns.inProgress.label')}
                  value={colors.systemColumns?.inProgress ?? '#7c5cff'}
                  onChange={(v) => onLocalChange(merge({ colors: { systemColumns: { inProgress: v } } }))}
                  onSave={(v) => updateAndSave({ colors: { systemColumns: { inProgress: v } } })}
                />
                <ColorRow
                  label={t('settings.system_columns.done.label')}
                  value={colors.systemColumns?.done ?? '#26bf94'}
                  onChange={(v) => onLocalChange(merge({ colors: { systemColumns: { done: v } } }))}
                  onSave={(v) => updateAndSave({ colors: { systemColumns: { done: v } } })}
                />
              </div>
            </div>
          </>
        )}
      </div>
      {/* Sem footer — auto-save elimina a necessidade de Save/Cancel/Reset */}
    </div>
  );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="d-flex align-items-start mb-3">
      <div className="flex-grow-1 me-2">
        <div className="small fw-medium">{label}</div>
        {hint && <div className="text-muted" style={{ fontSize: 11 }}>{hint}</div>}
      </div>
      <div className="form-check form-switch m-0">
        <input
          type="checkbox"
          className="form-check-input"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
      </div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  onSave,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: (v: string) => void;
}) {
  return (
    <div className="d-flex align-items-center mb-3 gap-2">
      <div className="flex-grow-1 small fw-medium">{label}</div>
      <input
        type="color"
        className="form-control form-control-color form-control-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onSave(e.target.value)}
        style={{ width: 40, height: 28 }}
      />
    </div>
  );
}
