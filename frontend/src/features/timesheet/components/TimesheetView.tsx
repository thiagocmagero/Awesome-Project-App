import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useTimesheetData } from '../useTimesheetData';
import { useTimesheetTeam } from '../useTimesheetTeam';
import { useTimesheetCalendar } from '../useTimesheetCalendar';
import type { TimesheetWeekStatus } from '../types';
import { TimesheetGrid } from './TimesheetGrid';
import { TimesheetRejectionBanner } from './TimesheetRejectionBanner';
import { TimesheetTeamSidebar } from './TimesheetTeamSidebar';
import { TimesheetTeamPersonHeader } from './TimesheetTeamPersonHeader';
import { TimesheetMonthView } from './TimesheetMonthView';
import { TimesheetMonthHeader } from './TimesheetMonthHeader';
import { TimesheetAddEntryModal } from './TimesheetAddEntryModal';
import { TimesheetCopyWeekModal } from './TimesheetCopyWeekModal';
import { TimesheetRejectDayModal } from './TimesheetRejectDayModal';
import { TimesheetHistoryModal } from './TimesheetHistoryModal';
import { confirmAction } from '../../../lib/confirm';
import { formatWeekRange, weekStartOfISO } from '../dateUtils';

interface Props {
  projectPublicId:    string;
  weekStart:          string;
  subTab:             'mine' | 'team';
  /** Sub-modo da vista 'team': monthly (panorama) ou weekly (drill-down). */
  teamView:           'monthly' | 'weekly';
  /** Mês activo na vista mensal — 'YYYY-MM'. */
  monthIso:           string;
  canDoLog:           boolean;
  canDoApprove:       boolean;
  /** Actions controladas externamente (toolbar) */
  showAddEntryModal:  boolean;
  showCopyWeekModal:  boolean;
  showHistoryModal:   boolean;
  onCloseAddEntry:    () => void;
  onCloseCopyWeek:    () => void;
  onCloseHistory:     () => void;
  onOpenHistory:      () => void;
  /** Submit week (do toolbar) */
  submitTrigger:      number;     // incrementar no parent para disparar submit
  /** Edit week (toolbar) — reverte SUBMITTED → DRAFT para o utilizador editar */
  editTrigger:        number;     // incrementar no parent para disparar unsubmit
  /** Filter para vista team (toolbar) */
  teamFilter:         'all' | TimesheetWeekStatus;
  /** Callback para o parent: drill-down de monthly → weekly numa semana específica. */
  onDrillDownToWeek?: (weekStartIso: string) => void;
  /** Callbacks para o parent saber o status/counts (UI da toolbar) */
  onWeekStatusChange?: (s: TimesheetWeekStatus | null) => void;
  onTeamCountsChange?: (c: { all: number; SUBMITTED: number; APPROVED: number; REJECTED: number; PARTIAL: number; DRAFT: number }) => void;
  /** Para que o toolbar saiba os limites do projecto e desabilite prev/next mensal nos limites. */
  onProjectRangeChange?: (start: string | null, end: string | null) => void;
}

/**
 * TimesheetView — engloba ambas as sub-vistas (mine | team) dentro do projecto.
 * A toolbar (Row 2) é renderizada pelo PlanningPage/UnifiedToolbar; este componente
 * lida com estado interno de qual user a visualizar (team) e modais.
 */
