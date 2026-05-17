import { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useWorkspaces } from '../contexts/WorkspacesContext';
import {
  useWorkspaceCalendars,
  type CalendarDate,
  type CalendarStatus,
  type WorkspaceCalendar,
} from '../hooks/useWorkspaceCalendars';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { useIsPlatformAdmin } from '../hooks/useIsPlatformAdmin';
import { CalendarModal } from '../shell/CalendarModal';
import { CalendarDateModal } from '../shell/CalendarDateModal';
import { ConfirmDialog } from '../shell/ConfirmDialog';
import '../styles/ws-settings.css';

const CALENDAR_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)' }}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const SMALL_CAL_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const PLUS_ICON_SMALL = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EDIT_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TRASH_ICON = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

const DATE_ICON_INLINE = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

/** Formata `YYYY-MM-DD` ou ISO completo em UTC para `DD/MM/YYYY`.
 *  Datas em `HolidayDate` são DATA PURA — sem conversão de tz. */
function fmtPT(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

type CalendarModalState = { kind: 'create' } | { kind: 'edit'; value: WorkspaceCalendar } | null;
type DateModalState = { kind: 'create' } | { kind: 'edit'; value: CalendarDate } | null;
type ConfirmState =
  | { kind: 'calendar'; value: WorkspaceCalendar }
  | { kind: 'date'; value: CalendarDate }
  | null;

/**
 * Página `/:locale/:workspaceId/calendars`.
 *
 * Port literal do `HolidaysView` de `NewTemplate/views-ws-settings.jsx` —
 * layout 2 colunas (master de calendários à esquerda, detalhe + tabela de datas
 * à direita). Workspace-scoped via header `X-Workspace-Id` injectado pelo
 * `apiFetch` (gerido pelo `WorkspacesProvider`).
 *
 * UI gated pela feature flag `multi_holiday`. PLATFORM_ADMIN bypassa (via
 * hook `useFeatureFlag`).
 */
export function CalendarsPage() {
  const { t } = useTranslation('holidays');
  const { t: tc } = useTranslation('common');
  const { showToast } = useToast();
  const { activeWorkspace } = useWorkspaces();
  const isAdmin = useIsPlatformAdmin();
  const { enabled: multiHolidayEnabled, loading: flagLoading } = useFeatureFlag('multi_holiday');

  const canCreate = multiHolidayEnabled || isAdmin;

  const {
    calendars,
    active,
    loading,
    detailLoading,
    select,
    create,
    update,
    remove,
    addDate,
    updateDate,
    removeDate,
  } = useWorkspaceCalendars();

  const [calendarModal, setCalendarModal] = useState<CalendarModalState>(null);
  const [dateModal, setDateModal] = useState<DateModalState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  // Auto-seleccionar primeiro calendário ao carregar / ao trocar de workspace.
  useEffect(() => {
    if (loading) return;
    if (active) return;
    if (calendars.length > 0) {
      void select(calendars[0].publicId);
    }
  }, [loading, calendars, active, select]);

  const workspaceName = activeWorkspace?.name ?? '';
  const showFeatureEmpty = !flagLoading && !canCreate && calendars.length === 0;

  async function handleSaveCalendar(payload: {
    publicId?: string;
    name: string;
    description: string | null;
    status: CalendarStatus;
  }) {
    try {
      if (payload.publicId) {
        await update(payload.publicId, {
          name: payload.name,
          description: payload.description,
          status: payload.status,
        });
        showToast('success', t('success.updated'));
      } else {
        const created = await create({
          name: payload.name,
          description: payload.description,
          status: payload.status,
        });
        showToast('success', t('success.created'));
        await select(created.publicId);
      }
      setCalendarModal(null);
    } catch (err) {
      const msg = (err as Error).message;
      showToast('danger', msg || tc('errors.generic'));
      throw err;
    }
  }

  async function handleSaveDate(payload: {
    publicId?: string;
    name: string;
    date: string;
    status?: CalendarStatus;
  }) {
    if (!active) return;
    try {
      if (payload.publicId) {
        await updateDate(active.publicId, payload.publicId, {
          name: payload.name,
          date: payload.date,
          status: payload.status,
        });
        showToast('success', t('success.date_updated'));
      } else {
        await addDate(active.publicId, { name: payload.name, date: payload.date });
        showToast('success', t('success.date_added'));
      }
      setDateModal(null);
    } catch (err) {
      const msg = (err as Error).message;
      showToast('danger', msg || tc('errors.generic'));
      throw err;
    }
  }

  async function handleConfirmDelete() {
    if (!confirm) return;
    try {
      if (confirm.kind === 'calendar') {
        await remove(confirm.value.publicId);
        showToast('success', t('success.deleted'));
      } else {
        if (!active) return;
        await removeDate(active.publicId, confirm.value.publicId);
        showToast('success', t('success.date_deleted'));
      }
      setConfirm(null);
    } catch (err) {
      showToast('danger', (err as Error).message || tc('errors.generic'));
    }
  }

  const sortedDates = useMemo(() => {
    if (!active) return [];
    return [...active.dates].sort((a, b) => a.date.localeCompare(b.date));
  }, [active]);

  return (
    <div className="ws-page">
      {/* Page header */}
      <div className="ws-head">
        <div>
          <div className="title">
            {CALENDAR_ICON}
            {t('page.title')}
          </div>
          <div className="sub">
            <Trans
              i18nKey="page.subtitle"
              ns="holidays"
              values={{ workspaceName }}
              components={{ b: <b /> }}
            />
          </div>
        </div>
        <div className="right">
          {canCreate && (
            <button
              type="button"
              className="ws-btn-primary"
              onClick={() => setCalendarModal({ kind: 'create' })}
            >
              <span style={{ fontSize: 16, lineHeight: 0 }}>+</span>
              {t('btn.add')}
            </button>
          )}
        </div>
      </div>

      <div className="ws-body">
        {showFeatureEmpty ? (
          <div
            className="cal-empty"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12 }}
          >
            <div className="glyph">{SMALL_CAL_ICON}</div>
            <div className="tt">{t('feature.unavailable_title')}</div>
            <div className="sd">{t('feature.unavailable_text')}</div>
          </div>
        ) : (
          <div className="cal-grid">
            {/* Master — lista de calendários */}
            <div className="cal-master">
              <div className="cal-master-head">
                <div className="ic">{SMALL_CAL_ICON}</div>
                <div className="title">{t('list.title')}</div>
                <div className="right">
                  {canCreate && (
                    <button
                      type="button"
                      className="ws-btn-icon"
                      title={t('btn.add')}
                      onClick={() => setCalendarModal({ kind: 'create' })}
                    >
                      {PLUS_ICON_SMALL}
                    </button>
                  )}
                </div>
              </div>
              <div className="cal-list">
                {loading ? (
                  <div style={{ padding: 12, fontSize: 12.5, color: 'var(--dim)' }}>
                    {tc('messages.loading')}
                  </div>
                ) : calendars.length === 0 ? (
                  <div style={{ padding: 12, fontSize: 12.5, color: 'var(--dim)' }}>
                    {t('list.empty_can_create')}
                  </div>
                ) : (
                  calendars.map((c) => {
                    const isActive = active?.publicId === c.publicId;
                    return (
                      <div
                        key={c.publicId}
                        className={'cal-row' + (isActive ? ' active' : '')}
                        onClick={() => void select(c.publicId)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            void select(c.publicId);
                          }
                        }}
                      >
                        <div className="nm">{c.name}</div>
                        <div className="acts">
                          <button
                            type="button"
                            className="ws-btn-icon"
                            title={tc('actions.edit')}
                            onClick={(e) => { e.stopPropagation(); setCalendarModal({ kind: 'edit', value: c }); }}
                          >
                            {EDIT_ICON}
                          </button>
                          <button
                            type="button"
                            className="ws-btn-icon danger"
                            title={tc('actions.delete')}
                            onClick={(e) => { e.stopPropagation(); setConfirm({ kind: 'calendar', value: c }); }}
                          >
                            {TRASH_ICON}
                          </button>
                        </div>
                        <div className="meta">
                          <span className="cal-count">
                            {DATE_ICON_INLINE}
                            {t('list.date_count', { count: c.datesCount })}
                          </span>
                          <span className={'pp-pill ' + (c.status === 'ACTIVE' ? 'st-active' : 'st-inactive')}>
                            {c.status === 'ACTIVE' ? tc('status.active') : tc('status.inactive')}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Detail — datas do calendário seleccionado */}
            <div className="cal-detail">
              {active ? (
                <>
                  <div className="cal-detail-head">
                    <div className="ic">{SMALL_CAL_ICON}</div>
                    <div className="tt">{active.name}</div>
                    <span className={'pp-pill ' + (active.status === 'ACTIVE' ? 'st-active' : 'st-inactive')}>
                      {active.status === 'ACTIVE' ? tc('status.active') : tc('status.inactive')}
                    </span>
                    <div className="right">
                      {canCreate && (
                        <button
                          type="button"
                          className="ws-btn-primary"
                          onClick={() => setDateModal({ kind: 'create' })}
                        >
                          <span style={{ fontSize: 15, lineHeight: 0 }}>+</span>
                          {t('btn.add_date')}
                        </button>
                      )}
                    </div>
                    {active.description && <div className="desc">{active.description}</div>}
                  </div>

                  {detailLoading ? (
                    <div style={{ padding: 24, fontSize: 12.5, color: 'var(--dim)' }}>
                      {tc('messages.loading')}
                    </div>
                  ) : sortedDates.length === 0 ? (
                    <div className="cal-empty">
                      <div className="glyph">{SMALL_CAL_ICON}</div>
                      <div className="tt">{t('empty.no_dates_title')}</div>
                      <div className="sd">{t('empty.no_dates_hint')}</div>
                      {canCreate && (
                        <button
                          type="button"
                          className="ws-btn-primary"
                          style={{ marginTop: 4 }}
                          onClick={() => setDateModal({ kind: 'create' })}
                        >
                          <span style={{ fontSize: 15, lineHeight: 0 }}>+</span>
                          {t('btn.add_date')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="cal-table">
                      <div className="cal-table-row cal-table-head">
                        <span>{t('table.name')}</span>
                        <span>{t('table.date')}</span>
                        <span className="col-status">{t('table.status')}</span>
                        <span className="act-col">{t('table.actions')}</span>
                      </div>
                      <div className="cal-table-body">
                        {sortedDates.map((d) => (
                          <div
                            key={d.publicId}
                            className={'cal-table-row' + (d.status !== 'ACTIVE' ? ' inactive' : '')}
                          >
                            <span className="cal-cell-name">{d.name}</span>
                            <span className="cal-cell-date">
                              {DATE_ICON_INLINE}
                              {fmtPT(d.date)}
                            </span>
                            <span className="col-status">
                              <span className={'pp-pill ' + (d.status === 'ACTIVE' ? 'st-active' : 'st-inactive')}>
                                {d.status === 'ACTIVE' ? tc('status.active') : tc('status.inactive')}
                              </span>
                            </span>
                            <span className="cal-cell-acts">
                              <button
                                type="button"
                                className="ws-btn-icon"
                                title={tc('actions.edit')}
                                onClick={() => setDateModal({ kind: 'edit', value: d })}
                              >
                                {EDIT_ICON}
                              </button>
                              <button
                                type="button"
                                className="ws-btn-icon danger"
                                title={tc('actions.delete')}
                                onClick={() => setConfirm({ kind: 'date', value: d })}
                              >
                                {TRASH_ICON}
                              </button>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="cal-empty">
                  <div className="glyph">{SMALL_CAL_ICON}</div>
                  <div className="tt">{t('empty.no_calendars_title')}</div>
                  <div className="sd">{t('empty.no_calendars_hint')}</div>
                  {canCreate && (
                    <button
                      type="button"
                      className="ws-btn-primary"
                      style={{ marginTop: 4 }}
                      onClick={() => setCalendarModal({ kind: 'create' })}
                    >
                      <span style={{ fontSize: 15, lineHeight: 0 }}>+</span>
                      {t('btn.add')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {calendarModal && (
        <CalendarModal
          initial={calendarModal.kind === 'edit' ? calendarModal.value : null}
          onClose={() => setCalendarModal(null)}
          onSave={handleSaveCalendar}
        />
      )}

      {dateModal && active && (
        <CalendarDateModal
          initial={dateModal.kind === 'edit' ? dateModal.value : null}
          onClose={() => setDateModal(null)}
          onSave={handleSaveDate}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={
            confirm.kind === 'calendar'
              ? t('modal.delete.title', { name: confirm.value.name })
              : t('modal.delete_date.title', { name: confirm.value.name })
          }
          message={
            confirm.kind === 'calendar'
              ? t('modal.delete.body', { count: active?.dates.length ?? confirm.value.datesCount })
              : t('modal.delete_date.body')
          }
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
