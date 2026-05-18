// Modal Create/Edit de External Resource.
// Markup canónico `NewTemplate/app-dark.jsx:1554-1602` (AddExternalResourceModal),
// com 4 desvios prescritos (DIFF categoria E):
//   1. Select Type alimentado por `useWorkspaceUserTypes()` (publicId UUID real
//      do backend), não lista hardcoded.
//   2. Modo Edit (via prop `initialValue`) — título e botão mudam.
//   3. Validação inline + banner de erro `.modal-alert` no body.
//   4. Submit async com `mf-primary` em loading/disabled state.

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWorkspaceUserTypes } from '../../../hooks/useWorkspaceUserTypes';
import type {
  CreateExternalResourceDto,
  UpdateExternalResourceDto,
} from '../usePlanningResources';

interface Props {
  initialValue?: {
    /** `TaskResource.publicId` — distinto de `TaskResourceNode.publicId`. */
    publicId: string;
    name: string;
    /** `UserType.publicId` actual (vem directo do payload de `GET /resources`). */
    userTypePublicId: string | null;
    hoursPerDay: number;
  };
  onClose: () => void;
  onCreate?: (dto: CreateExternalResourceDto) => Promise<void>;
  onUpdate?: (publicId: string, dto: UpdateExternalResourceDto) => Promise<void>;
}

export function ExternalResourceModal({ initialValue, onClose, onCreate, onUpdate }: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const { types, loading: typesLoading } = useWorkspaceUserTypes();

  const editing = !!initialValue;

  const [name, setName]                 = useState(initialValue?.name ?? '');
  const [userTypeId, setUserTypeId]     = useState<string>(initialValue?.userTypePublicId ?? '');
  const [hoursPerDay, setHoursPerDay]   = useState<number>(initialValue?.hoursPerDay ?? 8);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Escape fecha; body sem scroll enquanto modal aberto.
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

  const activeTypes = useMemo(() => types.filter((tp) => tp.status === 'ACTIVE'), [types]);

  const valid = name.trim().length > 0 && userTypeId.length > 0
    && Number.isFinite(hoursPerDay) && hoursPerDay >= 0.5 && hoursPerDay <= 24;

  async function submit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editing && onUpdate && initialValue) {
        await onUpdate(initialValue.publicId, {
          text: name.trim(),
          userTypeId,
          hoursPerDay,
        });
      } else if (!editing && onCreate) {
        await onCreate({
          text: name.trim(),
          userTypeId,
          hoursPerDay,
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
      <div className="modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={editing ? t('resources.modal.edit.title') : t('resources.modal.create.title')}>
        <div className="modal-head">
          <span className="title">
            {editing ? t('resources.modal.edit.title') : t('resources.modal.create.title')}
          </span>
          <button type="button" className="modal-close" onClick={onClose} aria-label={tc('actions.close')}>
            ×
          </button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void submit(); }}
        >
          <div className="modal-body">
            {error && <div className="modal-alert">{error}</div>}

            <div className="modal-field">
              <label htmlFor="ext-res-name">
                {t('resources.modal.field.name')}<span className="req">*</span>
              </label>
              <input
                id="ext-res-name"
                type="text"
                placeholder={t('resources.modal.field.name_placeholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                disabled={submitting}
              />
            </div>

            <div className="modal-field">
              <label htmlFor="ext-res-type">
                {t('resources.modal.field.type')}<span className="req">*</span>
              </label>
              <select
                id="ext-res-type"
                value={userTypeId}
                onChange={(e) => setUserTypeId(e.target.value)}
                disabled={submitting || typesLoading}
              >
                <option value="">{t('resources.modal.field.type_placeholder')}</option>
                {activeTypes.map((tp) => (
                  <option key={tp.publicId} value={tp.publicId}>{tp.label}</option>
                ))}
              </select>
            </div>

            <div className="modal-field">
              <label htmlFor="ext-res-hpd">{t('resources.modal.field.hours_per_day')}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  id="ext-res-hpd"
                  type="number"
                  value={hoursPerDay}
                  min={0.5}
                  max={24}
                  step={0.5}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  disabled={submitting}
                  style={{ width: 80 }}
                />
                <span style={{ color: 'var(--dim)', fontSize: 13 }}>h</span>
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
                : (editing ? t('resources.modal.btn.save') : t('resources.modal.btn.create'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
