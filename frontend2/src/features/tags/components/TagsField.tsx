// Port adaptado de `frontend/src/features/tags/components/TagsField.tsx` (regra 4).
//
// Adaptações face ao legacy:
//   1. Classes Bootstrap (`badge bg-primary-transparent`/`bg-success-transparent`) →
//      tokens `.tm-tag` / `.tm-tag.is-new` do template (definidas em task-modal.css).
//      Existing tags: `var(--brandSoft)` background. New tags (a criar inline):
//      tom `--st-done`-ish para destacar.
//   2. Sem `text-muted` para o `field.help` no modo `minimal` (já era omitted no legacy).
//   3. Dropdown sobreposto: `.tm-tags-dropdown` (tokens próprios em vez de `.card`/`.dropdown-item`).
//
// Comportamento idêntico ao legacy: fully-controlled, Enter/`,`/`;`/`Tab` commit,
// Backspace remove último item quando draft vazio.

import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { displayTag, normalizeTagName, type Tag } from '../types';

export type TagItem =
  | { kind: 'existing'; tag: Tag }
  | { kind: 'new'; name: string };

export interface TagsFieldValue {
  items: TagItem[];
  draft: string;
}

export const EMPTY_TAGS_VALUE: TagsFieldValue = { items: [], draft: '' };

/** Splits o `value` em arrays prontos a enviar no payload. Inclui o draft. */
export function tagsValueToPayload(value: TagsFieldValue): {
  tagPublicIds: string[];
  newTagNames: string[];
} {
  const tagPublicIds: string[] = [];
  const newTagNames: string[] = [];
  for (const it of value.items) {
    if (it.kind === 'existing') tagPublicIds.push(it.tag.publicId);
    else newTagNames.push(it.name);
  }
  const draft = value.draft.trim();
  if (draft.length > 0) {
    newTagNames.push(draft);
  }
  return { tagPublicIds, newTagNames };
}

interface TagsFieldProps {
  value: TagsFieldValue;
  onChange: (next: TagsFieldValue) => void;
  availableTags: Tag[];
  disabled?: boolean;
  /** Caracteres mínimos antes de mostrar sugestões / opção de criar. */
  minQueryLength?: number;
  /** Modo compacto sem borda nem texto de ajuda. Usado inline no header do TaskModal. */
  minimal?: boolean;
  /** Placeholder custom (override do default i18n). */
  placeholder?: string;
}

export function TagsField({
  value,
  onChange,
  availableTags,
  disabled = false,
  minQueryLength = 2,
  minimal = false,
  placeholder,
}: TagsFieldProps) {
  const { t } = useTranslation('tags');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const usedUpper = useMemo(() => {
    const s = new Set<string>();
    for (const it of value.items) {
      s.add(it.kind === 'existing' ? it.tag.name : normalizeTagName(it.name));
    }
    return s;
  }, [value.items]);

  const draftTrim = value.draft.trim();
  const draftNorm = normalizeTagName(draftTrim);
  const shouldFilter = draftTrim.length >= minQueryLength;

  const suggestions = useMemo<Tag[]>(() => {
    if (!shouldFilter) return [];
    return availableTags
      .filter((tag) => !usedUpper.has(tag.name))
      .filter((tag) => tag.name.includes(draftNorm))
      .slice(0, 20);
  }, [availableTags, draftNorm, shouldFilter, usedUpper]);

  const exactMatch = useMemo(() => {
    if (!draftNorm) return false;
    if (availableTags.some((tg) => tg.name === draftNorm)) return true;
    return usedUpper.has(draftNorm);
  }, [availableTags, draftNorm, usedUpper]);

  const showCreateOption = shouldFilter && !exactMatch && draftNorm.length > 0;

  function setDraft(next: string) {
    onChange({ items: value.items, draft: next });
  }

  function commitExisting(tag: Tag) {
    if (usedUpper.has(tag.name)) {
      onChange({ items: value.items, draft: '' });
      return;
    }
    onChange({
      items: [...value.items, { kind: 'existing', tag }],
      draft: '',
    });
  }

  function commitDraftAsNew() {
    const trimmed = value.draft.trim();
    if (trimmed.length === 0) return;
    const norm = normalizeTagName(trimmed);
    const existing = availableTags.find((tg) => tg.name === norm);
    if (existing) {
      commitExisting(existing);
      return;
    }
    if (usedUpper.has(norm)) {
      onChange({ items: value.items, draft: '' });
      return;
    }
    onChange({
      items: [...value.items, { kind: 'new', name: trimmed }],
      draft: '',
    });
  }

  function removeAt(idx: number) {
    const next = value.items.slice();
    next.splice(idx, 1);
    onChange({ items: next, draft: value.draft });
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (suggestions.length > 0) {
        commitExisting(suggestions[0]);
      } else if (value.draft.trim().length > 0) {
        commitDraftAsNew();
      }
    } else if (e.key === 'Backspace' && value.draft.length === 0) {
      if (value.items.length > 0) removeAt(value.items.length - 1);
    } else if (e.key === ',' || e.key === ';' || e.key === 'Tab') {
      if (value.draft.trim().length > 0) {
        e.preventDefault();
        commitDraftAsNew();
      }
    }
  }

  useEffect(() => {
    function onDocMouseDown(_ev: MouseEvent) {
      // No-op: draft sobrevive a click fora; submit reads value.draft anyway.
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const wrapClass = minimal ? 'tm-tags tm-tags--minimal' : 'tm-tags';

  return (
    <div className="tm-tags-wrap" ref={containerRef} style={{ position: 'relative' }}>
      <div
        className={wrapClass + (disabled ? ' is-disabled' : '')}
        onClick={() => { if (!disabled) inputRef.current?.focus(); }}
      >
        {value.items.map((item, idx) => {
          const label = item.kind === 'existing'
            ? displayTag(item.tag)
            : item.name.trim().toLowerCase();
          const cls = item.kind === 'existing' ? 'tm-tag' : 'tm-tag is-new';
          const key = item.kind === 'existing' ? `e-${item.tag.publicId}` : `n-${idx}-${item.name}`;
          return (
            <span key={key} className={cls} title={item.kind === 'new' ? t('field.help') : undefined}>
              {label}
              {!disabled && (
                <span
                  className="x"
                  role="button"
                  aria-label={t('action.remove')}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(idx);
                  }}
                >×</span>
              )}
            </span>
          );
        })}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            className="tm-tags-input"
            value={value.draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={value.items.length === 0 ? (placeholder ?? t('field.placeholder')) : ''}
          />
        )}
      </div>

      {shouldFilter && (suggestions.length > 0 || showCreateOption) && (
        <div className="tm-tags-dropdown">
          {suggestions.map((tag) => (
            <button
              key={tag.publicId}
              type="button"
              className="tm-tags-opt"
              onMouseDown={(e) => {
                e.preventDefault();
                commitExisting(tag);
                inputRef.current?.focus();
              }}
            >
              {displayTag(tag)}
            </button>
          ))}
          {showCreateOption && (
            <button
              type="button"
              className="tm-tags-opt is-create"
              onMouseDown={(e) => {
                e.preventDefault();
                commitDraftAsNew();
                inputRef.current?.focus();
              }}
            >
              {t('action.create_new', { name: draftTrim.toLowerCase() })}
            </button>
          )}
        </div>
      )}

      {!minimal && <small className="tm-tags-help">{t('field.help')}</small>}
    </div>
  );
}
