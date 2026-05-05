// Modal confirmar eliminação de Estado — com selector de destino para as
// tarefas que estavam nesse estado. Substitui `BoardDeleteColumnModal`.
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITaskState } from '../states-types';

interface Props {
  state: ITaskState;
  taskCount: number;
  otherStates: ITaskState[];
  onClose: () => void;
  onDelete: (statePublicId: string, targetStatePublicId?: string) => Promise<{ ok: boolean; error?: string }>;
}

export function DeleteStateModal({ state, taskCount, otherStates, onClose, onDelete }: Props) {
  const { t }  = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  const [targetPublicId, setTargetPublicId] = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const hasTasksLabel = t('states.modal.delete_warning', { count: taskCount });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (state.isSystem) {
    return (
      <>
        <div className="modal fade show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <i className="ri-error-warning-line fs-1 text-danger d-block mb-2" />
                <p className="mb-0 fw-semibold">{t('states.error.system')}</p>
              </div>
              <div className="modal-footer justify-content-center">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  {tc('actions.close')}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-backdrop fade show" onClick={onClose} />
      </>
    );
  }

  async function handleDelete() {
    setError('');
    if (taskCount > 0 && !targetPublicId) {
      setError(t('states.error.need_target'));
      return;
    }
    setLoading(true);
    const result = await onDelete(state.publicId, targetPublicId || undefined);
    setLoading(false);
    if (result.ok) onClose();
    else setError(result.error ?? tc('messages.network_error'));
  }

  const colDisplayLabel = state.label ?? (state.labelKey ? t(state.labelKey as Parameters<typeof t>[0]) : state.publicId);

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header border-bottom-0 pb-0">
              <h5 className="modal-title text-danger">
                <i className="ri-delete-bin-line me-2" />{t('states.modal.delete')}
              </h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>

            <div className="modal-body">
              {error && <div className="alert alert-danger py-2 fs-13 mb-3">{error}</div>}

              <p className="mb-3">{t('states.modal.delete_confirm', { name: colDisplayLabel })}</p>

              {taskCount > 0 ? (
                <>
                  <div className="alert alert-warning d-flex align-items-start gap-2 py-2 mb-3">
                    <i className="ri-error-warning-line fs-16 flex-shrink-0 mt-1" />
                    <span className="fs-13">{hasTasksLabel}</span>
                  </div>

                  <div className="mb-2">
                    <label className="form-label fw-semibold">
                      {t('states.form.target_state')} <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={targetPublicId}
                      onChange={(e) => setTargetPublicId(e.target.value)}
                    >
                      <option value="">{tc('form.none')}</option>
                      {otherStates.map((col) => {
                        const lbl = col.label ?? (col.labelKey ? t(col.labelKey as Parameters<typeof t>[0]) : col.publicId);
                        return (
                          <option key={col.publicId} value={col.publicId}>
                            {lbl}{col.isSystem ? ' ★' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </>
              ) : (
                <p className="text-muted fs-13">{t('states.modal.delete_no_tasks')}</p>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-light" onClick={onClose} disabled={loading}>
                {tc('actions.cancel')}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={loading}>
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2" />{tc('messages.deleting')}</>
                  : <><i className="ri-delete-bin-line me-1" />{tc('actions.delete')}</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}
