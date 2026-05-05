import { type ChangeEvent, useState } from 'react';
import type { Card, Id, Link } from '../../../types';

export interface LinksFieldProps {
  card: Card;
  /** All cards in the board — used to populate the picker. The current card
   *  is filtered out (no self-links). */
  allCards: Card[];
  /** Existing links involving this card (either as master or slave). */
  links: Link[];
  /** Relation values shown in the dropdown. Defaults cover the canonical
   *  set from the spec. */
  relations?: Array<{ id: string; label: string }>;
  onAdd: (link: Omit<Link, 'id'>) => void;
  onRemove: (linkId: Id) => void;
}

const DEFAULT_RELATIONS = [
  { id: 'relatesTo', label: 'Relates to' },
  { id: 'requiredFor', label: 'Required for' },
  { id: 'duplicate', label: 'Duplicate of' },
  { id: 'parent', label: 'Parent of' },
];

export function LinksField({
  card,
  allCards,
  links,
  relations = DEFAULT_RELATIONS,
  onAdd,
  onRemove,
}: LinksFieldProps) {
  const [relation, setRelation] = useState(relations[0]?.id ?? 'relatesTo');
  const [targetId, setTargetId] = useState<string>('');

  const myLinks = links.filter(
    (l) => l.masterId === card.id || l.slaveId === card.id
  );
  const candidates = allCards.filter((c) => c.id !== card.id);

  const handleAdd = () => {
    if (!targetId) return;
    const target = allCards.find((c) => String(c.id) === targetId);
    if (!target) return;
    onAdd({
      masterId: card.id,
      slaveId: target.id,
      relation,
    });
    setTargetId('');
  };

  return (
    <div className="ak-editor__field">
      <span className="ak-editor__label">Links</span>

      <ul className="ak-links">
        {myLinks.length === 0 && (
          <li className="ak-links__empty">No linked cards.</li>
        )}
        {myLinks.map((link) => {
          const isMaster = link.masterId === card.id;
          const otherId = isMaster ? link.slaveId : link.masterId;
          const other = allCards.find((c) => c.id === otherId);
          const relationLabel =
            relations.find((r) => r.id === link.relation)?.label ?? link.relation;
          return (
            <li key={link.id} className="ak-links__item">
              <span className="ak-links__relation">{relationLabel}</span>
              <span className="ak-links__target">
                {other?.label ?? `Card #${String(otherId)}`}
              </span>
              <button
                type="button"
                className="ak-links__remove"
                onClick={() => onRemove(link.id)}
                aria-label="Remove link"
              >
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="ak-links__compose">
        <select
          value={relation}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setRelation(e.target.value)
          }
        >
          {relations.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          value={targetId}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setTargetId(e.target.value)
          }
        >
          <option value="">— pick a card —</option>
          {candidates.map((c) => (
            <option key={String(c.id)} value={String(c.id)}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ak-toolbar__btn ak-toolbar__btn--soft"
          onClick={handleAdd}
          disabled={!targetId}
        >
          <i className="ti ti-link" aria-hidden="true" /> Link
        </button>
      </div>
    </div>
  );
}
