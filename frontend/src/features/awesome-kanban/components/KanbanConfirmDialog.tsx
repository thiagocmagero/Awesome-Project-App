import { useEffect } from 'react';

export interface KanbanConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  okLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function KanbanConfirmDialog({
  open,
  title,
  message,
  okLabel = 'OK',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: KanbanConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  return (
    <div
      className="ak-editor-backdrop ak-editor-backdrop--modal"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="ak-confirm"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
      >
        {title && <div className="ak-confirm__title">{title}</div>}
        <div className="ak-confirm__message">{message}</div>
        <div className="ak-confirm__actions">
          <button type="button" className="ak-toolbar__btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              'ak-toolbar__btn' +
              (destructive ? ' ak-menu__item--destructive' : '')
            }
            onClick={onConfirm}
            autoFocus
          >
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
