import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useClosingState } from '../lib/useClosingState';
import '../styles/ws-settings.css';

interface Props {
  title: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

/** Port literal de `NewTemplate/views-ws-settings.jsx:ConfirmDialog`.
 *  Modal de confirmação reutilizável — usado para eliminar Tipos, Calendários, etc. */
export function ConfirmDialog({
  title,
  message,
  danger = false,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
}: Props) {
  const { t: tc } = useTranslation('common');
  const [busy, setBusy] = useState(false);
  // Two-phase close — bate com `animation-duration` de .ws-modal.is-closing (220ms).
  const { closing, requestClose } = useClosingState(onCancel, 220);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) requestClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [requestClose, busy]);

  async function handleConfirm() {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  const iconStyle = danger
    ? { background: 'oklch(0.94 0.06 25)', color: 'oklch(0.50 0.20 25)' }
    : undefined;
  const confirmBtnStyle = danger
    ? { background: 'oklch(0.55 0.20 25)' }
    : undefined;

  /* Renderizado via `createPortal(..., document.body)` para escapar
     QUALQUER stacking context criado por ancestrais (ex.: `.tm-modal`
     do TaskModal usa `transform: translateX(-50%)` que cria stacking
     context isolado — sem portal, o ConfirmDialog ficava por trás do
     modal pai mesmo com z-index alto). Pattern consistente com `TMSelect`. */
  return createPortal(
    <div className={`ws-modal-backdrop${closing ? ' is-closing' : ''}`} onClick={requestClose} role="presentation">
      <div className={`ws-modal${closing ? ' is-closing' : ''}`} onClick={(e) => e.stopPropagation()} style={{ width: 420 }} role="alertdialog" aria-label={title}>
        <div className="mh">
          <div className="ic" style={iconStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div className="tt">{title}</div>
          <button type="button" className="close" onClick={requestClose} aria-label={tc('actions.close')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
        <div className="mb">
          <div style={{ fontSize: 13.5, color: 'var(--ink2)', lineHeight: 1.5 }}>{message}</div>
        </div>
        <div className="mf">
          <button type="button" className="ws-cancel" onClick={requestClose} disabled={busy}>
            {cancelLabel ?? tc('actions.cancel')}
          </button>
          <button
            type="button"
            className="ws-btn-primary"
            onClick={() => void handleConfirm()}
            disabled={busy}
            style={confirmBtnStyle}
          >
            {busy ? tc('messages.processing') : (confirmLabel ?? (danger ? tc('actions.delete') : tc('actions.confirm')))}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
