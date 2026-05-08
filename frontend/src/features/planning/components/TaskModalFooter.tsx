import { useTranslation } from 'react-i18next';

interface Props {
  isDirty: boolean;
  loading: boolean;
  isCreate: boolean;
  isMilestoneCreate?: boolean;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Footer fixo do modal — indicador "Alterações não salvas" + botões.
 */
export function TaskModalFooter({
  isDirty,
  loading,
  isCreate,
  isMilestoneCreate = false,
  onCancel,
  onSave,
}: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  const saveLabel = loading
    ? tc('messages.saving')
    : isCreate
      ? (isMilestoneCreate ? t('task.btn_create_milestone') : t('task.btn_create'))
      : tc('actions.save');

  return (
    <div className="task-footer">
      {isDirty && !loading && (
        <span className="task-footer-dirty">
          <span className="dot" aria-hidden="true" />
          {t('task.unsaved_changes')}
        </span>
      )}
      <div className="task-footer-actions">
        <button type="button" className="btn btn-light" onClick={onCancel}>
          {tc('actions.cancel')}
        </button>
        <button
          type="button"
          className="btn btn-purple"
          disabled={loading}
          onClick={onSave}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
              {tc('messages.saving')}
            </>
          ) : (
            <>
              <i className="ri-check-line me-1" aria-hidden="true" />
              {saveLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
