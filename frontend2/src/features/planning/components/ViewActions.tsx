// Toolbar Row 1 da Lista — port literal de NewTemplate/views-shared.jsx:376-435
// (classes canónicas `.va-bar`, `.va-filter`, `.va-btn`, `.va-icon-btn`,
// `.va-export-wrap`, `.va-export-menu`).

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectAction as PA } from '../../../hooks/useProjectPermissions';

interface Props {
  filterText: string;
  onFilterChange: (next: string) => void;
  onOpenManageStates: () => void;
  onCreateTask?: () => void;
  can: (action: PA) => boolean;
}

export function ViewActions({ filterText, onFilterChange, onOpenManageStates, onCreateTask, can }: Props) {
  const { t } = useTranslation('planning');
  const comingSoonTip = t('actions.coming_soon_tip');
  const canManageStates = can(PA.STATE_MANAGE);

  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="va-bar">
      <div className="va-filter">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder={t('list.filter_placeholder')}
          value={filterText}
          onChange={(e) => onFilterChange(e.target.value)}
        />
        {filterText && (
          <button
            type="button"
            className="clear"
            onClick={() => onFilterChange('')}
            aria-label="Limpar filtro"
          >×</button>
        )}
      </div>

      <div className="spacer" />

      <div className="va-export-wrap" ref={exportRef}>
        <button
          type="button"
          className="va-btn"
          onClick={() => setExportOpen((o) => !o)}
          disabled={!can(PA.DATA_EXPORT)}
          title={comingSoonTip}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {t('actions.export.label')}
          <span className="chev">▾</span>
        </button>
        {exportOpen && (
          <div className="va-export-menu">
            <div
              className="va-export-item"
              onClick={() => setExportOpen(false)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {t('actions.export.pdf')}
              <span className="badge">.pdf</span>
            </div>
            <div
              className="va-export-item"
              onClick={() => setExportOpen(false)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
                <line x1="9" y1="9" x2="9" y2="21" />
                <line x1="15" y1="9" x2="15" y2="21" />
              </svg>
              {t('actions.export.excel')}
              <span className="badge">.xlsx</span>
            </div>
          </div>
        )}
      </div>

      {canManageStates && (
        <button
          type="button"
          className="va-btn"
          onClick={onOpenManageStates}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          {t('task.btn_manage_states')}
        </button>
      )}

      <button
        type="button"
        className="va-btn primary"
        disabled={!can(PA.TASK_CREATE)}
        onClick={onCreateTask}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('task.btn_add')}
      </button>

      <button
        type="button"
        className="va-icon-btn"
        disabled
        title={comingSoonTip}
        aria-label={t('actions.settings')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      <button
        type="button"
        className="va-icon-btn"
        disabled
        title={comingSoonTip}
        aria-label={t('actions.fullscreen')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        </svg>
      </button>
    </div>
  );
}
