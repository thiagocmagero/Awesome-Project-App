import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarDate, CalendarStatus } from '../hooks/useWorkspaceCalendars';
import { useClosingState } from '../lib/useClosingState';
import { DatePicker } from '../lib/DatePicker';
import '../styles/ws-settings.css';

interface Props {
  initial: CalendarDate | null;
  onClose: () => void;
  onSave: (payload: {
    publicId?: string;
    name: string;
    /** `YYYY-MM-DD` UTC — backend normaliza para UTC midnight. */
    date: string;
    status?: CalendarStatus;
  }) => Promise<void>;
}

/**
 * Port literal do `DateModal` de `NewTemplate/views-ws-settings.jsx`.
 *
 * Datas em `HolidayDate` são DATA PURA (`timestamp(3)` UTC midnight) — usar
 * `<input type="date">` nativo. O `value` é sempre `YYYY-MM-DD` interpretado
 * em UTC pelo backend (sem conversão de tz), respeitando a regra
 * `@docs/claude/timezone.md`.
 */
export function CalendarDateModal({ initial, onClose, onSave }: Props) {
  const { t } = useTranslation('holidays');
  const { t: tc } = useTranslation('common');

  const [name, setName] = useState(initial?.name ?? '');
  const [date, setDate] = useState<string>(() => {
    if (!initial?.date) return '';
    // ISO completo (ex.: '2026-04-25T00:00:00.000Z') → 'YYYY-MM-DD'
    const d = new Date(initial.date);
    if (Number.isNaN(d.getTime())) return '';
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [active, setActive] = useState<boolean>((initial?.status ?? 'ACTIVE') === 'ACTIVE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Two-phase close — bate com `animation-duration` de .ws-modal.is-closing (220ms).
  const { closing, requestClose } = useClosingState(onClose, 220);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) requestClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [requestClose, submitting]);

  const isEdit = !!initial;
  const canSave = name.trim().length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(date) && !submitting;

  async function submit() {
    if (!canSave) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSave({
        publicId: initial?.publicId,
        name: name.trim(),
        date,
        // Em create-only: backend default já é ACTIVE; mas enviar é inócuo
        // (não inválido). Em edit, envia explicitamente para permitir toggle.
        status: active ? 'ACTIVE' : 'INACTIVE',
      });
    } catch (err) {
      setError((err as Error).message || tc('errors.generic'));
      setSubmitting(false);
    }
  }

  return (
    <div className={`ws-modal-backdrop${closing ? ' is-closing' : ''}`} onClick={requestClose} role="presentation">
      <div
        className={`ws-modal${closing ? ' is-closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={isEdit ? t('modal.edit_date.title') : t('modal.add_date.title')}
      >
        <div className="mh">
          <div className="ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="tt">
            {isEdit ? t('modal.edit_date.title') : t('modal.add_date.title')}
          </div>
          <button type="button" className="close" onClick={requestClose} aria-label={tc('actions.close')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mb">
          <div className="ws-field">
            <label className="lab">
              {t('form.date_name')} <span className="req">*</span>
            </label>
            <input
              type="text"
              className="ws-input"
              placeholder={t('form.date_name_placeholder')}
              value={name}
              disabled={submitting}
              autoFocus={!isEdit}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
            />
          </div>

          <div className="ws-field">
            <label className="lab">
              {t('form.date')} <span className="req">*</span>
            </label>
            <DatePicker
              className="ws-input"
              value={date}
              onChange={(s) => setDate(s)}
              format="Y-m-d"
              enableTime={false}
              placeholder="YYYY-MM-DD"
              disabled={submitting}
            />
          </div>

          {isEdit && (
            <div className="ws-field">
              <label
                className={'ws-switch' + (active ? ' on' : '')}
                onClick={() => !submitting && setActive((v) => !v)}
              >
                <span className="toggle" />
                <span>{active ? tc('status.active') : tc('status.inactive')}</span>
              </label>
            </div>
          )}

          {error && (
            <div
              className="form-error"
              role="alert"
              style={{
                padding: '8px 11px',
                background: 'oklch(0.96 0.04 25)',
                color: 'oklch(0.50 0.18 25)',
                border: '1px solid oklch(0.85 0.10 25)',
                borderRadius: 8,
                fontSize: 12.5,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div className="mf">
          <button type="button" className="ws-cancel" onClick={requestClose} disabled={submitting}>
            {tc('actions.cancel')}
          </button>
          <button type="button" className="ws-btn-primary" onClick={() => void submit()} disabled={!canSave}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            {submitting ? tc('messages.processing') : (isEdit ? tc('actions.save') : tc('actions.create'))}
          </button>
        </div>
      </div>
    </div>
  );
}
