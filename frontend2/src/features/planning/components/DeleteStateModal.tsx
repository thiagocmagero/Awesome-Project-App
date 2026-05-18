// Modal de confirmação de eliminação de Estado. Alinhado com padrão
// `.ms-modal-*` per handoff §7 (mesma estrutura que StateModal).

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ITaskState } from '../states-types';

interface Props {
  state: ITaskState;
  taskCount: number;
  otherStates: ITaskState[];
  onClose: () => void;
  onConfirm: (targetStatePublicId?: string) => Promise<{ ok: boolean; error?: string }>;
}

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
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function resolveLabel(s: ITaskState, t: (k: string) => string): string {
  if (s.label) return s.label;
  if (s.labelKey) return t(s.labelKey);
  return '—';
}

export function DeleteStateModal({ state, taskCount, otherStates, onClose, onConfirm }: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const needsTarget = taskCount > 0;
  const [target, setTarget] = useState<string>(otherStates[0]?.publicId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const stateLabel = useMemo(() => resolveLabel(state, t), [state, t]);

  async function handleConfirm() {
    if (needsTarget && !target) {
      setError(t('states.error.need_target'));
      return;
    }
    setSaving(true);
    setError(null);
    const result = await onConfirm(needsTarget ? target : undefined);
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.error ?? t('states.error.delete'));
  }

  return (
    <div className="ms-modal-backdrop" onClick={onClose}>
      <div className="ms-modal" onClick={(e) => e.stopPropagation()}>
        <header className="ms-modal-head">
          <h4 className="title">
            <IconLayers />
            {tc('actions.delete')}
          </h4>
          <button type="button" className="close" onClick={onClose} aria-label="Fechar">
            <IconClose />
          </button>
        </header>

        <div className="ms-modal-body">
          <p className="ms-text">
            {needsTarget ? (
              <>
                Eliminar o estado <b>{stateLabel}</b> ({taskCount} tarefa{taskCount === 1 ? '' : 's'}).
                <br />
                <span className="warn">As tarefas têm de ser movidas para outro estado.</span>
              </>
            ) : (
              <>Eliminar o estado <b>{stateLabel}</b>?</>
            )}
          </p>

          {needsTarget && (
            <div className="ms-field">
              <label htmlFor="dm-target">Mover tarefas para</label>
              <select
                id="dm-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                {otherStates.map((s) => (
                  <option key={s.publicId} value={s.publicId}>
                    {resolveLabel(s, t)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <div className="ms-error">{error}</div>}
        </div>

        <footer className="ms-modal-foot">
          <button type="button" onClick={onClose} disabled={saving}>
            {tc('actions.cancel')}
          </button>
          <button type="button" className="danger" onClick={handleConfirm} disabled={saving}>
            <IconTrash />
            {saving ? tc('actions.deleting') : tc('actions.delete')}
          </button>
        </footer>
      </div>
    </div>
  );
}
