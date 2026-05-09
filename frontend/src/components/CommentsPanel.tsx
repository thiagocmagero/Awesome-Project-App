import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useIsPlatformAdmin } from '../hooks/useIsPlatformAdmin';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { avatarColorFor, initialsOf } from '../lib/avatars';
import { sanitizeCommentHtml } from '../lib/sanitize';
import { useTimezone } from '../contexts/TimezoneContext';
import { formatMoment, formatDate } from '../lib/dateFormatting';
import { useResolvedDateFormat } from '../contexts/ProjectDateFormatContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentAuthor {
  publicId: string;
  name: string;
}

interface ReactionGroup {
  emoji: string;
  users: { publicId: string; name: string }[];
}

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

interface Mentionable {
  publicId: string;
  name: string;
}

interface CommentsPanelProps {
  projectId: string;       // publicId do projecto
  entityType: 'TASK' | 'PROJECT';
  entityPublicId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initials = initialsOf;
const avatarColor = avatarColorFor;

type TFn = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Comment.createdAt é MOMENTO REAL — fallback absoluto (>30 dias) usa a tz
 * activa (project tz quando dentro de PlanningPage). A diferença em ms é
 * tz-agnostic. Ver docs/claude/timezone.md.
 */
function relativeTime(iso: string, t: TFn, tz: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('comments.time.just_now');
  if (m < 60) return t('comments.time.mins_ago', { count: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('comments.time.hours_ago', { count: h });
  const d = Math.floor(h / 24);
  if (d < 30) return t('comments.time.days_ago', { count: d });
  return formatMoment(iso, tz);
}

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢'];

/** Strips publicIds from mention tokens: `@[Name](id)` → `@[Name]` */
function stripMentionIds(content: string): string {
  return content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@[$1]');
}

/** Extrai publicIds das menções usando o map name→publicId */
function extractMentionIdsFromMap(content: string, map: Map<string, string>): string[] {
  const matches = [...content.matchAll(/@\[([^\]]+)\]/g)];
  return matches
    .map((m) => map.get(m[1]))
    .filter((id): id is string => id !== undefined);
}

/** UTC midnight de uma data (idempotente entre horas locais e tz). */
function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Agrupa comentários por dia em buckets ordenados ("Hoje" → "Ontem" → datas). */
function groupCommentsByDay(
  comments: CommentItem[],
  t: TFn,
  dateFormat: string,
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
    else                                               label = formatDate(dayUtc, dateFormat);
    if (!buckets.has(key)) {
      buckets.set(key, { label, items: [], sortKey: dayUtc.getTime() });
    }
    buckets.get(key)!.items.push(c);
  }
  // Ordem: ascending (mais antigo primeiro), igual ao display flat anterior.
  return Array.from(buckets.entries())
    .sort(([, a], [, b]) => a.sortKey - b.sortKey)
    .map(([key, value]) => ({ key, label: value.label, items: value.items }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommentsPanel({ projectId, entityType, entityPublicId }: CommentsPanelProps) {
  const { token, user } = useAuth();
  const api = getApiBase();
  const isAdmin = useIsPlatformAdmin();
  const { showToast } = useToast();
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const tz = useTimezone();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Mention autocomplete
  const [mentionables, setMentionables] = useState<Mentionable[]>([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  // Maps name → publicId for mention resolution (no publicId stored in textarea text)
  const newMentionsMapRef = useRef<Map<string, string>>(new Map());
  const editMentionsMapRef = useRef<Map<string, string>>(new Map());

  // ── Fetch comments ─────────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiFetch(
        `${api}/projects/${projectId}/comments?entityType=${entityType}&entityPublicId=${entityPublicId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        setComments(await res.json());
      } else {
        console.error('[CommentsPanel] GET /comments falhou:', res.status, await res.text().catch(() => ''));
      }
    } catch (err) {
      console.error('[CommentsPanel] Excepção ao carregar comentários:', err);
    } finally {
      setLoading(false);
    }
  }, [token, api, projectId, entityType, entityPublicId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // ── Fetch mentionables ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    apiFetch(`${api}/projects/${projectId}/comments/mentionables`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.ok ? r.json() : []).then(setMentionables).catch(() => {});
  }, [token, api, projectId]);

  // ── Submit new comment ─────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !token) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const mentionedUserPublicIds = extractMentionIdsFromMap(content, newMentionsMapRef.current);
      const res = await apiFetch(`${api}/projects/${projectId}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, entityType, entityPublicId, mentionedUserPublicIds }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [...prev, newComment]);
        setContent('');
        newMentionsMapRef.current.clear();
      } else {
        let errMsg = t('comments.error_status', { status: res.status });
        try {
          const errBody = await res.json();
          errMsg = Array.isArray(errBody.message)
            ? errBody.message.join(' · ')
            : (errBody.message ?? errMsg);
        } catch { /* body não é JSON */ }
        console.error('[CommentsPanel] POST /comments falhou:', res.status, errMsg);
        setSubmitError(errMsg);
        showToast('danger', errMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : tc('errors.generic');
      console.error('[CommentsPanel] Excepção ao submeter comentário:', err);
      setSubmitError(msg);
      showToast('danger', msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Edit comment ───────────────────────────────────────────────────────────

  async function handleEditSubmit(commentPublicId: string) {
    if (!editContent.trim() || !token) return;
    try {
      const mentionedUserPublicIds = extractMentionIdsFromMap(editContent, editMentionsMapRef.current);
      const res = await apiFetch(`${api}/projects/${projectId}/comments/${commentPublicId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editContent, mentionedUserPublicIds }),
      });
      if (res.ok) {
        const updated = await res.json();
        setComments((prev) => prev.map((c) => c.publicId === commentPublicId ? updated : c));
        setEditingId(null);
      }
    } catch {/* silent */}
  }

  // ── Delete comment ─────────────────────────────────────────────────────────

  async function handleDelete(commentPublicId: string) {
    if (!token || !window.confirm(t('comments.confirm_delete'))) return;
    const res = await apiFetch(`${api}/projects/${projectId}/comments/${commentPublicId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 204) {
      setComments((prev) => prev.filter((c) => c.publicId !== commentPublicId));
    }
  }

  // ── Toggle reaction ────────────────────────────────────────────────────────

  async function handleReaction(commentPublicId: string, emoji: string) {
    if (!token) return;
    const res = await apiFetch(`${api}/projects/${projectId}/comments/${commentPublicId}/reactions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const data = await res.json();
      setComments((prev) =>
        prev.map((c) => c.publicId === commentPublicId ? { ...c, reactions: data.reactions } : c),
      );
    }
  }

  // ── @mention autocomplete ──────────────────────────────────────────────────

  function handleTextareaKeyUp(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    setVal: (v: string) => void,
    val: string,
  ) {
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

  // ── Cmd/Ctrl+Enter shortcut ───────────────────────────────────────────────

  function handleComposerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (content.trim() && !submitting) {
        // Submit form via handleSubmit; cast to FormEvent (preventDefault inside).
        handleSubmit(e as unknown as React.FormEvent);
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  // Hook do dateFormat só quando há comentários — hook deve correr sempre,
  // por isso mantemos a chamada incondicional.
  const dateFormat = useResolvedDateFormat();
  const groups = useMemo(
    () => groupCommentsByDay(comments, t as TFn, dateFormat),
    [comments, t, dateFormat],
  );

  return (
    <div className="comments-panel">

      <div className="comments-section-header">
        <i className="ri-chat-3-line" aria-hidden="true" />
        {t('comments.section_label')}
        {comments.length > 0 && <span className="tab-count">{comments.length}</span>}
      </div>

      {/* Composer FIXO no topo */}
      <form onSubmit={handleSubmit} className="comment-composer">
        <span
          className="avatar avatar-md"
          style={{ background: avatarColor(user?.publicId ?? user?.name ?? '') }}
          aria-hidden="true"
        >
          {initials(user?.name ?? 'U')}
        </span>
        <div className="composer-body" style={{ position: 'relative' }}>
          <textarea
            ref={textareaRef}
            className="composer-textarea"
            placeholder={t('comments.placeholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyUp={(e) => handleTextareaKeyUp(e, setContent, content)}
            onKeyDown={handleComposerKeyDown}
          />
          {showMentionDropdown && filteredMentionables.length > 0 && (
            <MentionDropdown
              items={filteredMentionables}
              anchor={textareaRef.current}
              onSelect={(m) => insertMention(m, content, setContent, textareaRef.current, newMentionsMapRef)}
            />
          )}
          <div className="composer-toolbar">
            <button type="button" className="composer-tool" title="Bold" tabIndex={-1}>
              <i className="ri-bold" aria-hidden="true" />
            </button>
            <button type="button" className="composer-tool" title="Italic" tabIndex={-1}>
              <i className="ri-italic" aria-hidden="true" />
            </button>
            <button type="button" className="composer-tool" title="List" tabIndex={-1}>
              <i className="ri-list-unordered" aria-hidden="true" />
            </button>
            <button type="button" className="composer-tool" title="Attach" tabIndex={-1}>
              <i className="ri-attachment-2" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="composer-tool"
              title="Mention"
              tabIndex={-1}
              onClick={() => {
                const ta = textareaRef.current;
                if (!ta) return;
                const pos = ta.selectionStart ?? content.length;
                const prefix = pos > 0 && content[pos - 1] !== ' ' && pos !== 0 ? ' @' : '@';
                setContent(content.slice(0, pos) + prefix + content.slice(pos));
                setTimeout(() => {
                  ta.focus();
                  const newPos = pos + prefix.length;
                  ta.setSelectionRange(newPos, newPos);
                }, 0);
              }}
            >
              <i className="ri-at-line" aria-hidden="true" />
            </button>
            <button type="button" className="composer-tool" title="Emoji" tabIndex={-1}>
              <i className="ri-emotion-line" aria-hidden="true" />
            </button>
            <span className="composer-spacer" />
            <span className="kbd-hint">{t('comments.shortcut_send')}</span>
            <button
              type="submit"
              className="btn btn-purple btn-sm"
              disabled={!content.trim() || submitting}
            >
              {submitting ? (
                <i className="ri-loader-4-line" />
              ) : (
                <><i className="ri-send-plane-fill me-1" aria-hidden="true" />{t('comments.btn_submit')}</>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Inline submit error */}
      {submitError && (
        <div className="alert alert-danger py-2 mb-2 fs-13">
          <i className="ri-error-warning-line me-1" aria-hidden="true" />{submitError}
        </div>
      )}

      {/* Comment list — agrupada por dia */}
      {loading ? (
        <div className="text-center py-4 text-muted">
          <i className="ri-loader-4-line fs-20" />
        </div>
      ) : comments.length === 0 ? (
        <div className="comments-empty-state">
          <i className="ri-chat-3-line" aria-hidden="true" />
          <p className="mb-0 fs-13">{t('comments.empty')}</p>
        </div>
      ) : (
        <>
          {groups.map((group) => (
            <div key={group.key}>
              <div className="comments-day-divider">{group.label}</div>
              {group.items.map((comment) => (
                <article key={comment.publicId} className="comment-card">
                  <span
                    className="avatar avatar-md"
                    style={{ background: avatarColor(comment.author.publicId ?? comment.author.name) }}
                    aria-hidden="true"
                  >
                    {initials(comment.author.name)}
                  </span>
                  <div className="comment-card-body">
                    <div className="comment-card-head">
                      <span className="comment-card-name">{comment.author.name}</span>
                      <span className="comment-card-time">{relativeTime(comment.createdAt, t as TFn, tz)}</span>
                      {comment.editedAt && (
                        <span className="comment-card-time">· {t('comments.edited')}</span>
                      )}
                      {(isAdmin || comment.author.publicId === user?.publicId) && (
                        <div className="comment-card-actions">
                          <button
                            type="button"
                            className="btn btn-xs p-0 text-muted"
                            style={{ background: 'none', border: 'none', lineHeight: 1 }}
                            title={tc('actions.edit')}
                            onClick={() => {
                              setEditingId(comment.publicId);
                              setEditContent(stripMentionIds(comment.content));
                              editMentionsMapRef.current = new Map(
                                comment.mentions.map((m) => [m.name, m.publicId]),
                              );
                            }}
                          >
                            <i className="ri-pencil-line fs-13" />
                          </button>
                          <button
                            type="button"
                            className="btn btn-xs p-0 text-danger"
                            style={{ background: 'none', border: 'none', lineHeight: 1 }}
                            title={tc('actions.delete')}
                            onClick={() => handleDelete(comment.publicId)}
                          >
                            <i className="ri-delete-bin-line fs-13" />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingId === comment.publicId ? (
                      <div className="position-relative">
                        <textarea
                          ref={editTextareaRef}
                          className="form-control form-control-sm mb-1"
                          rows={2}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyUp={(e) => handleTextareaKeyUp(e, setEditContent, editContent)}
                        />
                        {showMentionDropdown && filteredMentionables.length > 0 && (
                          <MentionDropdown
                            items={filteredMentionables}
                            anchor={editTextareaRef.current}
                            onSelect={(m) => insertMention(m, editContent, setEditContent, editTextareaRef.current, editMentionsMapRef)}
                          />
                        )}
                        <div className="d-flex gap-1">
                          <button
                            type="button"
                            className="btn btn-purple btn-sm py-0 px-2 fs-12"
                            onClick={() => handleEditSubmit(comment.publicId)}
                          >
                            {tc('actions.save')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-light btn-sm py-0 px-2 fs-12"
                            onClick={() => setEditingId(null)}
                          >
                            {tc('actions.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="comment-card-content"
                        dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(comment.content) }}
                      />
                    )}

                    {/* Reactions */}
                    <div className="reactions-row">
                      {comment.reactions.map((rg) => {
                        const userReacted = rg.users.some((u) => u.publicId === (user?.publicId ?? ''));
                        const tooltipNames = rg.users.map((u) => u.name).join(', ');
                        return (
                          <button
                            key={rg.emoji}
                            type="button"
                            className={`reaction-chip${userReacted ? ' is-mine' : ''}`}
                            onClick={() => handleReaction(comment.publicId, rg.emoji)}
                            title={tooltipNames}
                          >
                            {rg.emoji} {rg.users.length}
                          </button>
                        );
                      })}
                      <div className="dropdown">
                        <button
                          type="button"
                          className="reaction-chip"
                          data-bs-toggle="dropdown"
                          title={t('comments.add_reaction')}
                        >
                          <i className="ri-emotion-line" aria-hidden="true" />
                        </button>
                        <div className="dropdown-menu p-2" style={{ minWidth: 'auto' }}>
                          <div className="d-flex gap-1">
                            {ALLOWED_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                className="btn btn-xs p-1 fs-16"
                                style={{ background: 'none', border: 'none' }}
                                onClick={() => handleReaction(comment.publicId, emoji)}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── MentionDropdown ──────────────────────────────────────────────────────────
//
// Renderizado via portal (document.body) com `position: fixed` ancorado à
// textarea: escapa qualquer overflow:hidden ancestor (modal-body, .comments-panel)
// e fica visível mesmo quando a textarea está no topo do scroll container e
// não há comentários acima.
//
// Heurística de placement: se houver pouco espaço acima (<200px) → abre em
// baixo; senão abre acima da textarea (UX antiga preservada quando há comentários).

const DROPDOWN_MAX_HEIGHT = 180;

function MentionDropdown({
  items,
  anchor,
  onSelect,
}: {
  items: Mentionable[];
  anchor: HTMLTextAreaElement | null;
  onSelect: (m: Mentionable) => void;
}) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!anchor) { setPos(null); return; }
    const update = () => {
      const r = anchor.getBoundingClientRect();
      const placeBelow = r.top < DROPDOWN_MAX_HEIGHT + 24;
      setPos({
        left: r.left,
        top: placeBelow ? r.bottom + 4 : r.top - DROPDOWN_MAX_HEIGHT - 4,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [anchor]);

  if (!pos) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        zIndex: 9999,
        background: '#fff',
        border: '1px solid #dee2e6',
        borderRadius: 4,
        boxShadow: '0 2px 8px rgba(0,0,0,.15)',
        maxHeight: DROPDOWN_MAX_HEIGHT,
        overflowY: 'auto',
        minWidth: 200,
      }}
    >
      {items.slice(0, 8).map((m) => (
        <button
          key={m.publicId}
          type="button"
          className="dropdown-item d-flex align-items-center gap-2 py-1 px-2 fs-13"
          onMouseDown={(e) => { e.preventDefault(); onSelect(m); }}
        >
          <span
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: avatarColor(m.name), color: '#fff',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600, flexShrink: 0,
            }}
          >
            {initials(m.name)}
          </span>
          {m.name}
        </button>
      ))}
    </div>,
    // Target o elemento fullscreen quando activo — caso contrário document.body
    // fica fora do fullscreen e o portal não é visível.
    document.fullscreenElement ?? document.body,
  );
}
