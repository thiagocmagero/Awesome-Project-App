import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CopyWeekMode } from '../types';
import { addDaysISO, formatWeekRange } from '../dateUtils';
import { confirmAction } from '../../../lib/confirm';

interface Props {
  open:      boolean;
  weekStart: string;
  onClose:   () => void;
  onSubmit:  (payload: { fromWeekStart: string; toWeekStart: string; mode: CopyWeekMode }) => Promise<boolean>;
}

/**
 * Modal "Copiar semana" (REQ-C01–C10). Permite escolher origem, destino e modo.
 * Por defeito sugere copiar semana anterior para a semana actual.
 */
export function TimesheetCopyWeekModal({ open, weekStart, onClose, onSubmit }: Props) {
  const { t }     = useTranslation('timesheet');
  const { t: tc } = useTranslation('common');

  // Lista de semanas — 12 antes + actual + 4 depois
  const [fromWeekStart, setFromWeekStart] = useState<string>(addDaysISO(weekStart, -7));
  const [toWeekStart, setToWeekStart]     = useState<string>(weekStart);
  const [mode, setMode]                   = useState<CopyWeekMode>('TASKS_ONLY');
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    setFromWeekStart(addDaysISO(weekStart, -7));
    setToWeekStart(weekStart);
    setMode('TASKS_ONLY');
    setSaving(false);
    setError(null);
    return () => { document.body.style.overflow = ''; };
  }, [open, weekStart]);

  if (!open) return null;

  const weekOptions: string[] = [];
  for (let i = -12; i <= 4; i++) weekOptions.push(addDaysISO(weekStart, i * 7));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fromWeekStart === toWeekStart) { setError(t('copy_week.error_same')); return; }

    // Confirmação antes de copiar (REQ Abril 2026 — toda a acção tem de confirmar)
    const ok = await confirmAction({
      title:       t('confirm.copy_week.title'),
      text:        t('confirm.copy_week.text', {
        from: formatWeekRange(fromWeekStart),
        to:   formatWeekRange(toWeekStart),
      }),
      confirmText: t('confirm.copy_week.confirm'),
      cancelText:  tc('actions.cancel'),
      variant:     'primary',
    });
    if (!ok) return;

    setSaving(true);
    onSubmit({ fromWeekStart, toWeekStart, mode })
      .then((res) => {
        if (res) onClose();
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
                <h5 className="modal-title">{t('copy_week.title')}</h5>
                <button type="button" className="btn-close" onClick={onClose} aria-label={tc('actions.close')} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">{t('copy_week.from')}</label>
                  <select className="form-select" value={fromWeekStart} onChange={(e) => setFromWeekStart(e.target.value)}>
                    {weekOptions.map((w) => (
                      <option key={w} value={w}>{formatWeekRange(w)}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('copy_week.to')}</label>
                  <select className="form-select" value={toWeekStart} onChange={(e) => setToWeekStart(e.target.value)}>
                    {weekOptions.map((w) => (
                      <option key={w} value={w}>
                        {formatWeekRange(w)}{w === weekStart ? ` (${t('copy_week.current_week')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t('copy_week.what_to_copy')}</label>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="copyMode"
                      id="copyMode-tasks-only"
                      checked={mode === 'TASKS_ONLY'}
                      onChange={() => setMode('TASKS_ONLY')}
                    />
                    <label className="form-check-label" htmlFor="copyMode-tasks-only">{t('copy_week.mode_tasks_only')}</label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="copyMode"
                      id="copyMode-tasks-hours"
                      checked={mode === 'TASKS_HOURS'}
                      onChange={() => setMode('TASKS_HOURS')}
                    />
                    <label className="form-check-label" htmlFor="copyMode-tasks-hours">{t('copy_week.mode_tasks_hours')}</label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="copyMode"
                      id="copyMode-full"
                      checked={mode === 'TASKS_HOURS_COMMENTS'}
                      onChange={() => setMode('TASKS_HOURS_COMMENTS')}
                    />
                    <label className="form-check-label" htmlFor="copyMode-full">{t('copy_week.mode_full')}</label>
                  </div>
                </div>
                <div className="ts-copy-warning">{t('copy_week.warning')}</div>
                {error && <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                  {tc('actions.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <i className="ri-loader-4-line" /> : t('copy_week.btn_copy')}
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
