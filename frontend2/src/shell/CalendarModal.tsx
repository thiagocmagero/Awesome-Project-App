import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalendarStatus, WorkspaceCalendar } from '../hooks/useWorkspaceCalendars';
import '../styles/ws-settings.css';

interface Props {
  initial: WorkspaceCalendar | null;
  onClose: () => void;
  onSave: (payload: {
    publicId?: string;
    name: string;
    description: string | null;
    status: CalendarStatus;
  }) => Promise<void>;
}

/**
 * Port literal do `ListModal` de `NewTemplate/views-ws-settings.jsx`.
 * Cria ou edita um calendário (Holiday). Inclui switch ACTIVE/INACTIVE.
 */
export function CalendarModal({ initial, onClose, onSave }: Props) {
  const { t } = useTranslation('holidays');
  const { t: tc } = useTranslation('common');

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [active, setActive] = useState<boolean>((initial?.status ?? 'ACTIVE') === 'ACTIVE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const isEdit = !!initial;
  const canSave = name.trim().length >= 2 && !submitting;

  async function submit() {
    if (!canSave) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSave({
        publicId: initial?.publicId,
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        status: active ? 'ACTIVE' : 'INACTIVE',
      });
    } catch (err) {
      setError((err as Error).message || tc('errors.generic'));
      setSubmitting(false);
    }
  }

  return (
    <div className="ws-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ws-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={isEdit ? t('modal.edit_title') : t('modal.create_title')}
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
          <div className="tt">{isEdit ? t('modal.edit_title') : t('modal.create_title')}</div>
          <button type="button" className="close" onClick={onClose} aria-label={tc('actions.close')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <div className="mb">
          <div className="ws-field">
            <label className="lab">
              {t('form.name')} <span className="req">*</span>
            </label>
            <input
              type="text"
              className="ws-input"
              placeholder={t('form.name_placeholder')}
              value={name}
              disabled={submitting}
              autoFocus
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) void submit(); }}
            />
          </div>

          <div className="ws-field">
            <label className="lab">{t('form.description')}</label>
            <textarea
              className="ws-textarea"
              placeholder={t('form.description_placeholder')}
              value={description}
              disabled={submitting}
              maxLength={500}
              rows={3}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="ws-field">
            <label
              className={'ws-switch' + (active ? ' on' : '')}
              onClick={() => !submitting && setActive((v) => !v)}
            >
              <span className="toggle" />
              <span>{active ? tc('status.active') : tc('status.inactive')}</span>
            </label>
          </div>

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
          <button type="button" className="ws-cancel" onClick={onClose} disabled={submitting}>
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
