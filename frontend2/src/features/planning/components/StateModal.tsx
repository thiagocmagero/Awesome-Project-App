// Modal Criar/Editar Estado — redesenho per handoff §7.
// Classes `.ms-modal-*`. Color picker layout = .swatch (40×38, nativo
// invisível por cima) + .hex (input text mono). WIP com help text. Rodapé
// Cancelar + Salvar (primary com floppy SVG).

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITaskState } from '../states-types';

interface Props {
  mode: 'create' | 'edit';
  state?: ITaskState | null;
  onClose: () => void;
  onSubmit: (data: { label: string; color: string; wipLimit: number | null }) => Promise<boolean>;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function IconLayers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function IconFloppy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

export function StateModal({ mode, state, onClose, onSubmit }: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  const [label, setLabel] = useState(state?.label ?? '');
  const [color, setColor] = useState(state?.color ?? '#6c5ce7');
  const [wipText, setWipText] = useState(state?.wipLimit != null ? String(state.wipLimit) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSystem = state?.isSystem ?? false;
  const valid = isSystem || label.trim().length > 0;

  // Bloquear scroll do body + atalhos teclado (Escape fecha, Enter submete).
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        if (valid && !saving) {
          e.preventDefault();
          void handleSubmit();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, saving, label, color, wipText]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmedLabel = label.trim();
    if (!valid) {
      setError(t('states.error.label_required'));
      return;
    }
    if (color && !HEX_RE.test(color)) {
      setError('Cor inválida — usa formato #RRGGBB.');
      return;
    }
    const wipNum = wipText.trim() === '' ? null : Number(wipText);
    if (wipNum !== null && (Number.isNaN(wipNum) || wipNum < 1)) {
      setError('WIP limit deve ser ≥ 1 ou vazio.');
      return;
    }
    setSaving(true);
    setError(null);
    const ok = await onSubmit({
      label: isSystem && !trimmedLabel ? '' : trimmedLabel,
      color,
      wipLimit: wipNum,
    });
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <div className="ms-modal-backdrop" onClick={onClose}>
      <div className="ms-modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <header className="ms-modal-head">
            <h4 className="title">
              <IconLayers />
              {mode === 'create' ? t('states.modal.create_title') : t('states.modal.edit_title')}
            </h4>
            <button type="button" className="close" onClick={onClose} aria-label="Fechar">
              <IconClose />
            </button>
          </header>

          <div className="ms-modal-body">
            <div className="ms-field">
              <label htmlFor="ms-label">
                {t('form.task_name', { defaultValue: 'Nome' })}
                {!isSystem && <span className="req">{t('states.modal.name_required')}</span>}
              </label>
              <input
                id="ms-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={isSystem ? '—' : t('states.modal.name_placeholder')}
                maxLength={100}
                autoFocus
              />
            </div>

            <div className="ms-field">
              <label htmlFor="ms-color">{t('states.modal.color_label')}</label>
              <div className="ms-color-row">
                <label className="swatch" htmlFor="ms-color" style={{ background: color }}>
                  <input
                    id="ms-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </label>
                <div className="hex">
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value.toLowerCase())}
                    placeholder="#rrggbb"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            <div className="ms-field">
              <label htmlFor="ms-wip">{t('states.modal.wip_label')}</label>
              <input
                id="ms-wip"
                type="number"
                min={1}
                value={wipText}
                onChange={(e) => setWipText(e.target.value)}
                placeholder={t('states.modal.wip_placeholder')}
              />
              <div className="help">{t('states.modal.wip_help')}</div>
            </div>

            {error && <div className="ms-error">{error}</div>}
          </div>

          <footer className="ms-modal-foot">
            <button type="button" onClick={onClose} disabled={saving}>
              {tc('actions.cancel')}
            </button>
            <button type="submit" className="primary" disabled={saving || !valid}>
              <IconFloppy />
              {saving ? tc('actions.saving') : tc('actions.save')}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
