import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITimesheetBundle } from '../types';
import {
  daysOfWeek,
  dayOfWeekLabelPT,
  formatDayShort,
  formatHours,
  isTodayISO,
} from '../dateUtils';
import { TimesheetCell } from './TimesheetCell';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { useTimezone } from '../../../contexts/TimezoneContext';

interface Props {
  bundle:       ITimesheetBundle;
  weekStart:    string;
  canEdit:      boolean;          // true se a vista é a própria, false para vista do gestor
  /** POST /entries — usar SÓ quando não há entry no (task, day) — backend faz lazy-create e agrega. */
  onUpsertEntry: (taskPublicId: string, workDate: string, hours: number) => void;
  /** PATCH /entries/:id — substitui o valor de uma entry existente (replace, não soma). */
  onUpdateEntry: (entryPublicId: string, hours: number) => void;
  onDeleteEntry: (entryPublicId: string) => void;
  onDeleteRow:   (taskPublicId: string) => void;
}

/**
 * Grelha tasks×dias:
 *  - Linhas = tasks que o utilizador adicionou nesta semana (REQ-G05).
 *  - Colunas = 7 dias (Mon..Sun).
 *  - Coluna Total à direita; rodapé com totais por dia + total semanal.
 */
export function TimesheetGrid({ bundle, weekStart, canEdit, onUpsertEntry, onUpdateEntry, onDeleteEntry, onDeleteRow }: Props) {
  const { t } = useTranslation('timesheet');
  const dateFormat = useResolvedDateFormat();
  const tz = useTimezone();

  const days = useMemo(() => daysOfWeek(weekStart), [weekStart]);

  // Indexação rápida: dayStatus por workDate
  const dayStatusByDate = useMemo(() => {
    const map = new Map<string, typeof bundle.days[number]>();
    for (const d of bundle.days) map.set(d.workDate, d);
    return map;
  }, [bundle.days]);

  // Agregar entries por (taskPublicId, workDate). Pode haver só 1 entry por (task, day) (uq_entry).
  const rowsByTask = useMemo(() => {
    const grouped = new Map<string, {
      taskPublicId: string;
      taskText:     string;
      cells:        Map<string, typeof bundle.entries[number]>; // workDate → entry
      total:        number;
    }>();
    for (const e of bundle.entries) {
      let row = grouped.get(e.taskPublicId);
      if (!row) {
        row = { taskPublicId: e.taskPublicId, taskText: e.taskText, cells: new Map(), total: 0 };
        grouped.set(e.taskPublicId, row);
      }
      row.cells.set(e.workDate, e);
      row.total += e.hours;
    }
    return Array.from(grouped.values()).sort((a, b) => a.taskText.localeCompare(b.taskText));
  }, [bundle.entries]);

  // Total por dia (footer) + total semanal
  const totalsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of bundle.entries) map.set(e.workDate, (map.get(e.workDate) ?? 0) + e.hours);
    return map;
  }, [bundle.entries]);
  const weekTotal = useMemo(
    () => bundle.entries.reduce((s, e) => s + e.hours, 0),
    [bundle.entries],
  );

  // Para indicar se uma linha tem dia bloqueado (impede botão de delete row)
  function rowHasLocked(taskPublicId: string): boolean {
    for (const e of bundle.entries) {
      if (e.taskPublicId !== taskPublicId) continue;
      const d = dayStatusByDate.get(e.workDate);
      if (d && (d.status === 'SUBMITTED' || d.status === 'APPROVED')) return true;
    }
    return false;
  }

  return (
    <div className="ts-table">
      <table>
        <thead>
          <tr>
            <th>{t('table.col.task')}</th>
            {days.map((dateIso) => (
              <th key={dateIso} className={`day${isTodayISO(dateIso, tz) ? ' is-today' : ''}`}>
                {dayOfWeekLabelPT(dateIso)}
                <span className="d-num">{formatDayShort(dateIso, dateFormat)}</span>
              </th>
            ))}
            <th className="total">{t('table.col.total')}</th>
          </tr>
        </thead>
        <tbody>
          {rowsByTask.length === 0 && (
            <tr>
              <td colSpan={days.length + 2} className="text-muted text-center" style={{ padding: 24, fontSize: 12.5 }}>
                {t('table.row.empty_hint')}
              </td>
            </tr>
          )}
          {rowsByTask.map((row) => {
            const locked = rowHasLocked(row.taskPublicId);
            return (
              <tr key={row.taskPublicId}>
                <td className="task-cell">
                  <div className="nm">{row.taskText}</div>
                  {bundle.tasks[0]?.projectName && <div className="proj">{bundle.tasks[0].projectName}</div>}
                  {canEdit && !locked && (
                    <span className="row-actions">
                      <button
                        type="button"
                        title={t('table.row.delete')}
                        onClick={() => onDeleteRow(row.taskPublicId)}
                      >
                        <i className="ri-delete-bin-line" />
                      </button>
                    </span>
                  )}
                </td>
                {days.map((dateIso) => {
                  const day = dayStatusByDate.get(dateIso);
                  const dayStatus = day?.status ?? 'DRAFT';
                  const entry = row.cells.get(dateIso) ?? null;
                  return (
                    <td key={dateIso} className="day">
                      <TimesheetCell
                        entry={entry}
                        dayStatus={dayStatus}
                        weekStatus={bundle.week.status}
                        canEdit={canEdit}
                        onUpsert={(h) => onUpsertEntry(row.taskPublicId, dateIso, h)}
                        onUpdate={(id, h) => onUpdateEntry(id, h)}
                        onDelete={() => entry && onDeleteEntry(entry.publicId)}
                      />
                    </td>
                  );
                })}
                <td className="total">{formatHours(row.total)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td>{t('table.row.day_total')}</td>
            {days.map((dateIso) => {
              const total = totalsByDay.get(dateIso) ?? 0;
              const day = dayStatusByDate.get(dateIso);
              const isRejected = day?.status === 'REJECTED';
              return (
                <td key={dateIso} className={`day${isRejected ? ' day-rejected' : ''}`}>
                  {total > 0 ? (
                    isRejected ? `${formatHours(total)} ${t('table.row.rejected_short')}` : formatHours(total)
                  ) : '–'}
                </td>
              );
            })}
            <td className="total">{formatHours(weekTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
