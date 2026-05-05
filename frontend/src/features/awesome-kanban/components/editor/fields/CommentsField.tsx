import { type ChangeEvent, useState } from 'react';
import type { Card, Comment, Id, UserValue } from '../../../types';
import { getAvatarColor, initials } from '../../../core/colors';

export interface CommentsFieldProps {
  card: Card;
  /** Identity of the actor — drives "edit/delete" affordances on the
   *  signed-in user's own comments and is used as `userId` when adding. */
  currentUser?: Id;
  /** Optional roster used to render names/avatars instead of raw IDs. */
  users?: UserValue[];
  onAdd: (text: string) => void;
  onUpdate: (commentId: Id, text: string) => void;
  onDelete: (commentId: Id) => void;
}

function formatDate(value: Date | string | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CommentsField({
  card,
  currentUser,
  users = [],
  onAdd,
  onUpdate,
  onDelete,
}: CommentsFieldProps) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<Id | null>(null);
  const [editingText, setEditingText] = useState('');

  const comments = card.comments ?? [];

  const userById = (id: Id): UserValue | undefined =>
    users.find((u) => u.id === id);

  const handleAdd = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft('');
  };

  const startEditing = (c: Comment) => {
    setEditingId(c.id);
    setEditingText(c.text);
  };

  const saveEdit = (id: Id) => {
    const text = editingText.trim();
    if (text) onUpdate(id, text);
    setEditingId(null);
  };

  return (
    <div className="ak-editor__field ak-editor__field--comments">
      <span className="ak-editor__label">Comments</span>

      <ul className="ak-comments">
        {comments.length === 0 && (
          <li className="ak-comments__empty">No comments yet.</li>
        )}
        {comments.map((comment) => {
          const author = userById(comment.userId);
          const palette = getAvatarColor(comment.userId);
          const bg = author?.color ?? palette.bg;
          const isOwn = currentUser !== undefined && comment.userId === currentUser;
          const isEditing = editingId === comment.id;

          return (
            <li key={comment.id} className="ak-comments__item">
              <span
                className="ak-comments__avatar"
                style={{
                  background: author?.avatar ? undefined : bg,
                  color: author?.avatar ? undefined : palette.fg,
                }}
                title={author?.label ?? String(comment.userId)}
              >
                {author?.avatar ? (
                  <img src={author.avatar} alt="" />
                ) : (
                  initials(author?.label ?? String(comment.userId))
                )}
              </span>

              <div className="ak-comments__body">
                <div className="ak-comments__meta">
                  <span className="ak-comments__author">
                    {author?.label ?? String(comment.userId)}
                  </span>
                  <span className="ak-comments__date">
                    {formatDate(comment.date)}
                    {comment.edited ? ' · edited' : ''}
                  </span>
                  {isOwn && !isEditing && (
                    <span className="ak-comments__actions">
                      <button
                        type="button"
                        className="ak-comments__action"
                        onClick={() => startEditing(comment)}
                        aria-label="Edit comment"
                      >
                        <i className="ti ti-pencil" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="ak-comments__action ak-comments__action--destructive"
                        onClick={() => onDelete(comment.id)}
                        aria-label="Delete comment"
                      >
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="ak-comments__edit">
                    <textarea
                      value={editingText}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        setEditingText(e.target.value)
                      }
                      rows={2}
                      autoFocus
                    />
                    <div className="ak-comments__edit-actions">
                      <button
                        type="button"
                        className="ak-toolbar__btn"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="ak-toolbar__btn ak-toolbar__btn--soft"
                        onClick={() => saveEdit(comment.id)}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="ak-comments__text">{comment.text}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {currentUser !== undefined && (
        <div className="ak-comments__compose">
          <textarea
            value={draft}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setDraft(e.target.value)
            }
            placeholder="Write a comment..."
            rows={2}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <button
            type="button"
            className="ak-toolbar__btn ak-toolbar__btn--soft"
            onClick={handleAdd}
            disabled={!draft.trim()}
          >
            <i className="ti ti-send" aria-hidden="true" /> Post
          </button>
        </div>
      )}
    </div>
  );
}
