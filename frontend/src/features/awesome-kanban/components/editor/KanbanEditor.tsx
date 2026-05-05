import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Attachment,
  AwesomeKanbanLocale,
  Card,
  Comment,
  EditorConfig,
  EditorField,
  EditorRenderContext,
  Id,
  Link,
  UserValue,
} from '../../types';
import { EditorPopup } from './EditorPopup';
import { EditorModal } from './EditorModal';
import { EditorSidebar } from './EditorSidebar';
import { TextField } from './fields/TextField';
import { SelectField } from './fields/SelectField';
import { DateField } from './fields/DateField';
import { ProgressField } from './fields/ProgressField';
import { CommentsField } from './fields/CommentsField';
import { FilesField } from './fields/FilesField';
import { LinksField } from './fields/LinksField';

export interface KanbanEditorProps {
  card: Card | null;
  isNew: boolean;
  locale: AwesomeKanbanLocale;
  config: EditorConfig | ((ctx: EditorRenderContext) => unknown) | null | false | undefined;
  fields?: EditorField[];
  /** Identity used for new comments. */
  currentUser?: Id;
  /** Roster used to render comment authors / assignees. */
  users?: UserValue[];
  /** All cards in the board — needed by the links field's picker. */
  allCards?: Card[];
  /** All links in the board — needed by the links field. */
  allLinks?: Link[];
  onSave: (patch: Partial<Card>) => void;
  onCancel: () => void;
  /** Direct API for comments / files / links so we don't have to reconcile
   *  via a single `patch` (which would lose individual operation semantics). */
  onAddComment?: (cardId: Id, text: string) => void;
  onUpdateComment?: (cardId: Id, commentId: Id, text: string) => void;
  onDeleteComment?: (cardId: Id, commentId: Id) => void;
  onAddAttachment?: (cardId: Id, attachment: Attachment) => void;
  onRemoveAttachment?: (cardId: Id, attachmentId: Id) => void;
  onAddLink?: (link: Omit<Link, 'id'>) => void;
  onRemoveLink?: (linkId: Id) => void;
}

const DEFAULT_FIELDS: EditorField[] = [
  { type: 'text', key: 'label', label: 'Title' },
  { type: 'textarea', key: 'description', label: 'Description' },
  { type: 'progress', key: 'progress', label: 'Progress' },
  { type: 'date', key: 'startDate', label: 'Start date' },
  { type: 'date', key: 'endDate', label: 'End date' },
];

/**
 * Routes the editor based on `config`:
 *  - function → custom render-prop (Mode 2)
 *  - null / false → editor disabled (Mode 3)
 *  - object / undefined → built-in popup / modal / sidebar (Mode 1)
 */
