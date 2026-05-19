// Offcanvas direito "Gerir Estados" — redesenho per handoff §6.
// Classes canónicas .ms-* + banner info + layers icon header + actions com
// pencil (brand-soft) e hamburguer (reorder via @hello-pangea/dnd).

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';

import '../../../styles/manage-states.css';
import { useToast } from '../../../contexts/ToastContext';
import { useClosingState } from '../../../lib/useClosingState';
import type { ITask } from '../types';
import { resolveStateColor, type ITaskState } from '../states-types';
import { StateModal } from './StateModal';
import { DeleteStateModal } from './DeleteStateModal';

interface Props {
  states: ITaskState[];
  tasks: ITask[];
  projectPublicId: string;
  onClose: () => void;
  onCreate: (label: string, color?: string, wipLimit?: number) => Promise<boolean>;
  onUpdate: (publicId: string, patch: { label?: string | null; color?: string | null; wipLimit?: number | null }) => Promise<boolean>;
  onDelete: (publicId: string, targetPublicId?: string) => Promise<{ ok: boolean; error?: string }>;
  onReorder: (orderedPublicIds: string[]) => Promise<boolean>;
}

function resolveLabel(s: ITaskState, t: (k: string) => string): string {
  if (s.label) return s.label;
  if (s.labelKey) return t(s.labelKey);
  return '—';
}

// ─── SVG icons (handoff: layers, info, X, star, pencil, hamburger, trash, plus) ─

function IconLayers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function IconInfo() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
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
function IconStar() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function IconPencil() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}
function IconHamburger() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ─── Drawer ──────────────────────────────────────────────────────────────────

export function ManageStatesDrawer({
  states, tasks, projectPublicId: _projectPublicId,
  onClose, onCreate, onUpdate, onDelete, onReorder,
}: Props) {
  const { t } = useTranslation('planning');
  const { showToast } = useToast();
  // Two-phase close — bate com `animation-duration` de .ms-drawer.is-closing (200ms).
  const { closing, requestClose } = useClosingState(onClose, 200);

  // Estado local optimista para reorder DnD.
  const [localOrder, setLocalOrder] = useState<ITaskState[]>(
    [...states].sort((a, b) => a.position - b.position),
  );
  // Sync quando states do parent muda (após refresh()).
  useMemo(() => {
    setLocalOrder([...states].sort((a, b) => a.position - b.position));
  }, [states]);

  const [editing, setEditing] = useState<ITaskState | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<ITaskState | null>(null);

  // Escape fecha (a menos que um modal esteja aberto).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !editing && !creating && !deleting) {
        requestClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [requestClose, editing, creating, deleting]);

  const taskCountByState = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) {
      if (t.boardColumn) m.set(t.boardColumn, (m.get(t.boardColumn) ?? 0) + 1);
    }
    return m;
  }, [tasks]);

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;
    const reordered = [...localOrder];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setLocalOrder(reordered);
    const ok = await onReorder(reordered.map((s) => s.publicId));
    if (!ok) showToast('danger', t('states.error.update'));
  }

  async function handleCreateSubmit(data: { label: string; color: string | null; wipLimit: number | null }) {
    // `onCreate` espera `color?: string`. `null` significa "sem cor" — converte
    // para undefined para o backend não receber o campo (default NULL no DB).
    const ok = await onCreate(data.label, data.color ?? undefined, data.wipLimit ?? undefined);
    if (ok) showToast('success', t('states.success.created'));
    return ok;
  }
  async function handleEditSubmit(data: { label: string; color: string | null; wipLimit: number | null }) {
    if (!editing) return false;
    const ok = await onUpdate(editing.publicId, {
      label: data.label === '' ? null : data.label,
      // `color: null` explícito limpa a cor no backend (volta a usar default
      // nativo via `resolveStateColor` no display).
      color: data.color,
      wipLimit: data.wipLimit,
    });
    if (ok) showToast('success', t('states.success.updated'));
    return ok;
  }
  async function handleDeleteConfirm(targetPublicId?: string) {
    if (!deleting) return { ok: false };
    const res = await onDelete(deleting.publicId, targetPublicId);
    if (res.ok) showToast('success', t('states.success.deleted'));
    return res;
  }

  return (
    <>
      <div className={`ms-backdrop${closing ? ' is-closing' : ''}`} onClick={requestClose} />
      <aside className={`ms-drawer${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true">
        <header className="ms-head">
          <h3 className="title">
            <IconLayers />
            {t('task.btn_manage_states')}
          </h3>
          <button type="button" className="close" onClick={requestClose} aria-label="Fechar">
            <IconClose />
          </button>
        </header>

        <div className="ms-info">
          <IconInfo />
          <span>{t('states.info_banner')}</span>
        </div>

        <div className="ms-body">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="ms-list">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {localOrder.map((state, index) => {
                    const swatch = resolveStateColor(state);
                    return (
                      <Draggable key={state.publicId} draggableId={state.publicId} index={index}>
                        {(dragProvided, snapshot) => (
                          <div
                            className={`ms-state${snapshot.isDragging ? ' is-dragging' : ''}`}
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            style={dragProvided.draggableProps.style}
                          >
                            <span className="dot" style={{ background: swatch }} />
                            <div className="info">
                              <div className="name">{resolveLabel(state, t)}</div>
                              {state.isSystem && (
                                <div className="meta">
                                  <IconStar />
                                  {t('states.system_badge')}
                                </div>
                              )}
                            </div>
                            <div className="actions">
                              <button
                                type="button"
                                className="edit"
                                onClick={() => setEditing(state)}
                                title="Editar"
                                aria-label="Editar"
                              ><IconPencil /></button>
                              {!state.isSystem && (
                                <button
                                  type="button"
                                  className="danger"
                                  onClick={() => setDeleting(state)}
                                  title="Eliminar"
                                  aria-label="Eliminar"
                                ><IconTrash /></button>
                              )}
                              <button
                                type="button"
                                className="handle"
                                {...dragProvided.dragHandleProps}
                                title="Reordenar"
                                aria-label="Reordenar"
                              ><IconHamburger /></button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        <footer className="ms-foot">
          <button
            type="button"
            className="ms-add-btn"
            onClick={() => setCreating(true)}
          >
            <IconPlus />
            {t('states.actions.add_state_btn')}
          </button>
        </footer>
      </aside>

      {creating && (
        <StateModal
          mode="create"
          onClose={() => setCreating(false)}
          onSubmit={handleCreateSubmit}
        />
      )}
      {editing && (
        <StateModal
          mode="edit"
          state={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleEditSubmit}
        />
      )}
      {deleting && (
        <DeleteStateModal
          state={deleting}
          taskCount={taskCountByState.get(deleting.publicId) ?? 0}
          otherStates={localOrder.filter((s) => s.publicId !== deleting.publicId)}
          onClose={() => setDeleting(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}
