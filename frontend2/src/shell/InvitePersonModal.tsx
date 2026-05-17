import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { apiPost } from '../lib/api';
import { useWorkspaces } from '../contexts/WorkspacesContext';
import { useWorkspaceProjects } from '../contexts/ProjectsContext';
import { useWorkspaceUserTypes } from '../hooks/useWorkspaceUserTypes';
import { avatarColorFor } from '../lib/avatars';
import { T } from './tokens';

type AccessLevel = 'BASIC' | 'LICENSED';
type ProjectRole = 'CONTRIBUTOR' | 'READER';

interface InvitePayload {
  email: string;
  name?: string;
  memberType: AccessLevel;
  userTypePublicId?: string;
  projects?: { projectPublicId: string; role: ProjectRole }[];
}

interface ApiError {
  status?: number;
  message?: string;
  body?: { error_code?: string; used?: number; total?: number };
}

/** Convidar pessoa para o workspace activo.
 *
 *  Pattern visual alinhado com `NewWorkspaceModal` — inline styles + tokens
 *  `T.*`, overlay z-index 300, ESC handler com guard `!submitting`,
 *  `role="dialog"` + `aria-label`.
 *
 *  Faz UM único `POST /api/v1/workspace-members` atómico: backend cria
 *  `WorkspaceMember` + `ProjectMember` rows + dispara token único
 *  `ACCOUNT_INVITE` que cobre workspace e todos os projectos.
 */
