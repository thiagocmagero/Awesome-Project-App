import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { avatarColorFor, initialsOf } from '../lib/avatars';
import { sanitizeCommentHtml } from '../lib/sanitize';
import { useTimezone } from '../contexts/TimezoneContext';
import { formatMoment } from '../lib/dateFormatting';

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommentsPanel({ projectId, entityType, entityPublicId }: CommentsPanelProps) {
  const { token, user } = useAuth();
  const api = getApiBase();
  const isAdmin = user?.profileCode === 'PLATFORM_ADMIN';
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="comments-panel" style={{ fontFamily: 'inherit' }}>

      {/* Comment list */}
      {loading ? (
        <div className="text-center py-4 text-muted">
          <i className="ri-loader-4-line fs-20" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-4 text-muted">
          <i className="ri-chat-3-line fs-24" />
          <p className="mt-2 mb-0 fs-13">{t('comments.empty')}</p>
        </div>
      ) : (
        <ul className="list-unstyled mb-3" style={{ maxHeight: 380, overflowY: 'auto' }}>
          {comments.map((comment) => (
            <li key={comment.publicId} className="mb-3">
              <div className="d-flex align-items-start gap-2">
                {/* Avatar */}
                <span
                  className="avatar avatar-sm avatar-rounded flex-shrink-0"
                  style={{
                    background: avatarColor(comment.author.name),
                    color: '#fff',
                    width: 32, height: 32,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, borderRadius: '50%',
                  }}
                >
                  {initials(comment.author.name)}
                </span>

                <div className="flex-grow-1">
                  {/* Header */}
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <span className="fw-semibold fs-13">{comment.author.name}</span>
                    <span className="text-muted fs-11">{relativeTime(comment.createdAt, t as TFn, tz)}</span>
                    {comment.editedAt && (
                      <span className="text-muted fs-11">({t('comments.edited')})</span>
                    )}
                    {/* Actions */}
                    {(isAdmin || comment.author.publicId === user?.publicId) && (
                      <div className="ms-auto d-flex gap-1">
                        <button
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

                  {/* Content or Edit Form */}
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
                          className="btn btn-primary btn-xs py-0 px-2 fs-12"
                          onClick={() => handleEditSubmit(comment.publicId)}
                        >
                          {tc('actions.save')}
                        </button>
                        <button
                          className="btn btn-light btn-xs py-0 px-2 fs-12"
                          onClick={() => setEditingId(null)}
                        >
                          {tc('actions.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="fs-13 comment-content"
                      style={{ lineHeight: 1.5, wordBreak: 'break-word' }}
                      dangerouslySetInnerHTML={{ __html: sanitizeCommentHtml(comment.content) }}
                    />
                  )}

                  {/* Reactions */}
                  <div className="d-flex align-items-center gap-1 mt-1 flex-wrap">
                    {comment.reactions.map((rg) => {
                      const userReacted = rg.users.some((u) => u.publicId === (user?.publicId ?? ''));
                      const tooltipNames = rg.users.map((u) => u.name).join(', ');
                      return (
                        <button
                          key={rg.emoji}
                          className="btn btn-xs py-0 px-1 fs-12"
                          style={{
                            background: userReacted ? '#e8e4ff' : '#f8f9fa',
                            border: `1px solid ${userReacted ? '#735adb' : '#dee2e6'}`,
                            color: userReacted ? '#735adb' : '#6c757d',
                            lineHeight: '1.4',
                          }}
                          onClick={() => handleReaction(comment.publicId, rg.emoji)}
                          title={tooltipNames}
                        >
                          {rg.emoji} {rg.users.length}
                        </button>
                      );
                    })}
                    {/* Add reaction picker */}
                    <div className="dropdown">
                      <button
                        className="btn btn-xs py-0 px-1 fs-12 text-muted"
                        style={{ background: '#f8f9fa', border: '1px solid #dee2e6' }}
                        data-bs-toggle="dropdown"
                        title={t('comments.add_reaction')}
                      >
                        <i className="ri-emotion-line" />
                      </button>
                      <div className="dropdown-menu p-2" style={{ minWidth: 'auto' }}>
                        <div className="d-flex gap-1">
                          {ALLOWED_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
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
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Inline submit error */}
      {submitError && (
        <div className="alert alert-danger py-2 mb-2 fs-13">
          <i className="ri-error-warning-line me-1" />{submitError}
        </div>
      )}

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="position-relative">
        <div className="d-flex align-items-start gap-2">
          <span
            className="avatar avatar-sm avatar-rounded flex-shrink-0 mt-1"
            style={{
              background: avatarColor(user?.name ?? ''),
              color: '#fff',
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, borderRadius: '50%',
            }}
          >
            {initials(user?.name ?? 'U')}
          </span>
          <div className="flex-grow-1 position-relative">
            <textarea
              ref={textareaRef}
              className="form-control form-control-sm"
              rows={2}
              placeholder={t('comments.placeholder')}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyUp={(e) => handleTextareaKeyUp(e, setContent, content)}
              style={{ resize: 'vertical' }}
            />
            {showMentionDropdown && filteredMentionables.length > 0 && (
              <MentionDropdown
                items={filteredMentionables}
                anchor={textareaRef.current}
                onSelect={(m) => insertMention(m, content, setContent, textareaRef.current, newMentionsMapRef)}
              />
            )}
          </div>
        </div>
        <div className="d-flex justify-content-end mt-1">
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={!content.trim() || submitting}
          >
            {submitting ? (
              <i className="ri-loader-4-line" />
            ) : (
              <><i className="ri-send-plane-line me-1" />{t('comments.btn_submit')}</>
            )}
          </button>
        </div>
      </form>
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
