import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  tags: string[];
  setTags: (tags: string[]) => void;
}

/**
 * Editor de tags inline — chips removíveis + input "+ tag".
 * UI-only state local: persiste apenas enquanto o modal está aberto.
 * Plug-in para `taskForm.tags` quando o schema suportar.
 */
export function TaskModalTagsField({ tags, setTags }: Props) {
  const { t } = useTranslation('planning');
  const [draft, setDraft] = useState('');

  function commit() {
    const value = draft.trim();
    if (!value) return;
    if (tags.includes(value)) {
      setDraft('');
      return;
    }
    setTags([...tags, value]);
    setDraft('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Backspace' && !draft && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  return (
    <div className="task-tags">
      {tags.map((tag) => (
        <span key={tag} className="pill pill-purple pill-removable">
          {tag}
          <button
            type="button"
            className="pill-x"
            onClick={() => removeTag(tag)}
            aria-label={`remove ${tag}`}
          >
            <i className="ri-close-line" aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        type="text"
        className="task-tag-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={t('task.tags.placeholder')}
      />
    </div>
  );
}
