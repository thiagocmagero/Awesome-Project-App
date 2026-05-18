// Modal Create/Edit Link (dependência entre tarefas).
// Markup canónico `NewTemplate/app-dark.jsx:1486-1552` (CreateLinkModal), com
// desvios prescritos (DIFF categoria E):
//   1. Source/Target alimentados por `tasks` reais (não mock); Target filtra source.
//   2. Type options mapeadas para wire DHTMLX 0=FS, 1=SS, 2=FF, 3=SF (canónico
//      manda strings 'FS'/'SS'/... ao callback — aqui mandamos wire ints
//      stringified, alinhado com backend DTO).
//   3. Submit async com error inline `.modal-alert`.
//   4. Modo Edit (via prop `initialValue`) — canónico só tinha Create.
//      Em Edit, Source/Target ficam disabled (backend só suporta PATCH de
//      `type`+`lag`); só Type e Lag são editáveis.

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITask } from '../types';
import type { CreateLinkDto, UpdateLinkDto } from '../usePlanningLinks';

interface Props {
  tasks: ITask[];
  initialValue?: {
    publicId: string;
    source: number;
    target: number;
    type: string; // wire format '0'|'1'|'2'|'3' (vindo do backend)
    lag: number;
  };
  onClose: () => void;
  onCreate?: (dto: CreateLinkDto) => Promise<void>;
  onUpdate?: (publicId: string, dto: UpdateLinkDto) => Promise<void>;
}

type LinkTypeKey = 'FS' | 'SS' | 'FF' | 'SF';

const LINK_TYPE_TO_WIRE: Record<LinkTypeKey, '0' | '1' | '2' | '3'> = {
  FS: '0',
  SS: '1',
  FF: '2',
  SF: '3',
};
const WIRE_TO_LINK_TYPE: Record<string, LinkTypeKey> = {
  '0': 'FS',
  '1': 'SS',
  '2': 'FF',
  '3': 'SF',
};

export function LinkModal({ tasks, initialValue, onClose, onCreate, onUpdate }: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  const editing = !!initialValue;

  const [source, setSource]       = useState<string>(initialValue ? String(initialValue.source) : '');
  const [target, setTarget]       = useState<string>(initialValue ? String(initialValue.target) : '');
  const [type, setType]           = useState<LinkTypeKey>(
    initialValue ? (WIRE_TO_LINK_TYPE[initialValue.type] ?? 'FS') : 'FS',
  );
  const [lag, setLag]             = useState<number>(initialValue?.lag ?? 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const typeOptions: Array<{ value: LinkTypeKey; labelKey: string }> = [
    { value: 'FS', labelKey: 'task.links.type.fs' },
    { value: 'SS', labelKey: 'task.links.type.ss' },
    { value: 'FF', labelKey: 'task.links.type.ff' },
    { value: 'SF', labelKey: 'task.links.type.sf' },
  ];

  // Tasks renderizáveis: têm `id` numérico interno (DHTMLX) — usado como value.
  const taskOptions = useMemo(
    () => tasks.filter((tk) => tk.text && typeof tk.id === 'number'),
    [tasks],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, submitting]);

  const valid = source !== '' && target !== '' && source !== target;

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editing && onUpdate && initialValue) {
        await onUpdate(initialValue.publicId, {
          type: LINK_TYPE_TO_WIRE[type],
          lag: Number.isFinite(lag) ? lag : 0,
        });
      } else if (!editing && onCreate) {
        await onCreate({
          source: Number(source),
          target: Number(target),
          type: LINK_TYPE_TO_WIRE[type],
          lag: Number.isFinite(lag) ? lag : 0,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={editing ? t('dependencies.modal.edit.title') : t('dependencies.modal.title')}>
        <div className="modal-head">
          <span className="title">{editing ? t('dependencies.modal.edit.title') : t('dependencies.modal.title')}</span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={tc('actions.close')}>
            ×
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <div className="modal-body">
            {error && <div className="modal-alert">{error}</div>}

            <div className="modal-field">
              <label htmlFor="lnk-source">
                {t('dependencies.modal.field.source')}<span className="req">*</span>
              </label>
              <select
                id="lnk-source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={submitting || editing}
              >
                <option value="">{t('list.select_placeholder')}</option>
                {taskOptions.map((tk) => (
                  <option key={tk.id} value={String(tk.id)}>{tk.text}</option>
                ))}
              </select>
            </div>

            <div className="modal-field">
              <label htmlFor="lnk-target">
                {t('dependencies.modal.field.target')}<span className="req">*</span>
              </label>
              <select
                id="lnk-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                disabled={submitting || editing}
              >
                <option value="">{t('list.select_placeholder')}</option>
                {taskOptions.filter((tk) => String(tk.id) !== source).map((tk) => (
                  <option key={tk.id} value={String(tk.id)}>{tk.text}</option>
                ))}
              </select>
            </div>

            <div className="modal-row2">
              <div className="modal-field">
                <label htmlFor="lnk-type">{t('dependencies.modal.field.type')}</label>
                <select
                  id="lnk-type"
                  value={type}
                  onChange={(e) => setType(e.target.value as LinkTypeKey)}
                  disabled={submitting}
                >
                  {typeOptions.map((o) => (
                    <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
                  ))}
                </select>
              </div>

              <div className="modal-field">
                <label htmlFor="lnk-lag">{t('dependencies.modal.field.lag')}</label>
                <input
                  id="lnk-lag"
                  type="number"
                  value={lag}
                  onChange={(e) => setLag(Number(e.target.value))}
                  disabled={submitting}
                />
                <div className="help">{t('dependencies.modal.field.lag_hint')}</div>
              </div>
            </div>
          </div>

          <div className="modal-foot">
            <button type="button" className="mf-cancel" onClick={onClose} disabled={submitting}>
              {tc('actions.cancel')}
            </button>
            <button type="submit" className="mf-primary" disabled={!valid || submitting}>
              {submitting
                ? tc('messages.processing')
                : (editing ? t('dependencies.modal.btn.save') : t('dependencies.modal.btn.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
