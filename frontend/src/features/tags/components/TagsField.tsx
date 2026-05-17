import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { displayTag, normalizeTagName, type Tag } from '../types';

/**
 * Cada item aplicado à task é uma de duas variantes:
 *  - `existing` — tag já persistida (tem publicId)
 *  - `new`      — nome bruto a criar inline no save
 *
 * Mais `draft` para o que o user está a escrever no input. Tudo external state —
 * o componente é 100% controlado. O submit pode incluir o `draft` no envio,
 * eliminando qualquer race condition entre setState e form submission.
 */
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
    // Backend dedup case-insensitive pelo upsert `[workspaceId, name]` — não
    // é preciso filtrar aqui (o draft pode até coincidir com um item já em
    // newTagNames; o resultado final é uma única tag).
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
  /**
   * Modo compacto sem borda nem texto de ajuda. Usado para o cabeçalho do
   * TaskModal (linha 3, abaixo do título), onde queremos uma UI singela —
   * só os chips + o input inline, sem moldura.
   */
  minimal?: boolean;
  /** Placeholder custom (override do default i18n). */
  placeholder?: string;
}

/**
 * Multi-select de tags com criação inline. Implementação React puro,
 * fully-controlled (zero state interno). O parent (useTaskForm) é responsável
 * por aplicar o `value.draft` no submit via `tagsValueToPayload`.
 */
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

  // Set de nomes normalizados já presentes (evita duplicar).
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

  // ── Mutações (todas via onChange — sem state interno) ───────────────────────

  function setDraft(next: string) {
    onChange({ items: value.items, draft: next });
  }

  function commitExisting(tag: Tag) {
    if (usedUpper.has(tag.name)) {
      // Já lá está — apenas limpa o draft.
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

    // Se afinal já existe nas tags do workspace → aplica como existente.
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

  // ── Eventos ─────────────────────────────────────────────────────────────────

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
      // Vírgula/ponto-e-vírgula/Tab comitam também — UX comum em tag inputs.
      if (value.draft.trim().length > 0) {
        e.preventDefault();
        commitDraftAsNew();
      }
    }
  }

  // Fechar com click fora — apenas estética; suggestions só mostram com draft.
  useEffect(() => {
    function onDocMouseDown(ev: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(ev.target as Node)) {
        // No-op: o draft sobrevive; submit em curso lê value.draft mesmo assim.
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  const controlClass = minimal
    ? `tags-field__control tags-field__control--minimal${disabled ? ' disabled' : ''}`
    : `tags-field__control form-control${disabled ? ' disabled' : ''}`;

  const controlStyle: React.CSSProperties = minimal
    ? {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        padding: 0,
        border: 'none',
        background: 'transparent',
        minHeight: 24,
        cursor: disabled ? 'not-allowed' : 'text',
      }
    : {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        minHeight: 38,
        padding: '4px 8px',
        cursor: disabled ? 'not-allowed' : 'text',
      };

  return (
    <div className="tags-field" ref={containerRef} style={{ position: 'relative' }}>
      <div
        className={controlClass}
        onClick={() => {
          if (!disabled) inputRef.current?.focus();
        }}
        style={controlStyle}
      >
        {value.items.map((item, idx) => {
          const label = item.kind === 'existing'
            ? displayTag(item.tag)
            : item.name.trim().toLowerCase();
          const cls = item.kind === 'existing' ? 'bg-primary-transparent' : 'bg-success-transparent';
          const key = item.kind === 'existing' ? `e-${item.tag.publicId}` : `n-${idx}-${item.name}`;
          return (
            <span
              key={key}
              className={`badge ${cls}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title={item.kind === 'new' ? t('field.help') : undefined}
            >
              {label}
              {!disabled && (
                <button
                  type="button"
                  className="btn-close btn-close-sm"
                  aria-label={t('action.remove')}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAt(idx);
                  }}
                  style={{ fontSize: 9 }}
                />
              )}
            </span>
          );
        })}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            className="tags-field__input"
            value={value.draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={
              value.items.length === 0
                ? (placeholder ?? t('field.placeholder'))
                : ''
            }
            style={{
              border: 'none',
              outline: 'none',
              flex: 1,
              minWidth: minimal ? 80 : 120,
              background: 'transparent',
              padding: minimal ? 0 : '4px 0',
              fontSize: minimal ? 12 : undefined,
            }}
          />
        )}
      </div>

      {shouldFilter && (suggestions.length > 0 || showCreateOption) && (
        <div
          className="tags-field__dropdown card shadow-sm"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            zIndex: 1080,
            marginTop: 4,
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((tag) => (
            <button
              key={tag.publicId}
              type="button"
              className="dropdown-item d-block text-start px-3 py-2"
              onMouseDown={(e) => {
                // mousedown em vez de onClick — dispara antes do blur,
                // garantindo que o handler corre mesmo se o user clicar
                // imediatamente noutro elemento a seguir.
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
              className="dropdown-item d-block text-start px-3 py-2 text-primary"
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

      {!minimal && <small className="text-muted">{t('field.help')}</small>}
    </div>
  );
}
