import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { ITaskState, IFieldRule, TaskFieldKey } from '../states-types';

const CONFIGURABLE_FIELDS: TaskFieldKey[] = [
  'description',
  'schedule',
  'duration',
  'restriction',
  'type',
  'priority',
  'assignees',
];

interface Props {
  state: ITaskState;
  onClose: () => void;
  onSave: (publicId: string, rules: IFieldRule[]) => Promise<boolean>;
}

export function StateRulesModal({ state, onClose, onSave }: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  const [required, setRequired] = useState<Set<TaskFieldKey>>(
    () => new Set(state.rules.filter((r) => r.isRequired).map((r) => r.field)),
  );
  const [loading, setLoading] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    function guardFocus(e: FocusEvent) {
      if (modalRef.current?.contains(e.target as Node)) {
        e.stopImmediatePropagation();
      }
    }
    document.addEventListener('focusin', guardFocus, true);
    return () => document.removeEventListener('focusin', guardFocus, true);
  }, []);

  function toggle(field: TaskFieldKey) {
    setRequired((prev) => {
      const next = new Set(prev);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  }

  async function handleSave() {
    setLoading(true);
    const rules: IFieldRule[] = CONFIGURABLE_FIELDS.map((field) => ({
      field,
      isRequired: required.has(field),
    }));
    const ok = await onSave(state.publicId, rules);
    setLoading(false);
    if (ok) onClose();
  }

  const stateLabel = state.label ?? (state.labelKey ? t(state.labelKey as Parameters<typeof t>[0]) : state.publicId);
  const activeCount = required.size;

  return createPortal(
    <>
      <div
        ref={modalRef}
        className="modal fade show d-block"
        tabIndex={-1}
        style={{ zIndex: 10001 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="ri-list-check me-2" />
                {t('states.rules.modal_title')}
                <span className="text-muted fw-normal ms-2 fs-13">— {stateLabel}</span>
                {activeCount > 0 && (
                  <span className="badge bg-warning-transparent text-warning ms-2 fs-11">
                    {activeCount}
                  </span>
                )}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>

            <div className="modal-body">
              <p className="text-muted fs-13 mb-3">
                {t('states.rules.modal_hint')}
              </p>

              <ul className="list-group list-group-flush">
                {/* Linha estática: title (sempre obrigatório, não configurável) */}
                <li className="list-group-item d-flex align-items-center gap-3 px-0 py-2">
                  <div className="form-check mb-0">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked
                      disabled
                      id="rule-title"
                    />
                    <label className="form-check-label fw-semibold text-muted" htmlFor="rule-title">
                      {t('states.rules.field.title')}
                    </label>
                  </div>
                  <span className="badge bg-secondary-transparent text-secondary ms-auto fs-11">
                    {t('states.rules.always_required')}
                  </span>
                </li>

                {/* 7 campos configuráveis */}
                {CONFIGURABLE_FIELDS.map((field) => (
                  <li key={field} className="list-group-item d-flex align-items-center px-0 py-2">
                    <div className="form-check mb-0">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id={`rule-${field}`}
                        checked={required.has(field)}
                        onChange={() => toggle(field)}
                      />
                      <label className="form-check-label fw-semibold" htmlFor={`rule-${field}`}>
                        {t(`states.rules.field.${field}` as Parameters<typeof t>[0])}
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {tc('actions.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2" />{tc('messages.saving')}</>
                  : tc('actions.save')}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex: 10000 }} />
    </>,
    document.body,
  );
}
