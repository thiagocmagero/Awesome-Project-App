import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkspaceUserType } from '../hooks/useWorkspaceUserTypes';
import '../styles/ws-settings.css';

interface Props {
  initial: WorkspaceUserType | null;
  existingCodes: string[];
  onClose: () => void;
  onSave: (input: { code: string; label: string; publicId?: string }) => Promise<void>;
}

/** Port literal de `NewTemplate/views-ws-settings.jsx:TipoModal`.
 *  Cria ou edita um UserType. Em modo edit, o `code` é imutável. */
export function TipoModal({ initial, existingCodes, onClose, onSave }: Props) {
  const { t: tu } = useTranslation('users');
  const { t: tc } = useTranslation('common');

  const [code, setCode] = useState(initial?.code ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const canSave = code.trim().length >= 2 && label.trim().length >= 2 && !submitting;
  const isEdit = !!initial;

  async function submit() {
    if (!canSave) return;
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const l = label.trim();
    if (!isEdit && existingCodes.includes(c)) {
      setError(tu('types.code_already_exists'));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSave({ code: c, label: l, publicId: initial?.publicId });
    } catch (err) {
      setError((err as Error).message || tc('errors.generic'));
      setSubmitting(false);
    }
  }

  return (
    <div className="ws-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ws-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={isEdit ? tu('types.modal_edit') : tu('types.modal_create')}>
        <div className="mh">
          <div className="ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <div className="tt">{isEdit ? tu('types.modal_edit') : tu('types.modal_create')}</div>
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
              {tu('types.form_code')} <span className="req">*</span>
            </label>
            <input
              type="text"
              className="ws-input mono"
              placeholder={tu('types.form_code_placeholder')}
              value={code}
              disabled={isEdit || submitting}
              autoFocus={!isEdit}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
            />
            <div className="hint">
              {isEdit ? tu('types.form_code_hint_edit') : tu('types.form_code_hint_create')}
            </div>
          </div>

          <div className="ws-field">
            <label className="lab">
              {tu('types.form_label')} <span className="req">*</span>
            </label>
            <input
              type="text"
              className="ws-input"
              placeholder={tu('types.form_label_placeholder')}
              value={label}
              disabled={submitting}
              autoFocus={isEdit}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
            />
          </div>

          {error && <div className="form-error" role="alert" style={{ padding: '8px 11px', background: 'oklch(0.96 0.04 25)', color: 'oklch(0.50 0.18 25)', border: '1px solid oklch(0.85 0.10 25)', borderRadius: 8, fontSize: 12.5 }}>{error}</div>}
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