export function InvitePersonModal({ onClose, onInvited }: {
  onClose: () => void;
  onInvited?: () => void;
}) {
  const { t: tc } = useTranslation('common');
  const { t: tw } = useTranslation('workspace_members');
  const { activeWorkspace } = useWorkspaces();
  const projects = useWorkspaceProjects(activeWorkspace?.publicId ?? null);
  const { types: userTypes } = useWorkspaceUserTypes();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [memberType, setMemberType] = useState<AccessLevel>('BASIC');
  const [userTypePublicId, setUserTypePublicId] = useState<string>('');
  const [projectSel, setProjectSel] = useState<Record<string, ProjectRole>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailOk = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const valid = emailOk && !submitting;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  function toggleProject(publicId: string) {
    setProjectSel((prev) => {
      const next = { ...prev };
      if (next[publicId]) delete next[publicId];
      else next[publicId] = 'CONTRIBUTOR';
      return next;
    });
  }

  function setProjectRole(publicId: string, role: ProjectRole) {
    setProjectSel((prev) => ({ ...prev, [publicId]: role }));
  }

  async function submit() {
    if (!valid) return;
    setError(null);
    setSubmitting(true);
    try {
      const payload: InvitePayload = {
        email: email.trim(),
        memberType,
      };
      if (name.trim()) payload.name = name.trim();
      if (userTypePublicId) payload.userTypePublicId = userTypePublicId;
      const projEntries = Object.entries(projectSel);
      if (projEntries.length > 0) {
        payload.projects = projEntries.map(([projectPublicId, role]) => ({ projectPublicId, role }));
      }
      await apiPost('/workspace-members', payload);
      onInvited?.();
      onClose();
    } catch (err) {
      const e = err as ApiError;
      const code = e.body?.error_code ?? e.message;
      if (code === 'SEAT_LIMIT_REACHED') {
        setError(tw('error.seat_limit', { used: e.body?.used ?? 0, total: e.body?.total ?? 0 }));
      } else if (code === 'ALREADY_MEMBER') {
        setError(tw('error.already_member'));
      } else if (code === 'CANNOT_INVITE_SELF') {
        setError(tw('error.cannot_invite_self'));
      } else if (code === 'USER_TYPE_NOT_FOUND') {
        setError(tw('error.user_type_not_found'));
      } else if (code === 'PROJECT_NOT_FOUND') {
        setError(tw('error.project_not_found'));
      } else if (e.status === 403) {
        setError(tc('errors.forbidden'));
      } else {
        setError(e.message || tc('errors.generic'));
      }
      setSubmitting(false);
    }
  }

  const overlayStyle: CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 300, padding: 24,
  };
  const panelStyle: CSSProperties = {
    width: 560, maxWidth: '100%', maxHeight: 'calc(100vh - 48px)',
    background: T.panel, border: `1px solid ${T.line}`,
    borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,.28)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  };
  const sectionLabel: CSSProperties = {
    display: 'block', fontSize: 12.5, fontWeight: 600,
    color: T.ink2, marginBottom: 8,
  };
  const subtle: CSSProperties = { color: T.dim, fontWeight: 400 };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={panelStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={tc('workspaces.invite_modal_title')}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '18px 22px 14px', borderBottom: `1px solid ${T.line}` }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 17, fontWeight: 600, color: T.ink }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            {tc('workspaces.invite_modal_title')}
          </span>
          <button
            onClick={onClose}
            aria-label={tc('actions.close')}
            style={{ marginLeft: 'auto', width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: 'none', background: 'transparent', color: T.dim, cursor: 'pointer' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body (scrollable) */}
        <div style={{ padding: '20px 22px 14px', overflowY: 'auto', flex: 1 }}>
          {/* Email */}
          <label style={sectionLabel}>
            {tw('form.email')}
          </label>
          <input
            type="email"
            placeholder={tc('workspaces.invite_email_placeholder')}
            value={email}
            autoFocus
            disabled={submitting}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%', padding: '10px 13px', border: `1px solid ${T.line}`, borderRadius: 9,
              background: T.panel, color: T.ink, font: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              borderColor: emailOk ? T.brand : T.line,
              boxShadow: email && emailOk ? `0 0 0 3px ${T.brandSoft}` : 'none',
              transition: 'border-color .12s, box-shadow .12s',
              marginBottom: 14,
            }}
          />

          {/* Name */}
          <label style={sectionLabel}>
            {tw('form.name_optional').replace(/\s*\(.*\)\s*$/, '')} <span style={subtle}>{tc('form.optional')}</span>
          </label>
          <input
            type="text"
            placeholder={tc('workspaces.invite_name_placeholder')}
            value={name}
            disabled={submitting}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%', padding: '10px 13px', border: `1px solid ${T.line}`, borderRadius: 9,
              background: T.panel, color: T.ink, font: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              marginBottom: 16,
            }}
          />

          {/* Access level */}
          <label style={sectionLabel}>{tw('form.access_level')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <AccessCard
              active={memberType === 'BASIC'}
              onClick={() => setMemberType('BASIC')}
              title={tw('access.basic')}
              hint={tw('access.basic_hint')}
              disabled={submitting}
            />
            <AccessCard
              active={memberType === 'LICENSED'}
              onClick={() => setMemberType('LICENSED')}
              title={tw('access.licensed')}
              hint={tw('access.licensed_hint')}
              disabled={submitting}
            />
          </div>

          {/* Member type */}
          <label style={sectionLabel}>
            {tc('workspaces.invite_member_type_label')} <span style={subtle}>{tc('form.optional')}</span>
          </label>
          <select
            value={userTypePublicId}
            disabled={submitting}
            onChange={(e) => setUserTypePublicId(e.target.value)}
            style={{
              width: '100%', padding: '10px 13px', border: `1px solid ${T.line}`, borderRadius: 9,
              background: T.panel, color: T.ink, font: 'inherit', fontSize: 14, outline: 'none', boxSizing: 'border-box',
              marginBottom: 16, cursor: 'pointer',
            }}
          >
            <option value="">{tc('workspaces.invite_member_type_none')}</option>
            {userTypes.map((t) => (
              <option key={t.publicId} value={t.publicId}>{t.label}</option>
            ))}
          </select>

          {/* Projects */}
          <label style={sectionLabel}>
            {tc('workspaces.invite_projects_label')} <span style={subtle}>{tc('form.optional')}</span>
          </label>
          <div style={{
            border: `1px solid ${T.line}`, borderRadius: 9, background: T.panel,
            maxHeight: 200, overflowY: 'auto', marginBottom: 12,
          }}>
            {projects.length === 0 ? (
              <div style={{ padding: '14px 13px', color: T.dim, fontSize: 13 }}>
                {tc('messages.no_results')}
              </div>
            ) : projects.map((p, idx) => {
              const selected = !!projectSel[p.publicId];
              const dotColor = p.color ?? avatarColorFor(p.publicId);
              return (
                <div
                  key={p.publicId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 13px',
                    borderTop: idx === 0 ? 'none' : `1px solid ${T.lineSoft}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={submitting}
                    onChange={() => toggleProject(p.publicId)}
                    style={{ cursor: submitting ? 'not-allowed' : 'pointer' }}
                  />
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13.5, color: T.ink }}>{p.name}</span>
                  <select
                    value={projectSel[p.publicId] ?? 'CONTRIBUTOR'}
                    disabled={!selected || submitting}
                    onChange={(e) => setProjectRole(p.publicId, e.target.value as ProjectRole)}
                    style={{
                      padding: '4px 8px', border: `1px solid ${T.line}`, borderRadius: 6,
                      background: T.panel, color: selected ? T.ink : T.dim,
                      font: 'inherit', fontSize: 12, outline: 'none', cursor: selected ? 'pointer' : 'not-allowed',
                    }}
                  >
                    <option value="CONTRIBUTOR">{tw('role.contributor')}</option>
                    <option value="READER">{tw('role.reader')}</option>
                  </select>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div style={{
            background: T.panel3, border: `1px solid ${T.lineSoft}`, borderRadius: 8,
            padding: '10px 12px', fontSize: 12, color: T.ink2, lineHeight: 1.45,
            display: 'flex', gap: 9, alignItems: 'flex-start',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{tc('workspaces.invite_footer_note')}</span>
          </div>

          {error && (
            <div style={{
              marginTop: 12, padding: '8px 11px',
              background: 'oklch(0.96 0.04 25)', color: 'oklch(0.50 0.18 25)',
              border: '1px solid oklch(0.85 0.10 25)', borderRadius: 8,
              fontSize: 12.5, lineHeight: 1.4,
            }} role="alert">
              {error}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 22px 18px', borderTop: `1px solid ${T.line}` }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.line}`, background: T.panel, color: T.ink, font: 'inherit', fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {tc('actions.cancel')}
          </button>
          <button
            onClick={() => void submit()}
            disabled={!valid}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: `1px solid ${valid ? T.brand : T.line}`,
              background: valid ? T.brand : T.panel3,
              color: valid ? '#fff' : T.mute,
              font: 'inherit', fontSize: 13, fontWeight: 600,
              cursor: valid ? 'pointer' : 'not-allowed', transition: 'all .12s',
              display: 'inline-flex', alignItems: 'center', gap: 7,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {submitting ? tc('messages.processing') : tc('workspaces.invite_btn')}
          </button>
        </div>
      </div>
    </div>
  );
}

function AccessCard({ active, onClick, title, hint, disabled }: {
  active: boolean;
  onClick: () => void;
  title: string;
  hint: string;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        textAlign: 'left',
        padding: '12px 13px',
        border: `1px solid ${active ? T.brand : T.line}`,
        background: active ? T.brandSoft : T.panel,
        borderRadius: 9,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', flexDirection: 'column', gap: 4,
        boxShadow: active ? `0 0 0 1px ${T.brand} inset` : 'none',
        transition: 'all .12s',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.ink, fontSize: 13.5, fontWeight: 600 }}>
        <span style={{
          width: 14, height: 14, borderRadius: '50%',
          border: `2px solid ${active ? T.brand : T.line}`,
          background: T.panel,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {active && <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.brand }} />}
        </span>
        {title}
      </span>
      <span style={{ fontSize: 11.5, color: T.dim, lineHeight: 1.4, marginLeft: 22 }}>{hint}</span>
    </button>
  );
}
