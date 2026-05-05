// Offcanvas de gestão de Tipos de Evento — list/edit/create/delete inline.
// Padrão idêntico ao BoardConfigPanel/Gantt config offcanvas.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBootstrapOffcanvas } from '../../../hooks/useBootstrapOffcanvas';
import type { ICalendarEventType } from '../types';

interface Props {
  open: boolean;
  eventTypes: ICalendarEventType[];
  canManage: boolean;
  onCreate: (name: string, color: string) => Promise<boolean>;
  onUpdate: (
    typePublicId: string,
    patch: { name?: string | null; color?: string },
  ) => Promise<boolean>;
  onDelete: (typePublicId: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}

function eventTypeLabel(t: ICalendarEventType, tCal: (k: string) => string): string {
  if (t.name && t.name.trim() !== '') return t.name;
  if (t.labelKey) return tCal(t.labelKey);
  return t.publicId.slice(0, 8);
}

export function CalendarEventTypesPanel({
  open, eventTypes, canManage, onCreate, onUpdate, onDelete, onClose,
}: Props) {
  const { t: tCal } = useTranslation('calendar');
  const { t: tc }   = useTranslation('common');

  const offcanvasRef = useRef<HTMLDivElement>(null);
  useBootstrapOffcanvas(offcanvasRef, open, onClose);

  const [newName,  setNewName]  = useState('');
  const [newColor, setNewColor] = useState('#845adf');
  const [creating, setCreating] = useState(false);

  // Edição inline por tipo
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editName,    setEditName]    = useState('');
  const [editColor,   setEditColor]   = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [deleting,    setDeleting]    = useState<string | null>(null);

  // Reset estado quando o painel fecha — evita reabrir num estado parcial.
  useEffect(() => {
    if (open) return;
    setEditingId(null);
    setEditName('');
    setEditColor('');
    setNewName('');
    setNewColor('#845adf');
  }, [open]);

  const startEdit = (t: ICalendarEventType) => {
    setEditingId(t.publicId);
    setEditName(t.name ?? '');
    setEditColor(t.color);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setEditLoading(true);
    const t = eventTypes.find((x) => x.publicId === editingId);
    const patch: { name?: string | null; color?: string } = { color: editColor };
    if (t?.isSystem) {
      // Sistema: name vazio → repor default i18n
      patch.name = editName.trim() === '' ? null : editName.trim();
    } else {
      patch.name = editName.trim();
    }
    const ok = await onUpdate(editingId, patch);
    setEditLoading(false);
    if (ok) setEditingId(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const ok = await onCreate(newName.trim(), newColor);
    setCreating(false);
    if (ok) {
      setNewName('');
      setNewColor('#845adf');
    }
  };

  const handleDelete = async (t: ICalendarEventType) => {
    const label = eventTypeLabel(t, tCal);
    if (!window.confirm(tCal('event_type.actions.delete_confirm', { name: label }))) return;
    setDeleting(t.publicId);
    await onDelete(t.publicId);
    setDeleting(null);
  };

  return (
    <div ref={offcanvasRef} className="offcanvas offcanvas-end" tabIndex={-1}>
      <div className="offcanvas-header">
        <h5 className="offcanvas-title">
          <i className="ri-price-tag-3-line me-2" />
          {tCal('event_type.modal.title_manage')}
        </h5>
        <button
          type="button"
          className="btn-close"
          data-bs-dismiss="offcanvas"
          aria-label={tc('actions.close')}
        />
      </div>
      <div className="offcanvas-body">
        {eventTypes.length === 0 && (
          <p className="text-muted">{tc('messages.no_results')}</p>
        )}

        <ul className="list-group mb-3">
          {eventTypes.map((typ) => {
            const isEditing = editingId === typ.publicId;
            return (
              <li
                key={typ.publicId}
                className="list-group-item d-flex align-items-center gap-2"
              >
                {isEditing ? (
                  <>
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="form-control form-control-color"
                      style={{ width: 40 }}
                    />
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={typ.isSystem
                        ? tCal('event_type.form.system_name_hint')
                        : tCal('event_type.form.name_ph')}
                      maxLength={60}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={handleSaveEdit}
                      disabled={editLoading}
                    >
                      {tc('actions.save')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      onClick={() => setEditingId(null)}
                    >
                      {tc('actions.cancel')}
                    </button>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        width: 16, height: 16, borderRadius: '50%',
                        background: typ.color, flexShrink: 0,
                      }}
                    />
                    <span className="flex-grow-1 text-truncate">{eventTypeLabel(typ, tCal)}</span>
                    {typ.isSystem && (
                      <span className="badge bg-light text-dark fs-11">
                        {tCal('event_type.system_badge')}
                      </span>
                    )}
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => startEdit(typ)}
                          title={tc('actions.edit')}
                        >
                          <i className="ri-pencil-line" />
                        </button>
                        {!typ.isSystem && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDelete(typ)}
                            disabled={deleting === typ.publicId}
                            title={tc('actions.delete')}
                          >
                            <i className="ri-delete-bin-line" />
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>

        {canManage && (
          <div className="border-top pt-3">
            <p className="switcher-style-head">{tCal('event_type.modal.title_create')}:</p>
            <div className="row switcher-style gx-0">
              <div className="d-flex align-items-center gap-2">
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="form-control form-control-color"
                  style={{ width: 40 }}
                />
                <input
                  type="text"
                  className="form-control form-control-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={tCal('event_type.form.name_ph')}
                  maxLength={60}
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                >
                  <i className="ri-add-line me-1" />
                  {tCal('event_type.actions.add')}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
