import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ZOOM_LEVELS, DEFAULT_ZOOM_INDEX, getMinZoomIndex } from '../types';
import type { ITaskState } from '../states-types';
import {
  formatWeekRange as formatWeekRangeShort,
  formatMonthLong,
} from '../../timesheet/dateUtils';
import '../../timesheet/timesheet.css';
import './toolbar.css';

// O tab 'board' foi reintroduzido (Maio 2026) com a nova UI AwesomeKanban
// vendorizada em `src/vendor/awesome-kanban/`. Toolbar Row 2 dedicada com
// search, swimlanes toggle, undo/redo e botões "+ Coluna" / "+ Swimlane".
type PageTab = 'planning' | 'gantt' | 'board' | 'calendar' | 'timesheet' | 'files';
type PlanSubTab = 'tasks' | 'resources' | 'links';
type TimesheetSubTab = 'mine' | 'team';
type TimesheetTeamFilter = 'all' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PARTIAL' | 'DRAFT';
type TimesheetTeamView = 'monthly' | 'weekly';

export interface UnifiedToolbarProps {
  /* Tab switcher (Row 1 left) */
  pageTab:      PageTab;
  setPageTab:   (t: PageTab) => void;
  showGantt:    boolean;
  showCalendar: boolean;

  /* Planning sub-tab (Row 2) */
  planSubTab:    PlanSubTab;
  setPlanSubTab: (t: PlanSubTab) => void;
  counts:        { tasks: number; resources: number; links: number };

  /* Tasks chips (Row 2 when planning/tasks) — Estados do projecto */
  taskStates:          ITaskState[];
  taskColumnFilter:    string;
  setTaskColumnFilter: (v: string) => void;
  columnCounts:        Record<string, number>;
  totalTasks:          number;

  /* Row 1 right — Gantt-only controls */
  ganttSearchText:    string;
  setGanttSearchText: (v: string) => void;
  onExportPdf:        () => void;
  onExportImage:      () => void;
  onExportJson:       () => void;

  /* Row 1 right — actions shared across all views */
  onOpenStates: () => void;
  onCreateTask: () => void;

  /* Gantt Row 2 */
  ganttAllExpanded:            boolean;
  ganttZoomLevel:              number;
  showResourceGrid:            boolean;
  autoScheduling:              boolean;
  showTooltips:                boolean;
  handleGanttToggleExpand:     () => void;
  handleGanttZoomIn:           () => void;
  handleGanttZoomOut:          () => void;
  handleGanttZoomReset:        () => void;
  handleToggleResourceGrid:    () => void;
  handleToggleAutoScheduling:  () => void;
  handleToggleTooltips:        () => void;
  setGanttConfigOpen:          (open: boolean) => void;
  /** Granularidade visual do widget Gantt. */
  ganttViewUnit:               'day' | 'hour';
  /** Alterna a granularidade — chama setGanttGranularity + persiste em GanttConfig. */
  onChangeGanttViewUnit:       (mode: 'day' | 'hour') => void;

  /* Shared across all tabs (Gantt / Calendar) */
  viewFullscreen:              boolean;
  handleViewFullscreen:        () => void;

  /* Calendar — Row 1 right (substitui state manage / create task) */
  onOpenEventTypes: () => void;
  onCreateEvent:    () => void;
  /* Calendar — Row 2 toggle do sources panel */
  calendarSourcesOpen:  boolean;
  onToggleCalendarSources: () => void;

  /* Board — Row 1 right + Row 2 (Maio 2026) */
  boardSearchText:       string;
  setBoardSearchText:    (v: string) => void;
  boardShowSwimlanes:    boolean;
  boardSwimlaneCount:    number;
  onToggleBoardSwimlanes: () => void;
  onBoardUndo:           () => void;
  onBoardRedo:           () => void;
  boardCanUndo:          boolean;
  boardCanRedo:          boolean;
  onAddBoardColumn:      () => void;
  onAddBoardSwimlane:    () => void;
  onOpenBoardConfig:     () => void;

