// Offcanvas de gestão de Estados (colunas) do projecto. Substitui o antigo
// `BoardColumnsManagerPanel` (que tinha tab Colunas + tab Swimlanes). Como o
// tab Board foi removido em Abril 2026, swimlanes deixaram de ter UI dentro do
// Planning — ficam só na BD/backend até o futuro componente Board voltar.
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBootstrapOffcanvas } from '../../../hooks/useBootstrapOffcanvas';
import type { ITaskState } from '../states-types';

interface Props {
  open: boolean;
  states: ITaskState[];
  onClose: () => void;
  canManage: boolean;
  onCreateState: () => void;
  onEditState: (state: ITaskState) => void;
  onDeleteState: (state: ITaskState) => void;
  onReorderStates: (orderedPublicIds: string[]) => Promise<boolean>;
}

export function StatesManagerPanel({
  open, states, onClose, canManage,
  onCreateState, onEditState, onDeleteState, onReorderStates,
}: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  const offcanvasRef = useRef<HTMLDivElement>(null);
  useBootstrapOffcanvas(offcanvasRef, open, onClose);

  const [dragId, setDragId] = useState<string | null>(null);

  const resolveLabel = (col: ITaskState): string =>
    col.label ?? (col.labelKey ? t(col.labelKey as Parameters<typeof t>[0]) : col.publicId);

  function handleDragStart(publicId: string) {
    if (!canManage) return;
    setDragId(publicId);
  }

  async function handleDrop(targetPublicId: string) {
    if (!dragId || dragId === targetPublicId) return;
    const ordered = states.map((c) => c.publicId);
    const fromIdx = ordered.indexOf(dragId);
    const toIdx   = ordered.indexOf(targetPublicId);
    if (fromIdx < 0 || toIdx < 0) return;
    ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, dragId);
    setDragId(null);
    await onReorderStates(ordered);
  }

  return (
    <div
      ref={offcanvasRef}
      id="planning-states-manager"
      className="offcanvas offcanvas-end"
      tabIndex={-1}
    >
      <div className="offcanvas-header">
        <h5 className="offcanvas-title">
          <i className="ri-stack-line me-2" />{t('states.manager.title')}
        </h5>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="offcanvas"
          aria-label={tc('actions.close')}
        />
      </div>

      <div className="offcanvas-body">
        <p className="text-muted fs-13 mb-3">
          <i className="ri-information-line me-1" />
          {t('states.manager.system_hint')}
        </p>

        <ul className="list-group list-group-flush mb-3">
          {states.length === 0 && (
            <li className="list-group-item text-muted text-center py-4">
              {t('states.empty')}
            </li>
          )}
          {states.map((col) => (
            <li
              key={col.publicId}
              className="list-group-item d-flex align-items-center gap-2 py-3"
              draggable={canManage && !col.isSystem}
              onDragStart={() => handleDragStart(col.publicId)}
              onDragOver={(e) => { if (dragId) e.preventDefault(); }}
              onDrop={() => handleDrop(col.publicId)}
              style={{ cursor: canManage && !col.isSystem ? 'grab' : 'default' }}
            >
              {canManage && !col.isSystem && (
                <i className="ri-draggable text-muted" title={tc('actions.edit')} />
              )}
              <span
                className="rounded-circle"
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: col.color ?? '#d0d0d0',
                  border: '1px solid rgba(0,0,0,.1)',
                  flexShrink: 0,
                }}
              />
              <div className="flex-grow-1">
                <div className="fw-medium">{resolveLabel(col)}</div>
                <div className="d-flex gap-2 align-items-center">
                  {col.isSystem && (
                    <span className="badge bg-light text-default fs-11">
                      <i className="ri-star-fill fs-10 me-1 text-warning" />{t('states.system_badge')}
                    </span>
                  )}
                  {col.wipLimit != null && (
                    <span className="badge bg-secondary-transparent text-secondary fs-11">
                      {t('states.manager.wip_prefix')}{col.wipLimit}
                    </span>
                  )}
                </div>
              </div>
              {canManage && (
                <>
                  <button
                    type="button"
                    className="btn btn-sm btn-icon btn-primary-transparent"
                    onClick={() => onEditState(col)}
                    title={tc('actions.edit')}
                  >
                    <i className="ri-pencil-line" />
                  </button>
                  {!col.isSystem && (
                    <button
                      type="button"
                      className="btn btn-sm btn-icon btn-danger-transparent"
                      onClick={() => onDeleteState(col)}
                      title={tc('actions.delete')}
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {canManage && (
          <div className="d-grid">
            <button type="button" className="btn btn-primary" onClick={onCreateState}>
              <i className="ri-add-line me-1" />{t('states.manager.create_btn')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
