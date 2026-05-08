import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { formatDate, formatDateTime } from '../../../lib/dateFormatting';
import { StateBadge } from './StateBadge';
import type { EMPTY_TASK_FORM, GanttTask } from '../types';
import type { ITaskState } from '../states-types';

type TaskFormShape = typeof EMPTY_TASK_FORM;

interface Props {
  taskForm: TaskFormShape;
  setTaskForm: (form: TaskFormShape) => void;
  editingTask: GanttTask | null;
  boardColumns: ITaskState[];
}

interface PriorityInfo {
  pillClass: string;
  labelKey: string;
}

const PRIORITY_INFO: Record<string, PriorityInfo> = {
  '0': { pillClass: 'pill pill-red',   labelKey: 'task.priority.critical' },
  '1': { pillClass: 'pill pill-red',   labelKey: 'task.priority.high' },
  '2': { pillClass: 'pill pill-amber', labelKey: 'task.priority.medium' },
  '3': { pillClass: 'pill pill-blue',  labelKey: 'task.priority.low' },
};

/**
 * Linha 4 — faixa de status sempre visível com 4 colunas:
 * Estado / Início / Progresso / Prioridade.
 *
 * O Estado é clicável: abre popover com as colunas do board para mudar.
 * Em < 780px colapsa para 2x2 (CSS).
 */
export function TaskModalQuickFacts({ taskForm, setTaskForm, editingTask, boardColumns }: Props) {
  const { t } = useTranslation('planning');
  const dateFormat = useResolvedDateFormat();
  const [stateOpen, setStateOpen] = useState(false);
  const stateRef = useRef<HTMLDivElement>(null);

  // Fechar popover ao clicar fora
  useEffect(() => {
    if (!stateOpen) return;
    function onDocClick(e: MouseEvent) {
      if (!stateRef.current) return;
      if (!stateRef.current.contains(e.target as Node)) setStateOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [stateOpen]);

  // Estado: lookup da coluna (já existe StateBadge component) ───────────────
  const stateColumn = boardColumns.find((c) => c.publicId === taskForm.boardColumn);
  const allowsState = taskForm.type !== 'project' && taskForm.type !== 'milestone';

  const resolveLabel = (col: ITaskState): string => {
    if (col.label) return col.label;
    if (col.labelKey) return t(col.labelKey as Parameters<typeof t>[0]);
    return col.publicId;
  };

  // Início: data formatada + duração ──────────────────────────────────────
  const startDate = taskForm.start_date
    ? (taskForm.durationUnit === 'HOUR'
        ? formatDateTime(parseGanttWire(taskForm.start_date), dateFormat)
        : formatDate(parseGanttWire(taskForm.start_date), dateFormat))
    : '—';

  const durationText = taskForm.type === 'milestone'
    ? t('task.qf.milestone')
    : (taskForm.durationUnit === 'HOUR'
        ? t('task.qf.duration_hours', { count: Number(taskForm.duration) })
        : t('task.qf.duration_days', { count: Number(taskForm.duration) }));

  // Progresso: 0-100 ──────────────────────────────────────────────────────
  const progressNum = Math.max(0, Math.min(100, Number(taskForm.progress) || 0));

  // Prioridade: pill colorida + label ─────────────────────────────────────
  const priorityInfo = taskForm.priority ? PRIORITY_INFO[taskForm.priority] : null;
  const priorityLabel = priorityInfo ? t(priorityInfo.labelKey as never) : t('task.priority.none');

  return (
    <div className="task-quickfacts">
      <div className="task-quickfact" ref={stateRef} style={{ position: 'relative' }}>
        <span className="qf-label">{t('task.qf.state')}</span>
        <span className="qf-value">
          {allowsState ? (
            <button
              type="button"
              className="qf-state-trigger"
              onClick={() => setStateOpen((v) => !v)}
            >
              <StateBadge column={stateColumn ?? null} />
              <i className="ri-arrow-down-s-line" aria-hidden="true" />
            </button>
          ) : (
            <StateBadge column={stateColumn ?? null} />
          )}
          {stateOpen && allowsState && (
            <div className="qf-state-popover" style={{ top: '100%', left: 0, marginTop: 4 }}>
              {boardColumns.map((col) => (
                <button
                  key={col.publicId}
                  type="button"
                  className={`qf-state-option${col.publicId === taskForm.boardColumn ? ' is-active' : ''}`}
                  onClick={() => {
                    setTaskForm({ ...taskForm, boardColumn: col.publicId });
                    setStateOpen(false);
                  }}
                >
                  <StateBadge column={col} />
                  <span style={{ fontSize: 12, color: 'var(--task-muted)' }}>{resolveLabel(col)}</span>
                </button>
              ))}
            </div>
          )}
        </span>
      </div>
      <div className="task-quickfact">
        <span className="qf-label">{t('task.qf.start')}</span>
        <span className="qf-value">
          <i className="ri-calendar-event-line qf-icon" aria-hidden="true" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {startDate}
          </span>
          {taskForm.type !== 'milestone' && (
            <span className="qf-sub">· {durationText}</span>
          )}
        </span>
      </div>
      <div className="task-quickfact" style={{ display: editingTask?.type === 'milestone' ? 'none' : undefined }}>
        <span className="qf-label">{t('task.qf.progress')}</span>
        <span className="qf-value" style={{ gap: 12 }}>
          <span className="qf-progress-bar">
            <span className="qf-progress-fill" style={{ width: `${progressNum}%` }} />
          </span>
          <span className="qf-progress-num">{progressNum}%</span>
        </span>
      </div>
      <div className="task-quickfact">
        <span className="qf-label">{t('task.qf.priority')}</span>
        <span className="qf-value">
          {priorityInfo ? (
            <span className={priorityInfo.pillClass}>
              <i className="ri-flag-fill" aria-hidden="true" />
              {priorityLabel}
            </span>
          ) : (
            <span className="pill pill-grey">{priorityLabel}</span>
          )}
        </span>
      </div>
    </div>
  );
}

/** Converte string wire DHTMLX (`DD-MM-YYYY HH:mm`) em `Date` para reformatar. */
function parseGanttWire(str: string): Date {
  if (!str) return new Date();
  const isoLike = /^\d{4}-\d{2}-\d{2}/.test(str);
  if (isoLike) return new Date(str);
  const m = str.match(/^(\d{2})-(\d{2})-(\d{4})(?:\s(\d{2}):(\d{2}))?/);
  if (!m) return new Date(str);
  const [, dd, mm, yyyy, hh = '00', mi = '00'] = m;
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00Z`);
}
