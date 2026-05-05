import { type ReactNode, useEffect } from 'react';
import type { AwesomeKanbanLocale, EditorConfig } from '../../types';

export interface EditorSidebarProps {
  title: string;
  config?: EditorConfig;
  locale: AwesomeKanbanLocale;
  onClose: () => void;
  onSave: () => void;
  children: ReactNode;
}

export function EditorSidebar({
  title,
  config,
  locale,
  onClose,
  onSave,
  children,
}: EditorSidebarProps) {
  const closeOnEsc = config?.closeOnEsc !== false;
  const showClose = config?.showCloseButton !== false;

  useEffect(() => {
    if (!closeOnEsc) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeOnEsc, onClose]);

  return (
    <div
      className="ak-editor ak-editor--sidebar"
      style={{ width: config?.width ?? 480 }}
      role="complementary"
      aria-label={title}
    >
      <div className="ak-editor__header">
        <span className="ak-editor__title">{title}</span>
        {showClose && (
          <button
            type="button"
            className="ak-editor__close"
            onClick={onClose}
            aria-label={locale.editor.close}
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="ak-editor__body">{children}</div>
      <div className="ak-editor__footer">
        <button type="button" className="ak-toolbar__btn" onClick={onClose}>
          {locale.editor.cancel}
        </button>
        <button
          type="button"
          className="ak-toolbar__btn ak-toolbar__btn--soft"
          onClick={onSave}
        >
          {locale.editor.save}
        </button>
      </div>
    </div>
  );
}
