// Row 2 da Lista — `.lv-subbar` per canónico NewTemplate/app-dark.jsx:1812-1876.
// Estrutura:
//   .lv-subbar
//     .lv-mode-seg (Tasks/Resources/Links — segmented control, sempre visível)
//     [if listMode === 'tasks':]
//       .lv-state-pills (All + 1 por estado real)
//       .lv-groupby (Agrupado por <b>Estado</b> ▾ — dropdown visual)
//       .lv-cols (Columns N/M — popover funcional)
//
// Quando listMode != 'tasks': só mode-seg visível.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITaskState } from '../states-types';
import { ALL_COLS, type ListColKey } from './list-columns';

export type StateFilterKey = 'all' | string;
export type ListMode = 'tasks' | 'resources' | 'links';

interface Props {
  tasksCount: number;
  states: ITaskState[];
  countsByState: Record<string, number>;
  listMode: ListMode;
  onListModeChange: (next: ListMode) => void;
  stateFilter: StateFilterKey;
  onStateFilterChange: (next: StateFilterKey) => void;
  visibleCols: Record<ListColKey, boolean>;
  onToggleCol: (key: ListColKey, next: boolean) => void;
  onSelectAllCols: () => void;
}

function resolveStateLabel(state: ITaskState, t: (k: string) => string): string {
  if (state.label) return state.label;
  if (state.labelKey) return t(state.labelKey);
  return '—';
}

function IconColumns() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="18" rx="1" />
      <rect x="14" y="3" width="7" height="18" rx="1" />
    </svg>
  );
}

export function FilterToolbar({
  tasksCount, states, countsByState,
  listMode, onListModeChange,
  stateFilter, onStateFilterChange,
  visibleCols, onToggleCol, onSelectAllCols,
}: Props) {
  const { t } = useTranslation('planning');

  const [gbOpen, setGbOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const gbRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (gbRef.current && !gbRef.current.contains(e.target as Node)) setGbOpen(false);
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const orderedStates = useMemo(
    () => [...states].sort((a, b) => a.position - b.position),
    [states],
  );
  const colShown = Object.values(visibleCols).filter(Boolean).length;

  // Labels para groupby dropdown (visual-only — selecção sem efeito real).
  const gbKeys = ['state', 'assignee', 'priority', 'none'] as const;

  return (
    <div className="lv-subbar">
      {/* Segmented control Tasks / Resources / Links */}
      <div className="lv-mode-seg">
        <button
          type="button"
          className={`lv-mode-item${listMode === 'tasks' ? ' active' : ''}`}
          onClick={() => onListModeChange('tasks')}
        >
          {t('list.mode.tasks')} <span className="lv-mode-badge">{tasksCount}</span>
        </button>
        <button
          type="button"
          className={`lv-mode-item${listMode === 'resources' ? ' active' : ''}`}
          onClick={() => onListModeChange('resources')}
        >
          {t('list.mode.resources')} <span className="lv-mode-badge">—</span>
        </button>
        <button
          type="button"
          className={`lv-mode-item${listMode === 'links' ? ' active' : ''}`}
          onClick={() => onListModeChange('links')}
        >
          {t('list.mode.links')} <span className="lv-mode-badge">—</span>
        </button>
      </div>

      {listMode === 'tasks' && (
        <>
          {/* State filter pills */}
          <div className="lv-state-pills">
            <button
              type="button"
              className={`lv-spill${stateFilter === 'all' ? ' active' : ''}`}
              onClick={() => onStateFilterChange('all')}
            >
              {t('list.filter.all')} <span>{tasksCount}</span>
            </button>
            {orderedStates.map((s) => {
              const count = countsByState[s.publicId] ?? 0;
              if (count === 0) return null;
              return (
                <button
                  key={s.publicId}
                  type="button"
                  className={`lv-spill${stateFilter === s.publicId ? ' active' : ''}`}
                  onClick={() => onStateFilterChange(s.publicId)}
                >
                  {resolveStateLabel(s, t)} <span>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Groupby dropdown (visual-only) */}
          <div className="lv-groupby" ref={gbRef}>
            <button
              type="button"
              className="lv-gb-btn"
              onClick={() => setGbOpen((o) => !o)}
            >
              {t('toolbar.grouped_by')} <b>{t('list.groupby.state')}</b> ▾
            </button>
            {gbOpen && (
              <div className="lv-gb-menu">
                {gbKeys.map((k) => (
                  <div
                    key={k}
                    className={`lv-gb-item${k === 'state' ? ' active' : ''}`}
                    onClick={() => { setGbOpen(false); }}
                  >
                    <span className="chk">{k === 'state' ? '✓' : ''}</span>
                    {t(`list.groupby.${k}`)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Columns picker */}
          <div className="lv-cols" ref={colsRef}>
            <button
              type="button"
              className="lv-cols-btn"
              onClick={() => setColsOpen((o) => !o)}
            >
              <IconColumns />
              {t('list.cols.label')} {colShown} / {ALL_COLS.length}
            </button>
            {colsOpen && (
              <div className="lv-cols-menu">
                <div className="lv-cols-head">
                  <span>{t('list.cols.heading')}</span>
                  <span className="sel-all" onClick={() => onSelectAllCols()}>
                    {t('list.cols.select_all')}
                  </span>
                </div>
                {ALL_COLS.map((c) => (
                  <label key={c.key} className="lv-cols-item">
                    <input
                      type="checkbox"
                      checked={!!visibleCols[c.key]}
                      onChange={(e) => onToggleCol(c.key, e.target.checked)}
                    />
                    {t(c.labelKey)}
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
