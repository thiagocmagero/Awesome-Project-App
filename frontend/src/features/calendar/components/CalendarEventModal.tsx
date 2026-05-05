import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ICalendarEvent, ICalendarEventType } from '../types';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { toFlatpickrFormat } from '../../../lib/dateFormatting';

declare const flatpickr: (el: HTMLElement, opts?: object) => { destroy(): void };

interface Props {
  open: boolean;
  /** null = create mode; objecto = edit */
  event: ICalendarEvent | null;
  /** Pré-preenchimento para create (drag select no calendário) */
  initialRange?: { start: string; end: string; allDay: boolean } | null;
  eventTypes: ICalendarEventType[];
  canDelete: boolean;
  onSave: (payload: {
    typeId: string;
    title: string;
    description?: string | null;
    startAt: string;
    endAt: string;
    allDay: boolean;
    color?: string | null;
  }) => Promise<boolean>;
  onDelete?: () => Promise<boolean>;
  onClose: () => void;
}

function eventTypeLabel(t: ICalendarEventType, tCal: (k: string) => string): string {
  if (t.name && t.name.trim() !== '') return t.name;
  if (t.labelKey) return tCal(t.labelKey);
  return t.publicId.slice(0, 8);
}

export function CalendarEventModal({
  open, event, initialRange, eventTypes, canDelete, onSave, onDelete, onClose,
}: Props) {
  const { t: tCal } = useTranslation('calendar');
  const { t: tc }   = useTranslation('common');
  const dateFormat  = useResolvedDateFormat();

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [typeId,      setTypeId]      = useState('');
  const [startAt,     setStartAt]     = useState('');
  const [endAt,       setEndAt]       = useState('');
  const [allDay,      setAllDay]      = useState(false);
  const [color,       setColor]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [formError,   setFormError]   = useState<string | null>(null);

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef   = useRef<HTMLInputElement>(null);

  // Refs com os valores actuais — usados para preservar edits do utilizador
  // quando o FlatPickr é re-inicializado (toggle do allDay)
  const startAtRef    = useRef(startAt);
  const endAtRef      = useRef(endAt);
  const lastEventRef  = useRef<ICalendarEvent | null>(null);
  const lastRangeRef  = useRef<typeof initialRange>(null);

  // Sync refs first so a re-render after setStart/setEnd already has the new value
  useEffect(() => { startAtRef.current = startAt; }, [startAt]);
  useEffect(() => { endAtRef.current   = endAt;   }, [endAt]);

  // Preencher form quando abre
  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? '');
      setTypeId(event.typePublicId);
      setStartAt(event.startAt);
      setEndAt(event.endAt);
      setAllDay(event.allDay);
      setColor(event.color ?? '');
    } else {
      setTitle('');
      setDescription('');
      setTypeId(eventTypes[0]?.publicId ?? '');
      setStartAt(initialRange?.start ?? new Date().toISOString());
      setEndAt(initialRange?.end ?? new Date(Date.now() + 60 * 60 * 1000).toISOString());
      setAllDay(initialRange?.allDay ?? false);
      setColor('');
    }
  }, [open, event, initialRange, eventTypes]);

  // Body overflow
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // FlatPickr setup — re-inicializa quando o modal abre, allDay muda, ou
  // o evento/initialRange mudam (modal reaberto para outro item).
  useEffect(() => {
    if (!open) return;
    if (typeof flatpickr === 'undefined') return;

    // Detectar se a "fonte" mudou (modal reaberto para outro evento/range).
    // Se sim, ignoramos as refs (que têm valores stale do uso anterior) e usamos as props.
    // Caso contrário (apenas allDay alterou), preferimos as refs para preservar edits.
    const sourceChanged =
      lastEventRef.current !== event || lastRangeRef.current !== initialRange;
    lastEventRef.current = event;
    lastRangeRef.current = initialRange;

    const propsStart =
      event?.startAt ?? initialRange?.start ?? new Date().toISOString();
    const propsEnd =
      event?.endAt ?? initialRange?.end ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();

    const startVal = sourceChanged ? propsStart : (startAtRef.current || propsStart);
    const endVal   = sourceChanged ? propsEnd   : (endAtRef.current   || propsEnd);

    let fpStart: { destroy(): void } | null = null;
    let fpEnd:   { destroy(): void } | null = null;
    if (startInputRef.current) {
      fpStart = flatpickr(startInputRef.current, {
        enableTime: !allDay,
        dateFormat: toFlatpickrFormat(dateFormat, !allDay),
        time_24hr: true,
        defaultDate: new Date(startVal),
        onChange: ([date]: Date[]) => date && setStartAt(date.toISOString()),
      });
    }
    if (endInputRef.current) {
      fpEnd = flatpickr(endInputRef.current, {
        enableTime: !allDay,
        dateFormat: toFlatpickrFormat(dateFormat, !allDay),
        time_24hr: true,
        defaultDate: new Date(endVal),
        onChange: ([date]: Date[]) => date && setEndAt(date.toISOString()),
      });
    }
    return () => {
      fpStart?.destroy();
      fpEnd?.destroy();
    };
  }, [open, allDay, event, initialRange, dateFormat]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError(tc('errors.required'));
      return;
    }
    if (!typeId) {
      setFormError(tc('errors.required'));
      return;
    }
    if (new Date(endAt) < new Date(startAt)) {
      setFormError(tCal('errors.range_invalid'));
      return;
    }
    setSaving(true);
    const ok = await onSave({
      typeId,
      title: title.trim(),
      description: description.trim() || null,
      startAt,
      endAt,
      allDay,
      color: color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null,
    });
    setSaving(false);
    if (ok) onClose();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm(tCal('event.actions.delete_confirm', { title }))) return;
    setDeleting(true);
    const ok = await onDelete();
    setDeleting(false);
    if (ok) onClose();
  };

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">
                  {event ? tCal('event.modal.title_edit') : tCal('event.modal.title_create')}
                </h5>
                <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
              </div>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-danger py-2 mb-3">{formError}</div>
                )}

                <div className="mb-3">
                  <label className="form-label">{tCal('event.form.title')}</label>
                  <input
                    type="text"
                    className="form-control"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={tCal('event.form.title_ph')}
                    required
                    maxLength={200}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">{tCal('event.form.type')}</label>
                  <select
                    className="form-select"
                    value={typeId}
                    onChange={(e) => setTypeId(e.target.value)}
                    required
                  >
                    {eventTypes.map((typ) => (
                      <option key={typ.publicId} value={typ.publicId}>
                        {eventTypeLabel(typ, tCal)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="cal-event-allday"
                    checked={allDay}
                    onChange={(e) => setAllDay(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="cal-event-allday">
                    {tCal('event.form.all_day')}
                  </label>
                </div>

                <div className="row">
                  <div className="col-6 mb-3">
                    <label className="form-label">{tCal('event.form.start')}</label>
                    <input
                      ref={startInputRef}
                      type="text"
                      className="form-control"
                      placeholder={allDay ? 'DD-MM-AAAA' : 'DD-MM-AAAA HH:MM'}
                    />
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label">{tCal('event.form.end')}</label>
                    <input
                      ref={endInputRef}
                      type="text"
                      className="form-control"
                      placeholder={allDay ? 'DD-MM-AAAA' : 'DD-MM-AAAA HH:MM'}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">{tCal('event.form.description')}</label>
                  <textarea
                    className="form-control"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={2000}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">{tCal('event.form.color')}</label>
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="color"
                      className="form-control form-control-color"
                      value={color || '#845adf'}
                      onChange={(e) => setColor(e.target.value)}
                      style={{ width: 50 }}
                    />
                    {color && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => setColor('')}
                      >
                        {tc('actions.clear')}
                      </button>
                    )}
                    <small className="text-muted">{tCal('event.form.color_hint')}</small>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {event && canDelete && onDelete && (
                  <button
                    type="button"
                    className="btn btn-outline-danger me-auto"
                    onClick={handleDelete}
                    disabled={deleting || saving}
                  >
                    <i className="ri-delete-bin-line me-1" />
                    {tCal('event.actions.delete')}
                  </button>
                )}
                <button type="button" className="btn btn-light" onClick={onClose} disabled={saving}>
                  {tc('actions.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || deleting}>
                  {saving ? tc('messages.saving') : tc('actions.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}
