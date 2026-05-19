// CommentsPanel — port adaptado de `frontend/src/components/CommentsPanel.tsx` (regra 4).
//
// DIFF vs legacy:
//   (A) Markup reescrito para tokens `.tm-disc-head` / `.tm-composer` /
//       `.tm-comment` / `.tm-reaction` / `.tm-mention` do template canónico
//       `views-task-modal.jsx:1004-1067`. Mesma estrutura interna (avatar + body
//       com head/content/reactions) — apenas classes mudam.
//   (B) Classes Bootstrap (`avatar avatar-md`, `tab-count`, etc.) → tokens
//       próprios (`tm-comment-avatar`, `.n` dentro de `.tm-disc-head`).
//   (E) `confirm()` nativo → `confirmAction` substituído por `window.confirm`
//       inline (decisão diferida: ConfirmDialog vs SweetAlert é gate da 2.8.5).
//
// Backend wire idêntico: GET/POST/PATCH/DELETE /comments + POST reactions.
// Mentions inline (`@[Name](publicId)` ↔ `@[Name]`), sanitize via DOMPurify,
// agrupamento por dia (Hoje/Ontem/data), edit/delete, reactions 6 emojis.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiDelete, apiFetch, apiGet, apiPatch, apiPost, getApiBase } from '../../../lib/api';
import { useIsPlatformAdmin } from '../../../hooks/useIsPlatformAdmin';
import { useTimezone } from '../../../contexts/TimezoneContext';
import { useToast } from '../../../contexts/ToastContext';
import { avatarColorFor, initialsOf } from '../../../lib/avatars';
import { sanitizeCommentHtml } from '../../../lib/sanitize';
import { formatDate, formatMoment, relativeTimeInTimezone } from '../../../lib/dateFormatting';
import {
  SvgAt, SvgChat, SvgEmoji, SvgListUl, SvgPaperclip, SvgSend,
} from '../../planning/components/TaskModalIcons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentAuthor { publicId: string; name: string }
interface ReactionGroup { emoji: string; users: { publicId: string; name: string }[] }
interface CommentItem {
  publicId: string;
  content: string;
  entityType: string;
  entityPublicId: string;
  editedAt: string | null;
  createdAt: string;
  author: CommentAuthor;
  mentions: CommentAuthor[];
  reactions: ReactionGroup[];
}
interface Mentionable { publicId: string; name: string }

interface Props {
  projectPublicId: string;
  entityType: 'TASK' | 'PROJECT';
  entityPublicId: string;
  canComment: boolean;
  currentUser: { publicId: string; name: string } | null;
}

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

type TFn = (key: string, opts?: Record<string, unknown>) => string;

function extractMentionIdsFromMap(content: string, map: Map<string, string>): string[] {
  const matches = [...content.matchAll(/@\[([^\]]+)\]/g)];
  return matches.map((m) => map.get(m[1])).filter((id): id is string => id !== undefined);
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function groupCommentsByDay(
  comments: CommentItem[],
  t: TFn,
): Array<{ key: string; label: string; items: CommentItem[] }> {
  const today = startOfUtcDay(new Date());
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);

  const buckets = new Map<string, { label: string; items: CommentItem[]; sortKey: number }>();
  for (const c of comments) {
    const d = new Date(c.createdAt);
    const dayUtc = startOfUtcDay(d);
    const key = dayUtc.toISOString().slice(0, 10);
    let label: string;
    if (dayUtc.getTime() === today.getTime())          label = t('comments.group_today');
    else if (dayUtc.getTime() === yesterday.getTime()) label = t('comments.group_yesterday');
    else                                               label = formatDate(dayUtc);
    if (!buckets.has(key)) buckets.set(key, { label, items: [], sortKey: dayUtc.getTime() });
    buckets.get(key)!.items.push(c);
  }
  return Array.from(buckets.entries())
    .sort(([, a], [, b]) => a.sortKey - b.sortKey)
    .map(([k, v]) => ({ key: k, label: v.label, items: v.items }));
}