  /* Timesheet flag */
  showTimesheet: boolean;
  /* Files flag (project-level uploads tab) */
  showFiles?: boolean;
  /* Timesheet — Row 1 right (CTA "+ Adicionar lançamento") */
  onCreateTimesheetEntry: () => void;
  /* Timesheet — Row 2 (mine) */
  timesheetSubTab:        TimesheetSubTab;
  setTimesheetSubTab:     (t: TimesheetSubTab) => void;
  timesheetWeekStart:     string;            // 'YYYY-MM-DD'
  timesheetWeekStatus:    'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIAL' | 'REJECTED' | null;
  onPrevTimesheetWeek:    () => void;
  onNextTimesheetWeek:    () => void;
  onCopyTimesheetWeek:    () => void;
  onSubmitTimesheetWeek:  () => void;
  /**
   * "Editar semana" — só relevante quando `timesheetWeekStatus === 'SUBMITTED'`.
   * Reverte os próprios dias submetidos para DRAFT, permitindo edição.
   * Se `null`, o botão "Editar" não é renderizado.
   */
  onEditTimesheetWeek:    (() => void) | null;
  /* Timesheet — Row 2 (team) */
  timesheetTeamFilter:    TimesheetTeamFilter;
  setTimesheetTeamFilter: (v: TimesheetTeamFilter) => void;
  timesheetTeamCounts:    { all: number; SUBMITTED: number; APPROVED: number; REJECTED: number; PARTIAL: number; DRAFT: number };
  onOpenTimesheetHistory: () => void;
  /* Timesheet — Row 2 (team monthly view) */
  timesheetTeamView:      TimesheetTeamView;
  setTimesheetTeamView:   (v: TimesheetTeamView) => void;
  timesheetMonthIso:      string;            // 'YYYY-MM'
  onPrevTimesheetMonth:   () => void;
  onNextTimesheetMonth:   () => void;
  onTodayTimesheetMonth:  () => void;
  /** True quando o mês actual já é o último do projecto (desabilita next). */
  timesheetMonthIsAtEnd?:    boolean;
  /** True quando o mês actual já é o primeiro do projecto (desabilita prev). */
  timesheetMonthIsAtStart?:  boolean;

  /* Permissions */
  canDo: (action: string) => boolean;
}

