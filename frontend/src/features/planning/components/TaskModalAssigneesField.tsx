import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { avatarColorFor, initialsOf } from '../../../lib/avatars';

interface ResourceItem {
  id: string;   // publicId do GanttResourceNode
  name: string;
  avatarUrl: string | null;
}

interface ResourceGroup {
  label: string;
  items: ResourceItem[];
}

interface Props {
  /** Map<groupCode, { label, items: [{ id, name, avatarUrl }] }> — vem do orchestrator. */
  allResourcesByType: Map<string, ResourceGroup>;
  /** Lista de publicIds seleccionados — controlado por `useTaskForm`. */
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
}

interface AssigneeMeta {
  name: string;
  groupLabel: string;
  avatarUrl: string | null;
}

/**
 * Avatar de assignee — quando há `avatarUrl`, usa o `<img>` (S3 público); senão
 * gera background colorido determinístico com iniciais. Padrão alinhado com
 * AppLayout / ResourceGrid do Gantt.
 */
function AssigneeAvatar({
  id,
  name,
  avatarUrl,
  size = 22,
}: {
  id: string;
  name: string;
  avatarUrl: string | null;
  size?: number;
}) {
  const fontSize = size <= 22 ? 10 : 11.5;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize,
        background: avatarColorFor(id || name),
      }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

/**
 * Multi-select de responsáveis com chips (avatar + nome + ×).
 * Substitui o Choices.js multi-select original. Permite pesquisa por nome
 * e suporta navegação por teclado (Enter para seleccionar primeiro
 * resultado, Backspace para remover último chip quando input vazio).
 *
 * Os IDs trafegados são `GanttResourceNode.publicId` — convenção desde
 * Maio 2026 (ver docs/claude/tools/gantt/data-model.md).
 */
export function TaskModalAssigneesField({
  allResourcesByType,
  selectedIds,
  setSelectedIds,
}: Props) {
  const { t } = useTranslation('planning');
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Flat lookup id → { name, avatarUrl, groupLabel }
  const lookup = useMemo(() => {
    const map = new Map<string, AssigneeMeta>();
    for (const [, group] of allResourcesByType) {
      for (const item of group.items) {
        map.set(item.id, { name: item.name, avatarUrl: item.avatarUrl, groupLabel: group.label });
      }
    }
    return map;
  }, [allResourcesByType]);

  // Sugestões filtradas — exclui já seleccionados, agrupadas por type label.
  const suggestions = useMemo(() => {
    const q = draft.trim().toLowerCase();
    const groups: Array<{ label: string; items: ResourceItem[] }> = [];
    for (const [, group] of allResourcesByType) {
      const filtered = group.items.filter((it) =>
        !selectedIds.includes(it.id) && (q === '' || it.name.toLowerCase().includes(q)),
      );
      if (filtered.length > 0) groups.push({ label: group.label, items: filtered });
    }
    return groups;
  }, [allResourcesByType, draft, selectedIds]);

  function addId(id: string) {
    if (!selectedIds.includes(id)) {
      setSelectedIds([...selectedIds, id]);
    }
    setDraft('');
  }

  function removeId(id: string) {
    setSelectedIds(selectedIds.filter((s) => s !== id));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = suggestions[0]?.items[0];
      if (first) addId(first.id);
    } else if (e.key === 'Backspace' && !draft && selectedIds.length > 0) {
      setSelectedIds(selectedIds.slice(0, -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div className="assignee-input">
        {selectedIds.map((id) => {
          const meta = lookup.get(id);
          const name = meta?.name ?? id;
          const avatarUrl = meta?.avatarUrl ?? null;
          return (
            <span key={id} className="assignee-pill">
              <AssigneeAvatar id={id} name={name} avatarUrl={avatarUrl} size={22} />
              {name}
              <button
                type="button"
                className="pill-x"
                onClick={() => removeId(id)}
                aria-label={`remove ${name}`}
              >
                <i className="ri-close-line" aria-hidden="true" />
              </button>
            </span>
          );
        })}
        <input
          type="text"
          className="bare-input"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={selectedIds.length === 0 ? t('task.assignees.placeholder') : ''}
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="assignee-suggestions">
          {suggestions.map((group) => (
            <div key={group.label}>
              <div className="assignee-suggestion-group">{group.label}</div>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="assignee-suggestion"
                  onMouseDown={(e) => { e.preventDefault(); addId(item.id); }}
                >
                  <AssigneeAvatar id={item.id} name={item.name} avatarUrl={item.avatarUrl} size={24} />
                  {item.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
