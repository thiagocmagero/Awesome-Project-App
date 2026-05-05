// Modal criar/editar Estado (coluna do projecto). Substitui o antigo
// `BoardColumnModal`. Sistema (isSystem=true): label opcional (vazio → repõe
// i18n via labelKey); custom: label obrigatório.
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { ITaskState } from '../states-types';

interface Props {
  editingState: ITaskState | null;   // null = create mode
  onClose: () => void;
  onCreate: (label: string, color?: string, wipLimit?: number) => Promise<boolean>;
  onUpdate: (statePublicId: string, patch: { label?: string | null; color?: string | null; wipLimit?: number | null }) => Promise<boolean>;
}

export function StateModal({ editingState, onClose, onCreate, onUpdate }: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  const isSystem  = editingState?.isSystem ?? false;
  const isEditing = editingState !== null;

  const systemPlaceholder = editingState?.labelKey ? t(editingState.labelKey as Parameters<typeof t>[0]) : '';

  const [label,    setLabel]    = useState(editingState?.label ?? '');
  const [color,    setColor]    = useState(editingState?.color ?? '');
  const [wipLimit, setWipLimit] = useState<string>(
    editingState?.wipLimit ? String(editingState.wipLimit) : '',
  );
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Bootstrap offcanvas tem um focus trap que rouba o foco de qualquer elemento
  // fora do painel. Intercetamos o focusin na fase de captura (antes do Bootstrap)
  // para proteger os inputs desta modal.
  useEffect(() => {
    function guardFocus(e: FocusEvent) {
      if (modalRef.current?.contains(e.target as Node)) {
        e.stopImmediatePropagation();
      }
    }
    document.addEventListener('focusin', guardFocus, true);
    return () => document.removeEventListener('focusin', guardFocus, true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isSystem && !label.trim()) {
      setError(t('states.error.label_required'));
      return;
    }

    const wipNum = wipLimit.trim() ? parseInt(wipLimit, 10) : undefined;
    if (wipLimit.trim() && (isNaN(wipNum!) || wipNum! < 1)) {
      setError(t('states.error.wip_invalid'));
      return;
    }

    setLoading(true);
    let ok: boolean;

    if (isEditing) {
      const newLabel = isSystem
        ? (label.trim() || null)
        : label.trim();
      ok = await onUpdate(editingState.publicId, {
        label:    newLabel,
        color:    color.trim() || null,
        wipLimit: wipNum ?? null,
      });
    } else {
      ok = await onCreate(label.trim(), color.trim() || undefined, wipNum);
    }

    setLoading(false);
    if (ok) onClose();
    else setError(tc('messages.network_error'));
  }

  return createPortal(
    <>
      {/* Portal para document.body — garante que fica fora de qualquer
          stacking context pai. z-index acima do offcanvas Bootstrap (1045),
          do seu backdrop (1040) e do fake fullscreen (9999). */}
      <div ref={modalRef} className="modal fade show d-block" tabIndex={-1} style={{ zIndex: 10001 }}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="ri-stack-line me-2" />
                {isEditing ? t('states.modal.edit') : t('states.modal.create')}
                {isSystem && (
                  <span className="badge bg-secondary-transparent text-secondary ms-2 fs-11">
                    {t('states.system_badge')}
                  </span>
                )}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="alert alert-danger py-2 fs-13">{error}</div>}

                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    {t('states.form.label')}
                    {!isSystem && <span className="text-danger ms-1">*</span>}
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={isSystem ? systemPlaceholder : t('states.form.label_ph')}
                    maxLength={100}
                  />
                  {isSystem && (
                    <div className="form-text text-muted fs-12">
                      {t('states.form.system_label_hint', { default: systemPlaceholder })}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">{t('states.form.color')}</label>
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="color"
                      className="form-control form-control-color"
                      value={color || '#6c5ce7'}
                      onChange={(e) => setColor(e.target.value)}
                      style={{ width: 42, height: 36, padding: 3, cursor: 'pointer' }}
                    />
                    <input
                      type="text"
                      className="form-control form-control-sm font-monospace"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      placeholder="#6c5ce7"
                      maxLength={7}
                      style={{ maxWidth: 110 }}
                    />
                    {color && (
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() => setColor('')}
                        title={tc('actions.clear')}
                      >
                        <i className="ti ti-x fs-13" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-1">
                  <label className="form-label fw-semibold">{t('states.form.wip_limit')}</label>
                  <input
                    type="number"
                    className="form-control"
                    value={wipLimit}
                    onChange={(e) => setWipLimit(e.target.value)}
                    placeholder={t('states.form.wip_limit_ph')}
                    min={1}
                    step={1}
                  />
                  <div className="form-text text-muted fs-12">
                    {t('states.form.wip_limit_hint')}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={onClose}>
                  {tc('actions.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading
                    ? <><span className="spinner-border spinner-border-sm me-2" />{tc('messages.saving')}</>
                    : <><i className="ri-save-line me-1" />{tc('actions.save')}</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 10000 }} onClick={onClose} />
    </>,
    document.body,
  );
}