export function UnifiedToolbar(props: UnifiedToolbarProps) {
  const { t }  = useTranslation('planning');
  const { t: tg } = useTranslation('gantt');
  const { t: tcal } = useTranslation('calendar');
  const { t: tb } = useTranslation('board');

  const {
    pageTab, setPageTab, showGantt, showCalendar,
    planSubTab, setPlanSubTab, counts,
    taskStates, taskColumnFilter, setTaskColumnFilter, columnCounts, totalTasks,
    ganttSearchText, setGanttSearchText,
    onExportPdf, onExportImage, onExportJson,
    onOpenStates, onCreateTask,
    ganttAllExpanded, ganttZoomLevel,
    showResourceGrid, autoScheduling, showTooltips,
    handleGanttToggleExpand, handleGanttZoomIn, handleGanttZoomOut, handleGanttZoomReset,
    ganttViewUnit, onChangeGanttViewUnit,
    handleToggleResourceGrid, handleToggleAutoScheduling, handleToggleTooltips,
    setGanttConfigOpen,
    viewFullscreen, handleViewFullscreen,
    onOpenEventTypes, onCreateEvent,
    calendarSourcesOpen, onToggleCalendarSources,
    boardSearchText, setBoardSearchText,
    boardShowSwimlanes, boardSwimlaneCount, onToggleBoardSwimlanes,
    onBoardUndo, onBoardRedo, boardCanUndo, boardCanRedo,
    onAddBoardColumn, onAddBoardSwimlane, onOpenBoardConfig,
    showTimesheet,
    showFiles,
    onCreateTimesheetEntry,
    timesheetSubTab, setTimesheetSubTab,
    timesheetWeekStart, timesheetWeekStatus,
    onPrevTimesheetWeek, onNextTimesheetWeek,
    onCopyTimesheetWeek, onSubmitTimesheetWeek, onEditTimesheetWeek,
    timesheetTeamFilter, setTimesheetTeamFilter, timesheetTeamCounts,
    onOpenTimesheetHistory,
    timesheetTeamView, setTimesheetTeamView,
    timesheetMonthIso,
    onPrevTimesheetMonth, onNextTimesheetMonth, onTodayTimesheetMonth,
    timesheetMonthIsAtEnd, timesheetMonthIsAtStart,
    canDo,
  } = props;
  const { t: tts } = useTranslation('timesheet');
  const { t: tf } = useTranslation('files');

  const tabs: Array<[PageTab, string, string]> = [
    ['planning',  t('tab.planning'),  'ri-calendar-todo-line'],
    ['gantt',     t('tab.gantt'),     'ri-bar-chart-grouped-line'],
    ['board',     tb('tab.label'),    'ri-layout-column-line'],
    ['calendar',  tcal('tab.label'),  'ri-calendar-line'],
    ['timesheet', tts('tab.label'),   'ri-time-line'],
    ['files',     tf('page.project_tab_label'), 'ri-attachment-2'],
  ];
  const visibleTabs = tabs.filter(([k]) =>
    (k !== 'gantt'     || showGantt)     &&
    (k !== 'calendar'  || showCalendar)  &&
    (k !== 'timesheet' || showTimesheet) &&
    (k !== 'files'     || showFiles),
  );

  const zoomPct = Math.round((ZOOM_LEVELS[ganttZoomLevel] / ZOOM_LEVELS[DEFAULT_ZOOM_INDEX]) * 100);

  return (
    <div className="tb-scope mb-3">
      <div className="tb">
        {/* ── Row 1 ────────────────────────────────────────────────── */}
        <div className="tb__row1">
          <div className="tb__views" role="tablist">
            {visibleTabs.map(([k, label, icon]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={pageTab === k}
                className={pageTab === k ? 'is-active' : ''}
                onClick={() => setPageTab(k)}
              >
                <i className={icon} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="tb__row1-right">
            {pageTab === 'gantt' && (
              <>
                <div className="search">
                  <i className="ti ti-search" />
                  <input
                    type="text"
                    placeholder={tg('gantt.toolbar.filter_placeholder')}
                    value={ganttSearchText}
                    onChange={(e) => setGanttSearchText(e.target.value)}
                  />
                  {ganttSearchText && (
                    <button
                      type="button"
                      className="search-clear"
                      onClick={() => setGanttSearchText('')}
                      title={tg('gantt.toolbar.clear_filter')}
                    >
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>
                <span className="div-v" />
                <ExportDropdown
                  label={tg('gantt.toolbar.export')}
                  onPdf={onExportPdf}
                  onImage={onExportImage}
                  onJson={onExportJson}
                  pdfLabel={tg('gantt.toolbar.export_pdf')}
                  imgLabel={tg('gantt.toolbar.export_image')}
                  jsonLabel={tg('gantt.toolbar.export_json')}
                />
              </>
            )}
            {pageTab === 'timesheet' ? (
              <>
                {/* Timesheet — CTA "+ Adicionar lançamento":
                   - Só na sub-tab "mine"
                   - Só com TIMESHEET_LOG
                   - Bloqueado quando a semana está em revisão (SUBMITTED/PARTIAL)
                     ou aprovada (APPROVED) — coerente com a grelha bloqueada.
                     Para mexer, user tem de clicar "Editar semana" primeiro. */}
                {timesheetSubTab === 'mine' && canDo('TIMESHEET_LOG')
                  && timesheetWeekStatus !== 'SUBMITTED'
                  && timesheetWeekStatus !== 'PARTIAL'
                  && timesheetWeekStatus !== 'APPROVED' && (
                  <button
                    type="button"
                    className="btn-primary-tb"
                    onClick={onCreateTimesheetEntry}
                  >
                    <i className="ri-add-line" />
                    <span>{tts('toolbar.add_entry')}</span>
                  </button>
                )}
              </>
            ) : pageTab === 'board' ? (
              <>
                {/* Search box (mirror Gantt) */}
                <div className="search">
                  <i className="ti ti-search" />
                  <input
                    type="text"
                    placeholder={tb('toolbar.search_placeholder')}
                    value={boardSearchText}
                    onChange={(e) => setBoardSearchText(e.target.value)}
                  />
                  {boardSearchText && (
                    <button
                      type="button"
                      className="search-clear"
                      onClick={() => setBoardSearchText('')}
                      title={tb('toolbar.clear_search')}
                    >
                      <i className="ti ti-x" />
                    </button>
                  )}
                </div>
                {canDo('TASK_CREATE') && (
                  <button
                    type="button"
                    className="btn-primary-tb"
                    onClick={onCreateTask}
                  >
                    <i className="ri-add-line" />
                    <span>{t('task.btn_add')}</span>
                  </button>
                )}
              </>
            ) : pageTab !== 'calendar' ? (
              <>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={onOpenStates}
                  title={t('task.btn_manage_states')}
                >
                  <i className="ri-stack-line" />
                  <span>{t('task.btn_manage_states')}</span>
                </button>
                {canDo('TASK_CREATE') && (
                  <button
                    type="button"
                    className="btn-primary-tb"
                    onClick={onCreateTask}
                  >
                    <i className="ri-add-line" />
                    <span>{t('task.btn_add')}</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {canDo('CALENDAR_EVENT_TYPE_MANAGE') && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={onOpenEventTypes}
                    title={tcal('toolbar.event_types')}
                  >
                    <i className="ri-price-tag-3-line" />
                    <span>{tcal('toolbar.event_types')}</span>
                  </button>
                )}
                {canDo('CALENDAR_EVENT_CREATE') && (
                  <button
                    type="button"
                    className="btn-primary-tb"
                    onClick={onCreateEvent}
                  >
                    <i className="ri-add-line" />
                    <span>{tcal('toolbar.new_event')}</span>
                  </button>
                )}
              </>
            )}
            {/* Fullscreen — disponível em qualquer tab (Gantt/Board/Calendar/Planning) */}
            <button
              type="button"
              className="ibtn"
              title={viewFullscreen ? tg('gantt.toolbar.fullscreen_exit') : tg('gantt.toolbar.fullscreen_enter')}
              onClick={handleViewFullscreen}
            >
              <i className={`ti ${viewFullscreen ? 'ti-arrows-minimize' : 'ti-arrows-maximize'}`} />
            </button>
          </div>
        </div>

        {/* ── Row 2 ────────────────────────────────────────────────── */}
        {pageTab === 'planning' && (
          <div className="tb__row2">
            <div className="subtabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={planSubTab === 'tasks'}
                className={planSubTab === 'tasks' ? 'is-active' : ''}
                onClick={() => setPlanSubTab('tasks')}
              >
                <i className="ri-task-line" />
                <span>{t('tab.tasks')}</span>
                <span className="count">{counts.tasks}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={planSubTab === 'resources'}
                className={planSubTab === 'resources' ? 'is-active' : ''}
                onClick={() => setPlanSubTab('resources')}
              >
                <i className="ri-group-line" />
                <span>{t('tab.resources')}</span>
                <span className="count">{counts.resources}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={planSubTab === 'links'}
                className={planSubTab === 'links' ? 'is-active' : ''}
                onClick={() => setPlanSubTab('links')}
              >
                <i className="ri-links-line" />
                <span>{t('tab.links')}</span>
                <span className="count">{counts.links}</span>
              </button>
            </div>
            {planSubTab === 'tasks' && (
              <>
                <span className="div-v" />
                <div className="status-filters" role="tablist">
                  <button
                    type="button"
                    className={`chip${taskColumnFilter === 'all' ? ' is-active' : ''}`}
                    onClick={() => setTaskColumnFilter('all')}
                  >
                    <span>{t('task.filter.all')}</span>
                    <span className="count">{totalTasks}</span>
                  </button>
                  {taskStates.map((col) => {
                    const label = col.label ?? (col.labelKey ? t(col.labelKey as Parameters<typeof t>[0]) : col.publicId);
                    const count = columnCounts[col.publicId] ?? 0;
                    const active = taskColumnFilter === col.publicId;
                    return (
                      <button
                        key={col.publicId}
                        type="button"
                        className={`chip${active ? ' is-active' : ''}`}
                        onClick={() => setTaskColumnFilter(col.publicId)}
                      >
                        {col.color && (
                          <span
                            aria-hidden="true"
                            style={{
                              display: 'inline-block',
                              width: 8, height: 8,
                              borderRadius: '50%',
                              background: col.color,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span>{label}</span>
                        <span className="count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {pageTab === 'gantt' && (
          <div className="tb__row2">
            <div className="zoom-seg" role="group">
              <button
                type="button"
                className="ibtn"
                title={tg('gantt.toolbar.zoom_out')}
                onClick={handleGanttZoomOut}
                disabled={ganttZoomLevel <= getMinZoomIndex(ganttViewUnit)}
              >
                <i className="ti ti-zoom-out" />
              </button>
              <span className="zoom-label">{zoomPct}%</span>
              <button
                type="button"
                className="ibtn"
                title={tg('gantt.toolbar.zoom_in')}
                onClick={handleGanttZoomIn}
                disabled={ganttZoomLevel === ZOOM_LEVELS.length - 1}
              >
                <i className="ti ti-zoom-in" />
              </button>
            </div>
            <button
              type="button"
              className="ibtn"
              title={tg('gantt.toolbar.zoom_reset')}
              onClick={handleGanttZoomReset}
              disabled={ganttZoomLevel === DEFAULT_ZOOM_INDEX}
            >
              <i className="ti ti-zoom-cancel" />
            </button>
            <span className="div-v" />
            {/* Toggle Day | Hour — granularidade visual do widget. Persiste em
                GanttConfig PROJECT/USER. Ver docs/claude/tools/gantt/interactions.md.
                Usa estilo "pill" inline (width: auto + padding) — `.ibtn` por
                default é quadrada 30x30, não cabe ícone + texto. */}
            <div
              className="zoom-seg"
              role="group"
              style={{ display: 'inline-flex', gap: 2, padding: 2 }}
              aria-label={tg('gantt.toolbar.day_short') + ' / ' + tg('gantt.toolbar.hour_short')}
            >
              <button
                type="button"
                className={`ibtn${ganttViewUnit === 'day' ? ' is-active' : ''}`}
                title={tg('gantt.toolbar.view_day')}
                onClick={() => onChangeGanttViewUnit('day')}
                style={{ width: 'auto', padding: '0 8px', gap: 4, fontSize: 12, fontWeight: 500 }}
              >
                <i className="ti ti-calendar" />
                <span>{tg('gantt.toolbar.day_short')}</span>
              </button>
              <button
                type="button"
                className={`ibtn${ganttViewUnit === 'hour' ? ' is-active' : ''}`}
                title={tg('gantt.toolbar.view_hour')}
                onClick={() => onChangeGanttViewUnit('hour')}
                style={{ width: 'auto', padding: '0 8px', gap: 4, fontSize: 12, fontWeight: 500 }}
              >
                <i className="ti ti-clock" />
                <span>{tg('gantt.toolbar.hour_short')}</span>
              </button>
            </div>
            <span className="div-v" />
            <button
              type="button"
              className="ibtn"
              title={ganttAllExpanded ? tg('gantt.toolbar.collapse') : tg('gantt.toolbar.expand')}
              onClick={handleGanttToggleExpand}
            >
              <i className={`ti ${ganttAllExpanded ? 'ti-fold' : 'ti-fold-up'}`} />
            </button>
            <button
              type="button"
              className={`ibtn${showResourceGrid ? ' is-active' : ''}`}
              title={showResourceGrid ? tg('gantt.toolbar.hide_resources') : tg('gantt.toolbar.show_resources')}
              onClick={handleToggleResourceGrid}
            >
              <i className="ti ti-layout-rows" />
            </button>
            <span className="tb__spacer" />
            {canDo('TASK_EDIT') && (
              <button
                type="button"
                className={`ibtn${autoScheduling ? ' is-active' : ''}`}
                title={autoScheduling ? tg('gantt.toolbar.disable_auto_scheduling') : tg('gantt.toolbar.enable_auto_scheduling')}
                onClick={handleToggleAutoScheduling}
              >
                <i className="ti ti-arrows-shuffle" />
              </button>
            )}
            <button
              type="button"
              className={`ibtn${showTooltips ? ' is-active' : ''}`}
              title={showTooltips ? tg('gantt.toolbar.disable_tooltips') : tg('gantt.toolbar.enable_tooltips')}
              onClick={handleToggleTooltips}
            >
              <i className="ti ti-message-dots" />
            </button>
            <span className="div-v" />
            {canDo('GANTT_CONFIG') && (
              <button
                type="button"
                className="ibtn"
                title={tg('gantt.toolbar.config_btn')}
                onClick={() => setGanttConfigOpen(true)}
              >
                <i className="ti ti-settings" />
              </button>
            )}
          </div>
        )}

        {pageTab === 'calendar' && (
          <div className="tb__row2">
            <button
              type="button"
              className="calendar-sources-toggle"
              onClick={onToggleCalendarSources}
              title={tcal('toolbar.toggle_sources')}
              aria-pressed={calendarSourcesOpen}
            >
              <i className={calendarSourcesOpen ? 'ri-menu-fold-line' : 'ri-menu-unfold-line'} />
            </button>
            <span className="tb__spacer" />
            {canDo('CALENDAR_EVENT_TYPE_MANAGE') && (
              <button
                type="button"
                className="ibtn"
                title={tcal('toolbar.event_types')}
                onClick={onOpenEventTypes}
              >
                <i className="ri-settings-3-line" />
              </button>
            )}
          </div>
        )}

        {pageTab === 'board' && (
          <div className="tb__row2">
            {/* Add column / Add swimlane (gated por STATE_MANAGE) */}
            {canDo('STATE_MANAGE') && (
              <>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={onAddBoardColumn}
                  title={tb('toolbar.add_column')}
                >
                  <i className="ri-add-line" />
                  <span>{tb('toolbar.add_column')}</span>
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={onAddBoardSwimlane}
                  title={tb('toolbar.add_swimlane')}
                >
                  <i className="ri-add-line" />
                  <span>{tb('toolbar.add_swimlane')}</span>
                </button>
                <span className="div-v" />
              </>
            )}
            {/* Toggle swimlanes — só visível quando existem raias */}
            {boardSwimlaneCount > 0 && (
              <button
                type="button"
                className={`ibtn${boardShowSwimlanes ? ' is-active' : ''}`}
                onClick={onToggleBoardSwimlanes}
                title={boardShowSwimlanes ? tb('toolbar.hide_swimlanes') : tb('toolbar.show_swimlanes')}
                aria-pressed={boardShowSwimlanes}
              >
                <i className="ri-layout-row-line" />
              </button>
            )}

            <span className="tb__spacer" />

            {/* Undo / Redo (gated por TASK_EDIT — undoable só faz sentido se pode editar) */}
            {canDo('TASK_EDIT') && (
              <>
                <button
                  type="button"
                  className="ibtn"
                  onClick={onBoardUndo}
                  disabled={!boardCanUndo}
                  title={tb('toolbar.undo')}
                >
                  <i className="ri-arrow-go-back-line" />
                </button>
                <button
                  type="button"
                  className="ibtn"
                  onClick={onBoardRedo}
                  disabled={!boardCanRedo}
                  title={tb('toolbar.redo')}
                >
                  <i className="ri-arrow-go-forward-line" />
                </button>
              </>
            )}

            {/* Engrenagem de configuração do board — lado direito do Row 2, padrão Gantt/Calendário */}
            {canDo('BOARD_CONFIG') && (
              <>
                <span className="div-v" />
                <button
                  type="button"
                  className="ibtn"
                  title={tb('btn.board_config')}
                  onClick={onOpenBoardConfig}
                >
                  <i className="ri-settings-3-line" />
                </button>
              </>
            )}
          </div>
        )}

        {pageTab === 'timesheet' && (
          <div className="tb__row2 ts-toolbar">
            <div className="ts-subtabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={timesheetSubTab === 'mine'}
                className={timesheetSubTab === 'mine' ? 'is-active' : ''}
                onClick={() => setTimesheetSubTab('mine')}
              >
                <i className="ri-time-line" />
                <span>{tts('subtab.mine')}</span>
              </button>
              {canDo('TIMESHEET_APPROVE') && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={timesheetSubTab === 'team'}
                  className={timesheetSubTab === 'team' ? 'is-active' : ''}
                  onClick={() => setTimesheetSubTab('team')}
                >
                  <i className="ri-group-line" />
                  <span>{tts('subtab.team')}</span>
                </button>
              )}
            </div>

            {/* Toggle Mensal/Semanal — só na vista 'team' */}
            {timesheetSubTab === 'team' && (
              <>
                <span className="div-v" />
                <div className="ts-subtabs" role="tablist" aria-label={tts('toolbar.view_toggle')}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={timesheetTeamView === 'monthly'}
                    className={timesheetTeamView === 'monthly' ? 'is-active' : ''}
                    onClick={() => setTimesheetTeamView('monthly')}
                  >
                    <i className="ri-calendar-line" />
                    <span>{tts('toolbar.monthly')}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={timesheetTeamView === 'weekly'}
                    className={timesheetTeamView === 'weekly' ? 'is-active' : ''}
                    onClick={() => setTimesheetTeamView('weekly')}
                  >
                    <i className="ri-calendar-todo-line" />
                    <span>{tts('toolbar.weekly')}</span>
                  </button>
                </div>
              </>
            )}

            <span className="div-v" />

            {/* Navegação — Mensal: ‹ › Hoje + "Abril 2025" · Semanal: ‹ › "14 abr – 20 abr" */}
            {timesheetSubTab === 'team' && timesheetTeamView === 'monthly' ? (
              <>
                <button
                  type="button"
                  className="ibtn"
                  onClick={onPrevTimesheetMonth}
                  disabled={timesheetMonthIsAtStart}
                  title={tts('toolbar.prev_month')}
                >
                  <i className="ri-arrow-left-s-line" />
                </button>
                <button
                  type="button"
                  className="ibtn"
                  onClick={onNextTimesheetMonth}
                  disabled={timesheetMonthIsAtEnd}
                  title={tts('toolbar.next_month')}
                >
                  <i className="ri-arrow-right-s-line" />
                </button>
                <button type="button" className="btn-ghost" onClick={onTodayTimesheetMonth}>
                  <span>{tts('toolbar.today')}</span>
                </button>
                <span className="ts-week-range">{formatMonthLong(timesheetMonthIso)}</span>
              </>
            ) : (
              <>
                <button type="button" className="ibtn" onClick={onPrevTimesheetWeek} title={tts('toolbar.prev_week')}>
                  <i className="ri-arrow-left-s-line" />
                </button>
                <button type="button" className="ibtn" onClick={onNextTimesheetWeek} title={tts('toolbar.next_week')}>
                  <i className="ri-arrow-right-s-line" />
                </button>
                <span className="ts-week-range">{formatWeekRangeShort(timesheetWeekStart)}</span>
                {timesheetWeekStatus && timesheetSubTab === 'mine' && (
                  <span className={`ts-pill ts-pill--${timesheetWeekStatus.toLowerCase()}`}>
                    {tts(`status.${timesheetWeekStatus.toLowerCase()}` as 'status.draft')}
                  </span>
                )}
              </>
            )}

            <span className="spacer" />

            {/* Acções específicas por contexto */}
            {timesheetSubTab === 'mine' ? (
              <>
                {canDo('TIMESHEET_LOG') && (
                  <>
                    {/* "Copiar semana" só faz sentido quando a semana actual
                       (destino) é editável — bloqueia em SUBMITTED/PARTIAL/APPROVED. */}
                    {timesheetWeekStatus !== 'SUBMITTED'
                      && timesheetWeekStatus !== 'PARTIAL'
                      && timesheetWeekStatus !== 'APPROVED' && (
                      <button type="button" className="btn-ghost" onClick={onCopyTimesheetWeek}>
                        <i className="ri-file-copy-line" />
                        <span>{tts('toolbar.copy_week')}</span>
                      </button>
                    )}
                    {/* Submit ↔ Edit ↔ none — depende do estado da semana.
                       APPROVED: nenhum botão (semana imutável).
                       SUBMITTED: "Editar semana" (cor laranja — destaque acção reversível).
                       DRAFT/REJECTED/PARTIAL: "Submeter semana" (cor violeta — destaque CTA principal). */}
                    {timesheetWeekStatus === 'SUBMITTED' && onEditTimesheetWeek ? (
                      <button type="button" className="ts-btn-edit-week" onClick={onEditTimesheetWeek}>
                        <i className="ri-pencil-line" />
                        <span>{tts('toolbar.edit_week')}</span>
                      </button>
                    ) : timesheetWeekStatus !== 'APPROVED' ? (
                      <button type="button" className="ts-btn-submit-week" onClick={onSubmitTimesheetWeek}>
                        <i className="ri-send-plane-line" />
                        <span>{tts('toolbar.submit_week')}</span>
                      </button>
                    ) : null}
                  </>
                )}
              </>
            ) : (
              // Team view (mensal OU semanal): filtros de estado SEMPRE visíveis
              // para o user poder voltar a "Todos" / saltar para outro filtro
              // mesmo quando muda de mensal ↔ semanal. Os contadores vêm da
              // mesma fonte (teamData.data.counts) por isso são correctos em ambos.
              <>
                <span className="label">{tts('toolbar.filter_state')}</span>
                <div className="status-filters" role="tablist">
                  {(['all','SUBMITTED','APPROVED','REJECTED','PARTIAL','DRAFT'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`chip${timesheetTeamFilter === k ? ' is-active' : ''}`}
                      onClick={() => setTimesheetTeamFilter(k)}
                    >
                      <span>{tts(`filter.${k.toLowerCase()}` as 'filter.all')}</span>
                      <span className="count">{timesheetTeamCounts[k]}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* História — sempre visível no tab Timesheet (mine/team, monthly/weekly).
               Modal abre sempre com vista do projecto inteiro; filtros internos
               permitem narrow-down por user/acção. */}
            <button type="button" className="ibtn ts-history-btn" onClick={onOpenTimesheetHistory} title={tts('toolbar.history')}>
              <i className="ri-history-line" />
            </button>
          </div>
        )}

        {/* Row 2 do Board removida em Abril 2026. Para reintroduzir o tab,
            ver `docs/claude/future-board.md` §3.2 — col-strip + toggles. */}
      </div>
    </div>
  );
}

/* ─── Export dropdown (React-state, click-outside) ─────────────────────────
 * O menu é renderizado via portal (document.body) com `position: fixed`,
 * ancorado ao botão por `getBoundingClientRect()`. Isto escapa o
 * `overflow:hidden` do `.tb` parent que cortava o dropdown.
 */
function ExportDropdown(p: {
  label: string;
  pdfLabel: string;
  imgLabel: string;
  jsonLabel: string;
  onPdf:   () => void;
  onImage: () => void;
  onJson:  () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !wrapRef.current) { setPos(null); return; }
    const update = () => {
      const r = wrapRef.current?.getBoundingClientRect();
      if (!r) return;
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <div ref={wrapRef} className="export-wrap">
      <button
        type="button"
        className="btn-ghost"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <i className="ri-download-2-line" />
        <span>{p.label}</span>
        <i className="ri-arrow-down-s-line caret" />
      </button>
      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="export-menu"
          role="menu"
          style={{ position: 'fixed', top: pos.top, right: pos.right }}
        >
          <button type="button" onClick={pick(p.onPdf)}>
            <i className="ri-file-pdf-line text-danger" />
            <span>{p.pdfLabel}</span>
          </button>
          <button type="button" onClick={pick(p.onImage)}>
            <i className="ri-image-line text-primary" />
            <span>{p.imgLabel}</span>
          </button>
<div className="sep" />
          <button type="button" onClick={pick(p.onJson)}>
            <i className="ri-code-line text-success" />
            <span>{p.jsonLabel}</span>
          </button>
        </div>,
        // Target o elemento fullscreen quando activo — caso contrário document.body
        // fica fora do fullscreen e o portal não é visível.
        document.fullscreenElement ?? document.body,
      )}
    </div>
  );
}
