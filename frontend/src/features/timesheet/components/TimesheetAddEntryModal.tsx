import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITimesheetTaskOption } from '../types';
import { daysOfWeek, dayOfWeekLabelPT } from '../dateUtils';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { formatDate } from '../../../lib/dateFormatting';

declare const Choices: new (el: HTMLElement, opts?: object) => {
  destroy(): void;
  setChoiceByValue(v: string): void;
};

interface Props {
  open:        boolean;
  weekStart:   string;            // 'YYYY-MM-DD'
  tasks:       ITimesheetTaskOption[];
  defaultTaskPublicId?: string;
  defaultWorkDate?: string;
  onClose:     () => void;
  onSubmit:    (payload: { taskPublicId: string; workDate: string; hours: number; comment?: string | null }) => Promise<boolean>;
}

/**
 * Modal "Adicionar lançamento" (REQ-G18).
 * Campos: Task (Choices.js autocomplete), Dia da semana, Horas, Comentário.
 */
export function TimesheetAddEntryModal({ open, weekStart, tasks, defaultTaskPublicId, defaultWorkDate, onClose, onSubmit }: Props) {
  const { t }  = useTranslation('timesheet');
  const { t: tc } = useTranslation('common');
  const dateFormat = useResolvedDateFormat();

  const [taskPublicId, setTaskPublicId] = useState<string>('');
  const [workDate, setWorkDate]         = useState<string>('');
  const [hours, setHours]               = useState<string>('');
  const [comment, setComment]           = useState<string>('');
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);

  const taskSelectRef = useRef<HTMLSelectElement>(null);

  const days = daysOfWeek(weekStart);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    setTaskPublicId(defaultTaskPublicId ?? (tasks[0]?.publicId ?? ''));
    setWorkDate(defaultWorkDate ?? days[0]);
    setHours('');
    setComment('');
    setError(null);
    setSaving(false);
    return () => { document.body.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Choices.js init no select de task
  useEffect(() => {
    if (!open) return;
    if (typeof Choices === 'undefined') return;
    if (!taskSelectRef.current) return;
    const c = new Choices(taskSelectRef.current, {
      searchEnabled: true,
      itemSelectText: '',
      shouldSort: false,
      placeholder: true,
      placeholderValue: t('add_entry.task_placeholder'),
    });
    if (defaultTaskPublicId) c.setChoiceByValue(defaultTaskPublicId);
    return () => c.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!taskPublicId) { setError(t('add_entry.error_task_required')); return; }
    if (!workDate)     { setError(t('add_entry.error_day_required')); return; }
    const v = parseFloat(hours.replace(',', '.'));
    if (!Number.isFinite(v) || v < 0.1) { setError(t('add_entry.error_hours')); return; }

    setSaving(true);
    onSubmit({ taskPublicId, workDate, hours: v, comment: comment.trim() || null })
      .then((ok) => {
        if (ok) onClose();
        else setSaving(false);
      })
      .catch(() => setSaving(false));
  }

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">{t('add_entry.title')}</h5>
                <button type="button" className="btn-close" onClick={onClose} aria-label={tc('actions.close')} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">{t('add_entry.task')} <span className="text-danger">*</span></label>
                  <select
                    ref={taskSelectRef}
                    className="form-select"
                    value={taskPublicId}
                    onChange={(e) => setTaskPublicId(e.target.value)}
                  >
                    {!defaultTaskPublicId && <option value="">{t('add_entry.task_placeholder')}</option>}
                    {tasks.map((task) => (
                      <option key={task.publicId} value={task.publicId}>{task.text}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('add_entry.day')} <span className="text-danger">*</span></label>
                  <select
                    className="form-select"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                  >
                    {days.map((iso) => (
                      <option key={iso} value={iso}>
                        {dayOfWeekLabelPT(iso)} — {formatDate(iso, dateFormat)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('add_entry.hours')} <span className="text-danger">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    className="form-control"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    placeholder="0.0"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('add_entry.comment')} <span className="text-muted">{t('add_entry.optional')}</span></label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t('add_entry.comment_placeholder')}
                  />
                </div>
                {error && <div className="alert alert-danger py-2 small mb-0">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                  {tc('actions.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <i className="ri-loader-4-line" /> : t('add_entry.btn_add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}