interface AvatarProps { publicId: string; name: string }
function CommentAvatar({ publicId, name }: AvatarProps) {
  return (
    <div
      className="tm-comment-avatar"
      style={{ background: avatarColorFor(publicId) }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommentsPanel({
  projectPublicId, entityType, entityPublicId, canComment, currentUser,
}: Props) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const isAdmin = useIsPlatformAdmin();
  const tz = useTimezone();
  const { showToast } = useToast();

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [openMoreMenu, setOpenMoreMenu] = useState<string | null>(null);
  const [openReactionPicker, setOpenReactionPicker] = useState<string | null>(null);

  // Mention autocomplete
  const [mentionables, setMentionables] = useState<Mentionable[]>([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const newMentionsMapRef = useRef<Map<string, string>>(new Map());
  const editMentionsMapRef = useRef<Map<string, string>>(new Map());

  const apiBase = getApiBase();

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<CommentItem[]>(
        `/projects/${projectPublicId}/comments?entityType=${entityType}&entityPublicId=${entityPublicId}`,
      );
      setComments(data);
    } catch (err) {
      console.error('[CommentsPanel] fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, [projectPublicId, entityType, entityPublicId]);

  useEffect(() => { void fetchComments(); }, [fetchComments]);

  useEffect(() => {
    apiGet<Mentionable[]>(`/projects/${projectPublicId}/comments/mentionables`)
      .then(setMentionables)
      .catch(() => {});
  }, [projectPublicId]);

  // Close dropdowns on click outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (openMoreMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('.tm-more-menu') && !target.closest('.tm-comment .head .more')) {
          setOpenMoreMenu(null);
        }
      }
      if (openReactionPicker) {
        const target = e.target as HTMLElement;
        if (!target.closest('.tm-reaction-picker') && !target.closest('.tm-reaction.add')) {
          setOpenReactionPicker(null);
        }
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openMoreMenu, openReactionPicker]);

  // ── Submit new comment ───────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !canComment) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const mentionedUserPublicIds = extractMentionIdsFromMap(content, newMentionsMapRef.current);
      const created = await apiPost<CommentItem>(`/projects/${projectPublicId}/comments`, {
        content, entityType, entityPublicId, mentionedUserPublicIds,
      });
      setComments((prev) => [...prev, created]);
      setContent('');
      newMentionsMapRef.current.clear();
    } catch (err) {
      const msg = err instanceof Error ? err.message : tc('errors.generic');
      setSubmitError(msg);
      showToast('danger', msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Edit comment ─────────────────────────────────────────────────────────
  async function handleEditSubmit(commentPublicId: string) {
    if (!editContent.trim()) return;
    try {
      const mentionedUserPublicIds = extractMentionIdsFromMap(editContent, editMentionsMapRef.current);
      const updated = await apiPatch<CommentItem>(
        `/projects/${projectPublicId}/comments/${commentPublicId}`,
        { content: editContent, mentionedUserPublicIds },
      );
      setComments((prev) => prev.map((c) => c.publicId === commentPublicId ? updated : c));
      setEditingId(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : tc('errors.generic');
      showToast('danger', msg);
    }
  }

  // ── Delete comment ───────────────────────────────────────────────────────
  async function handleDelete(commentPublicId: string) {
    if (!window.confirm(t('comments.confirm_delete'))) return;
    try {
      await apiDelete(`/projects/${projectPublicId}/comments/${commentPublicId}`);
      setComments((prev) => prev.filter((c) => c.publicId !== commentPublicId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : tc('errors.generic');
      showToast('danger', msg);
    }
  }

  // ── Toggle reaction ──────────────────────────────────────────────────────
  async function handleReaction(commentPublicId: string, emoji: string) {
    try {
      const res = await apiFetch(
        `${apiBase}/projects/${projectPublicId}/comments/${commentPublicId}/reactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComments((prev) => prev.map((c) => c.publicId === commentPublicId
        ? { ...c, reactions: data.reactions } : c));
      setOpenReactionPicker(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : tc('errors.generic');
      showToast('danger', msg);
    }
  }

  // ── @mention autocomplete ────────────────────────────────────────────────
  function handleTextareaKeyUp(e: React.KeyboardEvent<HTMLTextAreaElement>, val: string) {
    const textarea = e.currentTarget;
    const cursor = textarea.selectionStart;
    const textBefore = val.slice(0, cursor);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionSearch(atMatch[1]);
      setMentionCursorPos(cursor - atMatch[0].length);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
    }
  }

  function insertMention(
    m: Mentionable,
    val: string,
    setVal: (v: string) => void,
    textareaEl: HTMLTextAreaElement | null,
    mapRef: React.MutableRefObject<Map<string, string>>,
  ) {
    const before = val.slice(0, mentionCursorPos);
    const cursor = textareaEl?.selectionStart ?? val.length;
    const after = val.slice(cursor);
    const mention = `@[${m.name}] `;
    mapRef.current.set(m.name, m.publicId);
    setVal(before + mention + after);
    setShowMentionDropdown(false);
    setTimeout(() => {
      if (textareaEl) {
        textareaEl.focus();
        const pos = before.length + mention.length;
        textareaEl.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  const filteredMentionables = mentionables.filter((m) =>
    m.name.toLowerCase().includes(mentionSearch.toLowerCase()),
  );

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (content.trim() && !submitting) {
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const tFn = t as TFn;
  const groups = useMemo(() => groupCommentsByDay(comments, tFn), [comments, tFn]);

  return (
    <div>
      <div className="tm-disc-head">
        <SvgChat /> {t('comments.section_label')}
        <span className="n">{comments.length}</span>
      </div>

      {/* Composer */}
      {canComment && currentUser && (
        <form onSubmit={handleSubmit} className="tm-composer">
          <CommentAvatar publicId={currentUser.publicId} name={currentUser.name} />
          <div className="body" style={{ position: 'relative' }}>
            <textarea
              ref={textareaRef}
              placeholder={t('comments.placeholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyUp={(e) => handleTextareaKeyUp(e, content)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
            />
            {showMentionDropdown && filteredMentionables.length > 0 && (
              <div className="tm-tags-dropdown" style={{ top: 'auto', bottom: '100%', marginBottom: 4 }}>
                {filteredMentionables.map((m) => (
                  <button
                    key={m.publicId}
                    type="button"
                    className="tm-tags-opt"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(m, content, setContent, textareaRef.current, newMentionsMapRef);
                    }}
                  >{m.name}</button>
                ))}
              </div>
            )}
            <div className="toolbar">
              <button type="button" className="tb-btn" title="Bold" tabIndex={-1}><b>B</b></button>
              <button type="button" className="tb-btn" title="Italic" tabIndex={-1}><i>I</i></button>
              <button type="button" className="tb-btn" title="List" tabIndex={-1}><SvgListUl /></button>
              <button type="button" className="tb-btn" title="Attach" tabIndex={-1}><SvgPaperclip s={13} /></button>
              <button
                type="button"
                className="tb-btn"
                title="Mention"
                tabIndex={-1}
                onClick={() => {
                  const ta = textareaRef.current;
                  if (!ta) return;
                  const pos = ta.selectionStart ?? content.length;
                  const newContent = content.slice(0, pos) + '@' + content.slice(pos);
                  setContent(newContent);
                  setMentionSearch('');
                  setMentionCursorPos(pos);
                  setShowMentionDropdown(true);
                  setTimeout(() => {
                    ta.focus();
                    ta.setSelectionRange(pos + 1, pos + 1);
                  }, 0);
                }}
              ><SvgAt /></button>
              <button type="button" className="tb-btn" title="Emoji" tabIndex={-1}><SvgEmoji /></button>
              <div className="grow"></div>
              <span className="kbd">⌘ + Enter</span>
              <button
                type="submit"
                className={'submit' + (content.trim() ? ' live' : '')}
                disabled={!content.trim() || submitting}
              >
                <SvgSend /> {submitting ? tc('messages.processing') : t('comments.submit')}
              </button>
            </div>
            {submitError && (
              <div style={{ marginTop: 6, fontSize: 12, color: 'oklch(0.50 0.18 25)' }}>{submitError}</div>
            )}
          </div>
        </form>
      )}

      {/* Comments grouped by day */}
      {loading && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
          {tc('messages.loading')}
        </div>
      )}

      {!loading && comments.length === 0 && (
        <div className="tm-empty-block" style={{ marginTop: 14 }}>
          <div className="e-t">{t('comments.empty_title')}</div>
          <div className="e-s">{t('comments.empty_hint')}</div>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.key}>
          <div className="tm-date-sep"><span className="d">{g.label}</span></div>
          {g.items.map((c) => {
            const isOwn = currentUser?.publicId === c.author.publicId;
            const canModify = isOwn || isAdmin;
            const isEditing = editingId === c.publicId;
            return (
              <div key={c.publicId} className="tm-comment">
                <CommentAvatar publicId={c.author.publicId} name={c.author.name} />
                <div className="body" style={{ position: 'relative' }}>
                  <div className="head">
                    <span className="nm">{c.author.name}</span>
                    <span className="when" title={formatMoment(c.createdAt, tz)}>
                      {relativeTimeInTimezone(c.createdAt, tFn, tz)}
                      {c.editedAt && ` · ${t('comments.edited')}`}
                    </span>
                    {canModify && (
                      <button
                        type="button"
                        className="more"
                        onClick={() => setOpenMoreMenu((m) => m === c.publicId ? null : c.publicId)}
                      >⋯</button>
                    )}
                    {openMoreMenu === c.publicId && (
                      <div className="tm-more-menu" style={{ right: 0, top: 28 }}>
                        {isOwn && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(c.publicId);
                              setEditContent(c.content);
                              setOpenMoreMenu(null);
                            }}
                          >{tc('actions.edit')}</button>
                        )}
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            setOpenMoreMenu(null);
                            void handleDelete(c.publicId);
                          }}
                        >{tc('actions.delete')}</button>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div
                      className="content"
                      dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(c.content) }}
                    />
                  )}

                  {isEditing && (
                    <div>
                      <textarea
                        ref={editTextareaRef}
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyUp={(e) => handleTextareaKeyUp(e, editContent)}
                      />
                      <div className="edit-actions">
                        <button type="button" onClick={() => setEditingId(null)}>
                          {tc('actions.cancel')}
                        </button>
                        <button
                          type="button"
                          className="primary"
                          onClick={() => void handleEditSubmit(c.publicId)}
                        >{tc('actions.save')}</button>
                      </div>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="reactions">
                      {c.reactions.map((r) => {
                        const mine = currentUser ? r.users.some((u) => u.publicId === currentUser.publicId) : false;
                        const title = r.users.map((u) => u.name).join(', ');
                        return (
                          <button
                            key={r.emoji}
                            type="button"
                            className={'tm-reaction' + (mine ? ' mine' : '')}
                            title={title}
                            onClick={() => canComment && void handleReaction(c.publicId, r.emoji)}
                            disabled={!canComment}
                          >
                            <span>{r.emoji}</span>
                            <span className="n">{r.users.length}</span>
                          </button>
                        );
                      })}
                      {canComment && (
                        <span
                          className="tm-reaction add"
                          style={{ position: 'relative' }}
                          onClick={() => setOpenReactionPicker((p) => p === c.publicId ? null : c.publicId)}
                        >
                          <SvgEmoji s={12} />
                          {openReactionPicker === c.publicId && (
                            <div className="tm-reaction-picker" style={{ top: 32, left: 0 }}>
                              {ALLOWED_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); void handleReaction(c.publicId, emoji); }}
                                >{emoji}</button>
                              ))}
                            </div>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