export function TimesheetView({
  projectPublicId, weekStart, subTab, teamView, monthIso,
  canDoLog, canDoApprove,
  showAddEntryModal, showCopyWeekModal, showHistoryModal,
  onCloseAddEntry, onCloseCopyWeek, onCloseHistory, onOpenHistory,
  submitTrigger,
  editTrigger,
  teamFilter,
  onDrillDownToWeek,
  onWeekStatusChange, onTeamCountsChange,
  onProjectRangeChange,
}: Props) {
  const { t }     = useTranslation('timesheet');
  const { t: tc } = useTranslation('common');

  // ── Vista 'team': qual user estamos a ver ─────────────────────────────────
  // null = sem selecção (mostra empty state); quando subTab='team', auto-selecciona
  // o primeiro membro disponível da equipa (excluindo o próprio).
  const [viewedUserPublicId, setViewedUserPublicId] = useState<string | null>(null);
  useEffect(() => {
    // Reset ao trocar de subtab
    setViewedUserPublicId(null);
  }, [subTab]);

  // ── Hooks de dados ────────────────────────────────────────────────────────
  const tsData = useTimesheetData(projectPublicId, weekStart, viewedUserPublicId);
  const teamData = useTimesheetTeam(projectPublicId, weekStart, subTab === 'team' && canDoApprove);
  useEffect(() => { teamData.setFilter(teamFilter); }, [teamFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Vista mensal (apenas em subTab='team' e teamView='monthly')
  const monthEnabled = subTab === 'team' && teamView === 'monthly' && canDoApprove;
  const monthData = useTimesheetCalendar(
    projectPublicId,
    monthEnabled ? monthIso : null,
    viewedUserPublicId,    // null = agregado, user = individual
    monthEnabled,
  );

  // Reporta range do projecto ao parent (toolbar mensal precisa para limites de navegação).
  // ⚠️ NÃO incluir `onProjectRangeChange` nas deps: se o parent passar um arrow inline,
  // a ref muda em cada render e este effect re-dispara setState no parent → loop infinito.
  // O parent deve usar `useCallback` ou comparar valores antes de actualizar.
  useEffect(() => {
    if (!onProjectRangeChange) return;
    onProjectRangeChange(monthData.data.project.startDate, monthData.data.project.endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthData.data.project.startDate, monthData.data.project.endDate]);

  // Auto-selecciona o primeiro membro da equipa (excluindo o próprio) ao
  // entrar na vista 'team' WEEKLY se ainda nada estiver seleccionado.
  // Em 'monthly', `null` é estado válido (= "Vista agregada"), não auto-seleccionamos.
  //
  // ⚠️ `selfPublicId` é o **utilizador autenticado** (auth context), NÃO o
  // `member` do bundle. O `member` no bundle é o SUBJECT (quem está a ser
  // visualizado) — pode ser outro user quando o gestor selecciona alguém.
  // Se usássemos `tsData.data.member.publicId`, ao seleccionar X o sidebar
  // filtrava X (porque selfPublicId passava a ser X) e X "desaparecia" da
  // lista. Bug confirmado e fixado em Abril 2026.
  const { user: authUser } = useAuth();
  const selfPublicId = authUser?.publicId ?? null;
  useEffect(() => {
    if (subTab !== 'team') return;
    if (teamView !== 'weekly') return;
    if (viewedUserPublicId !== null) return;
    if (teamData.data.rows.length === 0) return;
    const firstNonSelf = teamData.data.rows.find((r) => r.user.publicId !== selfPublicId);
    if (firstNonSelf) setViewedUserPublicId(firstNonSelf.user.publicId);
  }, [subTab, teamView, viewedUserPublicId, teamData.data.rows, selfPublicId]);

  // ── Modais locais ─────────────────────────────────────────────────────────
  const [rejectDayOpen, setRejectDayOpen] = useState(false);

  // ── Reporta status & counts ao parent ─────────────────────────────────────
  useEffect(() => {
    if (onWeekStatusChange) onWeekStatusChange(tsData.data.week.publicId ? tsData.data.week.status : null);
  }, [tsData.data.week.status, tsData.data.week.publicId, onWeekStatusChange]);
  useEffect(() => {
    if (onTeamCountsChange) onTeamCountsChange(teamData.data.counts);
  }, [teamData.data.counts, onTeamCountsChange]);

  // ── Submit week — disparado pelo parent via incremento de submitTrigger ───
  // Sempre confirma antes de submeter (REQ Abril 2026).
  useEffect(() => {
    if (submitTrigger === 0) return;
    (async () => {
      const ok = await confirmAction({
        title:       t('confirm.submit_week.title'),
        text:        t('confirm.submit_week.text', { range: formatWeekRange(weekStart) }),
        confirmText: t('confirm.submit_week.confirm'),
        cancelText:  tc('actions.cancel'),
        variant:     'primary',
      });
      if (ok) tsData.submitWeek();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitTrigger]);

  // ── Edit week (unsubmit) — disparado pelo parent via incremento de editTrigger ─
  // Confirma antes de reverter os próprios dias submetidos para DRAFT.
  // Só faz sentido quando week.status === 'SUBMITTED'; o botão na toolbar já
  // gate isso, mas confirmamos aqui também (defense-in-depth).
  useEffect(() => {
    if (editTrigger === 0) return;
    (async () => {
      const ok = await confirmAction({
        title:       t('confirm.edit_own_week.title'),
        text:        t('confirm.edit_own_week.text', { range: formatWeekRange(weekStart) }),
        confirmText: t('confirm.edit_own_week.confirm'),
        cancelText:  tc('actions.cancel'),
        variant:     'primary',
      });
      if (ok) tsData.unsubmitWeek();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTrigger]);

  // ── isSelf computed ───────────────────────────────────────────────────────
  // Em 'mine' a vista é sempre sobre o próprio. Em 'team' a vista é sobre o
  // user seleccionado (nunca o próprio — esse usa a tab "As minhas horas").
  const isSelf = subTab === 'mine';
  const canEditCells = isSelf && canDoLog;

  // Linha activa da equipa (quando viewedUserPublicId está definido)
  const viewedTeamRow = useMemo(() => {
    if (!viewedUserPublicId) return null;
    return teamData.data.rows.find((r) => r.user.publicId === viewedUserPublicId) ?? null;
  }, [teamData.data.rows, viewedUserPublicId]);

  // Que tipo de acções de gestor estão disponíveis para esta semana?
  const hasSubmittedDays = useMemo(
    () => tsData.data.days.some((d) => d.status === 'SUBMITTED'),
    [tsData.data.days],
  );
  const hasFinalisedDays = useMemo(
    () => tsData.data.days.some((d) => d.status === 'APPROVED' || d.status === 'REJECTED'),
    [tsData.data.days],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  //
  // Cada acção do gestor altera o estado dos `TimesheetDay` no servidor. O
  // hook `useTimesheetTeam` faz refresh da lista da equipa após cada
  // mutação, mas os dias do user visualizado vêm do `useTimesheetData`
  // (endpoint `/timesheets/week`) — esse hook NÃO sabe que o servidor mudou.
  //
  // Sem este refresh manual, o `hasSubmittedDays`/`hasFinalisedDays` ficavam
  // calculados sobre `tsData.data.days` velho e os botões Aprovar/Editar só
  // alternavam após F5. Encadeamos `tsData.refresh()` em todas as mutações
  // que tocam o user actual.

  async function handleApproveWeek() {
    if (!viewedTeamRow) return;
    const ok = await teamData.approveWeek(viewedTeamRow.user.publicId, weekStart);
    if (ok) await tsData.refresh();
  }
  async function handleApproveMonth(year: number, month: number) {
    if (!viewedTeamRow) return;
    const ok = await teamData.approveMonth(viewedTeamRow.user.publicId, year, month);
    if (ok) await tsData.refresh();
  }
  async function handleRevertWeek() {
    if (!viewedTeamRow) return;
    const ok = await teamData.revertWeek(viewedTeamRow.user.publicId, weekStart);
    if (ok) await tsData.refresh();
  }
  async function handleRevertMonth(year: number, month: number) {
    if (!viewedTeamRow) return;
    const ok = await teamData.revertMonth(viewedTeamRow.user.publicId, year, month);
    if (ok) await tsData.refresh();
  }
  function openRejectDay() {
    if (!viewedTeamRow) return;
    setRejectDayOpen(true);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (subTab === 'mine') {
    return (
      <>
        <div className="ts-frame ts-frame--mine-only">
          <div>
            <TimesheetGrid
              bundle={tsData.data}
              weekStart={weekStart}
              canEdit={canEditCells}
              onUpsertEntry={(taskPublicId, workDate, hours) => tsData.upsertEntry({ taskPublicId, workDate, hours })}
              onUpdateEntry={(entryPublicId, hours) => tsData.updateEntry(entryPublicId, { hours })}
              onDeleteEntry={(entryPublicId) => tsData.deleteEntry(entryPublicId)}
              onDeleteRow={(taskPublicId) => tsData.deleteRow(taskPublicId)}
            />
            <TimesheetRejectionBanner days={tsData.data.days} />
          </div>
        </div>

        <TimesheetAddEntryModal
          open={showAddEntryModal}
          weekStart={weekStart}
          tasks={tsData.data.tasks}
          onClose={onCloseAddEntry}
          onSubmit={(p) => tsData.upsertEntry(p)}
        />
        <TimesheetCopyWeekModal
          open={showCopyWeekModal}
          weekStart={weekStart}
          onClose={onCloseCopyWeek}
          onSubmit={(p) => tsData.copyWeek(p)}
        />
        {/* Histórico — também acessível na vista "As minhas horas" porque o
           botão na toolbar está sempre visível. Modal abre com vista projecto-wide
           (sem userPublicId) e oferece filtros internos. */}
        <TimesheetHistoryModal
          open={showHistoryModal}
          projectPublicId={projectPublicId}
          onClose={onCloseHistory}
        />
      </>
    );
  }

  // subTab === 'team'
  return (
    <>
      <div className="ts-frame ts-frame--team">
        <TimesheetTeamSidebar
          rows={teamData.data.rows}
          selfPublicId={selfPublicId}
          selectedUserPublicId={viewedUserPublicId}
          onSelect={setViewedUserPublicId}
          showAggregated={teamView === 'monthly'}
          aggregatedCount={teamData.data.rows.filter((r) => r.user.publicId !== selfPublicId).length}
        />
        <div>
          {teamView === 'monthly' ? (
            // ── Vista mensal — panorama do gestor ─────────────────────────
            <>
              {/* Card de resumo — alterna entre individual e agregada com base
                 no `viewedUserPublicId`. Em ambos os casos mostra o período do
                 projecto. Sem acções de aprovação (essas só na vista semanal). */}
              <TimesheetMonthHeader
                selectedRow={viewedTeamRow}
                monthData={monthData.data}
                weekStart={weekStart}
              />
              <div className="tsm-month-meta">
                <div className="tsm-month-meta__legend">
                  <span className="swatch swatch--complete">{t('month.legend.complete')}</span>
                  <span className="swatch swatch--partial">{t('month.legend.partial')}</span>
                  <span className="swatch swatch--pending">{t('month.legend.pending')}</span>
                  <span className="swatch swatch--out">{t('month.legend.out_of_range')}</span>
                </div>
              </div>
              <TimesheetMonthView
                data={monthData.data}
                monthIso={monthIso}
                onDayClick={(dateIso) => onDrillDownToWeek?.(weekStartOfISO(dateIso))}
                onWeekClick={(weekStartIso) => onDrillDownToWeek?.(weekStartIso)}
              />
            </>
          ) : (
            // ── Vista semanal — drill-down operacional ───────────────────
            <>
              {viewedTeamRow ? (
                <TimesheetTeamPersonHeader
                  row={viewedTeamRow}
                  weekStart={weekStart}
                  hasSubmittedDays={hasSubmittedDays}
                  hasFinalisedDays={hasFinalisedDays}
                  onApproveWeek={handleApproveWeek}
                  onApproveMonth={handleApproveMonth}
                  onRejectDay={openRejectDay}
                  onRevertWeek={handleRevertWeek}
                  onRevertMonth={handleRevertMonth}
                  onOpenHistory={onOpenHistory}
                />
              ) : (
                <div className="ts-person-summary">
                  <div className="info">
                    <div className="nm">{t('team.empty_selection_title')}</div>
                    <div className="sub">{t('team.empty_selection_hint')}</div>
                  </div>
                </div>
              )}
              <TimesheetGrid
                bundle={tsData.data}
                weekStart={weekStart}
                canEdit={canEditCells}
                onUpsertEntry={(taskPublicId, workDate, hours) => tsData.upsertEntry({ taskPublicId, workDate, hours })}
                onUpdateEntry={(entryPublicId, hours) => tsData.updateEntry(entryPublicId, { hours })}
                onDeleteEntry={(entryPublicId) => tsData.deleteEntry(entryPublicId)}
                onDeleteRow={(taskPublicId) => tsData.deleteRow(taskPublicId)}
              />
              <TimesheetRejectionBanner days={tsData.data.days} />
            </>
          )}
        </div>
      </div>

      <TimesheetRejectDayModal
        open={rejectDayOpen}
        days={tsData.data.days}
        subject={viewedTeamRow
          ? `${viewedTeamRow.user.name} · ${formatWeekRange(weekStart)}`
          : ''}
        onClose={() => setRejectDayOpen(false)}
        onSubmit={async (workDate, reason) => {
          if (!viewedTeamRow) return false;
          const ok = await teamData.rejectDay(viewedTeamRow.user.publicId, workDate, reason);
          if (ok) await tsData.refresh();
          return ok;
        }}
      />
      <TimesheetHistoryModal
        open={showHistoryModal}
        projectPublicId={projectPublicId}
        onClose={onCloseHistory}
      />
    </>
  );
}
