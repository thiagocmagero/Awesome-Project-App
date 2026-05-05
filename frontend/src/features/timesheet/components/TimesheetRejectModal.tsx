import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  open:    boolean;
  /** "day" ou "week" — só muda o título e a mensagem */
  scope:   'day' | 'week';
  /** Texto auxiliar (ex: "Quarta-feira 16/04 · Don Draper · Proj. Alpha") */
  subject: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
}

/**
 * Modal de rejeição reutilizado para dia (vista projecto) e semana (área global).
 * Motivo obrigatório (REQ-M06).
 */
export function TimesheetRejectModal({ open, scope, subject, onClose, onSubmit }: Props) {
  const { t }  = useTranslation('timesheet');
  const { t: tc } = useTranslation('common');

  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    setReason('');
    setSaving(false);
    setError(null);
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length === 0) { setError(t('reject.reason_required')); return; }
    setError(null);
    setSaving(true);
    onSubmit(reason.trim())
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
                <h5 className="modal-title">
                  {scope === 'day' ? t('reject_day.title') : t('reject_week.title')}
                </h5>
                <button type="button" className="btn-close" onClick={onClose} aria-label={tc('actions.close')} />
              </div>
              <div className="modal-body">
                <p className="text-muted small mb-2">{subject}</p>
                <label className="form-label">{t('reject.reason_label')} <span className="text-danger">*</span></label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('reject.reason_placeholder')}
                  autoFocus
                />
                {error && <div className="alert alert-danger py-2 small mt-3 mb-0">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
                  {tc('actions.cancel')}
                </button>
                <button type="submit" className="btn btn-danger" disabled={saving}>
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
