import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITimesheetDay } from '../types';
import { dayOfWeekLabelPT, parseISODate } from '../dateUtils';

interface Props {
  open:    boolean;
  /** Dias da semana (todos) — só serão seleccionáveis os com status SUBMITTED. */
  days:    ITimesheetDay[];
  /** Cabeçalho contextual (ex: "Don Draper · Semana 14–20 abr"). */
  subject: string;
  onClose: () => void;
  onSubmit: (workDate: string, reason: string) => Promise<boolean>;
}

/**
 * Modal "Rejeitar dia" (Abril 2026 — refinamento do utilizador).
 *
 * Pergunta ao gestor QUAL dia rejeitar (entre os SUBMITTED) + motivo. Cada
 * rejeição é uma transação separada; o gestor pode chamar este modal várias
 * vezes para rejeitar dias diferentes com motivos diferentes (REQ refinado).
 */
export function TimesheetRejectDayModal({ open, days, subject, onClose, onSubmit }: Props) {
  const { t }     = useTranslation('timesheet');
  const { t: tc } = useTranslation('common');

  const submittedDays = useMemo(() => days.filter((d) => d.status === 'SUBMITTED'), [days]);

  const [workDate, setWorkDate] = useState('');
  const [reason, setReason]     = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    setWorkDate(submittedDays[0]?.workDate ?? '');
    setReason('');
    setError(null);
    setSaving(false);
    return () => { document.body.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!workDate) { setError(t('reject_day.error_no_day')); return; }
    if (reason.trim().length === 0) { setError(t('reject.reason_required')); return; }
    setError(null);
    setSaving(true);
    onSubmit(workDate, reason.trim())
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
                <h5 className="modal-title">{t('reject_day.title')}</h5>
                <button type="button" className="btn-close" onClick={onClose} aria-label={tc('actions.close')} />
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-3">{subject}</p>

                {submittedDays.length === 0 ? (
                  <div className="alert alert-info py-2 small mb-0">
                    {t('reject_day.no_submitted_days')}
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <label className="form-label">
                        {t('reject_day.which_day')} <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={workDate}
                        onChange={(e) => setWorkDate(e.target.value)}
                      >
                        {submittedDays.map((d) => {
                          const date = parseISODate(d.workDate);
                          return (
                            <option key={d.publicId} value={d.workDate}>
                              {dayOfWeekLabelPT(d.workDate)} —{' '}
                              {String(date.getUTCDate()).padStart(2, '0')}/
                              {String(date.getUTCMonth() + 1).padStart(2, '0')}/
                              {date.getUTCFullYear()}
                            </option>
                          );
                        })}
                      </select>
                      <small className="text-muted">{t('reject_day.repeat_hint')}</small>
                    </div>

                    <label className="form-label">
                      {t('reject.reason_label')} <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t('reject.reason_placeholder')}
                      autoFocus
                    />
                  </>
                )}

                {error && <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                  {tc('actions.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={saving || submittedDays.length === 0}
                >
                  {saving ? <i className="ri-loader-4-line" /> : t('reject.btn_confirm')}
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