export function KanbanEditor({
  card,
  isNew,
  locale,
  config,
  fields = DEFAULT_FIELDS,
  currentUser,
  users,
  allCards,
  allLinks,
  onSave,
  onCancel,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onAddAttachment,
  onRemoveAttachment,
  onAddLink,
  onRemoveLink,
}: KanbanEditorProps) {
  const [draft, setDraft] = useState<Card | null>(card);

  useEffect(() => {
    setDraft(card);
  }, [card]);

  const update = useCallback((patch: Partial<Card>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const save = useCallback(() => {
    if (!draft || !card) return;
    const patch: Partial<Card> = {};
    for (const key of Object.keys(draft) as Array<keyof Card>) {
      if (draft[key] !== card[key]) {
        (patch as Record<string, unknown>)[key as string] = draft[key];
      }
    }
    onSave(patch);
  }, [draft, card, onSave]);

  const renderCtx: EditorRenderContext = useMemo(
    () => ({
      card: draft,
      isOpen: card !== null,
      isNew,
      close: onCancel,
      cancel: onCancel,
      save,
      update,
    }),
    [draft, isNew, card, onCancel, save, update]
  );

  // Editor disabled
  if (config === null || config === false) return null;
  // No card to edit
  if (!card || !draft) return null;

  // Custom render-prop
  if (typeof config === 'function') {
    const result = config(renderCtx);
    return (result ?? null) as React.ReactElement | null;
  }

  // Built-in placement
  const placement = config?.placement ?? 'popup';
  const editorContent = (
    <EditorContent
      draft={draft}
      fields={fields}
      locale={locale}
      onChange={update}
      currentUser={currentUser}
      users={users}
      allCards={allCards}
      allLinks={allLinks}
      onAddComment={onAddComment}
      onUpdateComment={onUpdateComment}
      onDeleteComment={onDeleteComment}
      onAddAttachment={onAddAttachment}
      onRemoveAttachment={onRemoveAttachment}
      onAddLink={onAddLink}
      onRemoveLink={onRemoveLink}
    />
  );

  if (placement === 'sidebar') {
    return (
      <EditorSidebar
        title={draft.label || locale.editor.title}
        onClose={onCancel}
        onSave={save}
        config={config ?? undefined}
        locale={locale}
      >
        {editorContent}
      </EditorSidebar>
    );
  }
  if (placement === 'modal') {
    return (
      <EditorModal
        title={draft.label || locale.editor.title}
        onClose={onCancel}
        onSave={save}
        config={config ?? undefined}
        locale={locale}
      >
        {editorContent}
      </EditorModal>
    );
  }
  return (
    <EditorPopup
      title={draft.label || locale.editor.title}
      onClose={onCancel}
      onSave={save}
      config={config ?? undefined}
      locale={locale}
    >
      {editorContent}
    </EditorPopup>
  );
}

interface EditorContentProps {
  draft: Card;
  fields: EditorField[];
  locale: AwesomeKanbanLocale;
  onChange: (patch: Partial<Card>) => void;
  currentUser?: Id;
  users?: UserValue[];
  allCards?: Card[];
  allLinks?: Link[];
  onAddComment?: (cardId: Id, text: string) => void;
  onUpdateComment?: (cardId: Id, commentId: Id, text: string) => void;
  onDeleteComment?: (cardId: Id, commentId: Id) => void;
  onAddAttachment?: (cardId: Id, attachment: Attachment) => void;
  onRemoveAttachment?: (cardId: Id, attachmentId: Id) => void;
  onAddLink?: (link: Omit<Link, 'id'>) => void;
  onRemoveLink?: (linkId: Id) => void;
}

function EditorContent({
  draft,
  fields,
  locale,
  onChange,
  currentUser,
  users,
  allCards,
  allLinks,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
  onAddAttachment,
  onRemoveAttachment,
  onAddLink,
  onRemoveLink,
}: EditorContentProps) {
  return (
    <>
      {fields.map((field) => {
        const value = (draft as Record<string, unknown>)[field.key];
        const id = `ak-editor-${String(field.key)}`;

        switch (field.type) {
          case 'text':
            return (
              <TextField
                key={field.key}
                id={id}
                label={field.label}
                value={(value as string) ?? ''}
                onChange={(v) =>
                  onChange({ [field.key]: v } as Partial<Card>)
                }
              />
            );
          case 'textarea':
            return (
              <TextField
                key={field.key}
                id={id}
                label={field.label}
                value={(value as string) ?? ''}
                onChange={(v) =>
                  onChange({ [field.key]: v } as Partial<Card>)
                }
                multiline
                rows={4}
              />
            );
          case 'select':
            return (
              <SelectField
                key={field.key}
                id={id}
                label={field.label}
                value={value as string | number | undefined}
                options={(field.values ?? []).map((v) => ({
                  id: v.id,
                  label: v.label,
                }))}
                onChange={(v) =>
                  onChange({ [field.key]: v } as Partial<Card>)
                }
              />
            );
          case 'date':
            return (
              <DateField
                key={field.key}
                id={id}
                label={field.label}
                value={value as Date | string | undefined}
                onChange={(v) =>
                  onChange({ [field.key]: v } as Partial<Card>)
                }
              />
            );
          case 'progress':
            return (
              <ProgressField
                key={field.key}
                id={id}
                label={field.label}
                value={value as number | undefined}
                onChange={(v) =>
                  onChange({ [field.key]: v } as Partial<Card>)
                }
              />
            );
          case 'comments':
            return (
              <CommentsField
                key={field.key}
                card={draft}
                currentUser={currentUser}
                users={users}
                onAdd={(text) => onAddComment?.(draft.id, text)}
                onUpdate={(commentId, text) =>
                  onUpdateComment?.(draft.id, commentId, text)
                }
                onDelete={(commentId) => onDeleteComment?.(draft.id, commentId)}
              />
            );
          case 'files':
            return (
              <FilesField
                key={field.key}
                card={draft}
                uploadURL={field.uploadURL}
                onAdd={(att) => onAddAttachment?.(draft.id, att)}
                onRemove={(attId) => onRemoveAttachment?.(draft.id, attId)}
              />
            );
          case 'links':
            return (
              <LinksField
                key={field.key}
                card={draft}
                allCards={allCards ?? []}
                links={allLinks ?? []}
                onAdd={(link) => onAddLink?.(link)}
                onRemove={(linkId) => onRemoveLink?.(linkId)}
              />
            );
          case 'custom':
            if (field.render) {
              return (
                <div key={field.key} className="ak-editor__field">
                  <span className="ak-editor__label">{field.label}</span>
                  {field.render({
                    card: draft,
                    value,
                    setValue: (v) =>
                      onChange({ [field.key]: v } as Partial<Card>),
                  }) as React.ReactNode}
                </div>
              );
            }
            return null;
          default:
            // multiselect / combo / dateRange / color — fall through to a
            // labeled placeholder. Apps that need these can pass `type:'custom'`
            // with their own render until the lib ships them.
            return (
              <div key={field.key} className="ak-editor__field">
                <span className="ak-editor__label">{field.label}</span>
                <span style={{ color: 'var(--ak-text-faint)', fontSize: 11 }}>
                  ({field.type} field — use type:'custom' for now)
                </span>
              </div>
            );
        }
      })}
      <span style={{ display: 'none' }}>{locale.editor.title}</span>
    </>
  );
}
