import { useEffect, useRef, type FocusEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Descrição da tarefa — `contentEditable` com placeholder via :empty::before.
 *
 * UI-only state local até o schema GanttTask suportar `description`.
 * Persiste apenas enquanto o modal está aberto.
 */
export function TaskModalDescriptionField({ value, onChange }: Props) {
  const { t } = useTranslation('planning');
  const ref = useRef<HTMLDivElement>(null);

  // Sync prop value → DOM (apenas em mount/changes externas; evita reset durante edição).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerText !== value) el.innerText = value;
  }, [value]);

  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    onChange(e.currentTarget.innerText);
  }

  return (
    <section className="task-section">
      <h6 className="task-section-title">
        <i className="ri-file-text-line" aria-hidden="true" />
        {t('task.section.description')}
      </h6>
      <div
        ref={ref}
        className="task-description"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={t('task.description.placeholder')}
        onBlur={handleBlur}
      />
    </section>
  );
}
