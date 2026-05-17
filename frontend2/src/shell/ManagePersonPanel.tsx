import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useWorkspaceUserTypes } from '../hooks/useWorkspaceUserTypes';
import { useMemberProjects, type ProjectRole } from '../hooks/useMemberProjects';
import type { AccessLevel, WorkspaceMember } from '../hooks/useWorkspaceMembers';
import { avatarColorFor, initialsOf } from '../lib/avatars';
import { formatDate } from '../lib/dateFormatting';
import '../styles/people.css';

interface Props {
  member: WorkspaceMember;
  onClose: () => void;
  onUpdate: (
    publicId: string,
    payload: { memberType?: AccessLevel; userTypePublicId?: string | null },
  ) => Promise<WorkspaceMember>;
  onRemove: (publicId: string) => Promise<void>;
  onAfterProjectsSave?: () => Promise<void> | void;
}

/** "Gerenciar pessoa" — drawer offcanvas direito.
 *  Port literal de `NewTemplate/views-people.jsx:ManageUserDrawer`, com
 *  classes `.pp-drawer / .pp-section / .pp-projlist / .pp-invite-card`.
 *  O save acumula mudanças em workspace member + projectos numa única acção. */
export function ManagePersonPanel({ member, onClose, onUpdate, onRemove, onAfterProjectsSave }: Props) {
  const { t: tw } = useTranslation('workspace_members');
  const { t: tc } = useTranslation('common');
  const { showToast } = useToast();
  const { types: userTypes } = useWorkspaceUserTypes();
  const { projects, save: saveProjects } = useMemberProjects(member.publicId);

  const [memberType, setMemberType] = useState<AccessLevel>(member.memberType);
  const [userTypePublicId, setUserTypePublicId] = useState<string>(member.userType?.publicId ?? '');
  const [projectSel, setProjectSel] = useState<Record<string, ProjectRole>>({});
  const [initialised, setInitialised] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialise project state from server data
  useEffect(() => {
    if (initialised || projects.length === 0) return;
    const init: Record<string, ProjectRole> = {};
    for (const p of projects) {
      if (p.assigned && p.role) init[p.publicId] = p.role;
    }
    setProjectSel(init);
    setInitialised(true);
  }, [projects, initialised]);

  // Reset when member changes
  useEffect(() => {
    setMemberType(member.memberType);
    setUserTypePublicId(member.userType?.publicId ?? '');
    setProjectSel({});
    setInitialised(false);
    setError(null);
  }, [member.publicId, member.memberType, member.userType?.publicId]);

  // ESC closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const assignedCount = Object.keys(projectSel).length;
  const totalProjects = projects.length;
  const isPending = member.status !== 'ACCEPTED';
  const displayName = member.user?.name ?? member.name ?? member.email;
  const color = avatarColorFor(member.user?.publicId ?? member.publicId);

  function toggleProj(publicId: string) {
    setProjectSel((prev) => {
      const next = { ...prev };
      if (next[publicId]) delete next[publicId];
      else next[publicId] = 'CONTRIBUTOR';
      return next;
    });
  }
  function setProjRole(publicId: string, role: ProjectRole) {
    setProjectSel((prev) => ({ ...prev, [publicId]: role }));
  }

  const memberChanged = memberType !== member.memberType
    || (userTypePublicId || null) !== (member.userType?.publicId ?? null);

  const projectsChanged = useMemo(() => {
    const currentAssigned = new Map(projects.filter((p) => p.assigned).map((p) => [p.publicId, p.role]));
    if (currentAssigned.size !== Object.keys(projectSel).length) return true;
    for (const [pid, role] of Object.entries(projectSel)) {
      if (currentAssigned.get(pid) !== role) return true;
    }
    return false;
  }, [projects, projectSel]);

  const canSave = (memberChanged || projectsChanged) && !saving;

  async function handleSave() {
    if (!canSave) return;
    setError(null);
    setSaving(true);
    try {
      if (memberChanged) {
        await onUpdate(member.publicId, {
          memberType,
          userTypePublicId: userTypePublicId || null,
        });
      }
      if (projectsChanged && !isPending) {
        const assignments = Object.entries(projectSel).map(([projectPublicId, role]) => ({ projectPublicId, role }));
        await saveProjects(assignments);
        await onAfterProjectsSave?.();
        showToast('success', tw('toast.projects_saved'));
      } else if (memberChanged) {
        showToast('success', tw('toast.member_updated'));
      }
      onClose();
    } catch (err) {
      const e = err as { status?: number; body?: { error_code?: string; used?: number; total?: number }; message?: string };
      const code = e.body?.error_code ?? e.message;
      let msg: string;
      if (code === 'SEAT_LIMIT_REACHED') {
        msg = tw('error.seat_limit', { used: e.body?.used ?? 0, total: e.body?.total ?? 0 });
      } else if (code === 'USER_TYPE_NOT_FOUND') {
        msg = tw('error.user_type_not_found');
      } else if (code === 'MEMBER_NOT_REGISTERED') {
        msg = tw('info.projects_pending_accept');
      } else if (e.status === 403) {
        msg = tc('errors.forbidden');
      } else {
        msg = e.message || tc('errors.generic');
      }
      setError(msg);
      showToast('danger', msg);
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (saving) return;
    if (!window.confirm(tw('confirm.remove.text', { name: displayName }))) return;
    setSaving(true);
    try {
      await onRemove(member.publicId);
      showToast('success', tw('toast.member_removed', { name: displayName }));
    } catch (err) {
      const msg = (err as Error).message || tc('errors.generic');
      setError(msg);
      showToast('danger', msg);
      setSaving(false);
    }
  }

  const selectedType = userTypes.find((u) => u.publicId === userTypePublicId);

  return (
    <>
      <div className="pp-backdrop" onClick={onClose} />
      <aside className="pp-drawer" role="dialog" aria-label={tw('manage.section_title')}>
        {/* Header */}
        <div className="dh">
          <div className="tt">{tw('manage.section_title')}</div>
          <button type="button" className="close" onClick={onClose} aria-label={tc('actions.close')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="db">
          {/* User block */}
          <div className="pp-userblock">
            <div className="avatar" style={{ background: color }}>
              {initialsOf(displayName)}
            </div>
            <div>
              <div className="nm">{displayName}</div>
              <div className="em">{member.email}</div>
            </div>
          </div>

          {/* Access level */}
          <div className="pp-section">
            <div className="slabel">{tw('manage.platform_access_label')}</div>
            <div className="pp-seg" role="tablist">
              <button
                type="button"
                className={'opt' + (memberType === 'BASIC' ? ' active' : '')}
                onClick={() => setMemberType('BASIC')}
                disabled={saving}
              >{tw('access.basic')}</button>
              <button
                type="button"
                className={'opt' + (memberType === 'LICENSED' ? ' active' : '')}
                onClick={() => setMemberType('LICENSED')}
                disabled={saving}
              >{tw('access.licensed')}</button>
            </div>
            <div className="shint">
              {memberType === 'BASIC' ? tw('access.basic_hint') : tw('access.licensed_hint')}
            </div>
          </div>

          {/* Member type */}
          <div className="pp-section">
            <div className="slabel">{tw('manage.user_type_label')}</div>
            <div className="pp-type-select">
              <span
                className="pp-type-sw"
                style={{
                  background: selectedType ? avatarColorFor(selectedType.code) : 'transparent',
                  borderColor: selectedType ? 'transparent' : 'var(--line)',
                }}
              />
              <select
                value={userTypePublicId}
                disabled={saving}
                onChange={(e) => setUserTypePublicId(e.target.value)}
              >
                <option value="">{tw('manage.user_type_none')}</option>
                {userTypes.map((t) => (
                  <option key={t.publicId} value={t.publicId}>
                    {t.label}  ·  {t.code}
                  </option>
                ))}
              </select>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="pp-type-chev">
                <path d="M1 3l4 4 4-4" />
              </svg>
            </div>
            <div className="shint">{tw('manage.user_type_hint')}</div>
          </div>

          {/* Projects */}
          <div className="pp-section">
            <div className="slabel">
              <span>{tw('manage.projects_label')}</span>
              <span style={{
                marginLeft: 'auto', fontSize: 11, color: 'var(--dim)',
                fontWeight: 500, textTransform: 'none', letterSpacing: 0,
              }}>
                {tw('manage.projects_count', { assigned: assignedCount, total: totalProjects })}
              </span>
            </div>
            {isPending && (
              <div className="pp-invite-card" style={{ marginBottom: 10 }}>
                <div className="body">
                  <div className="ls">{tw('info.projects_pending_accept')}</div>
                </div>
              </div>
            )}
            <div className="pp-projlist">
              {projects.map((p) => {
                const checked = !!projectSel[p.publicId];
                const role = projectSel[p.publicId] ?? 'CONTRIBUTOR';
                const color = avatarColorFor(p.publicId);
                return (
                  <div
                    key={p.publicId}
                    className={'pp-projrow' + (checked ? ' checked' : '')}
                    onClick={() => !isPending && !saving && toggleProj(p.publicId)}
                    style={isPending ? { cursor: 'not-allowed', opacity: 0.6 } : undefined}
                  >
                    <span className={'pcheck' + (checked ? ' on' : '')}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <span className="pdot" style={{ background: color }} />
                    <span className="pn">{p.name}</span>
                    <select
                      className="pp-select"
                      value={role}
                      disabled={!checked || isPending || saving}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setProjRole(p.publicId, e.target.value as ProjectRole)}
                    >
                      <option value="READER">{tw('role.reader')}</option>
                      <option value="CONTRIBUTOR">{tw('role.contributor')}</option>
                      <option value="OWNER">{tw('role.owner')}</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Invite card */}
          <div className="pp-section">
            <div className="slabel">{tw('manage.invite_section')}</div>
            <div className="pp-invite-card">
              <div className="icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className="body">
                <div className="lt">
                  {member.status === 'INVITED' && tw('manage.invite_status_invited', { date: formatDate(member.createdAt) })}
                  {member.status === 'ACCEPTED' && tw('manage.invite_status_accepted', { date: formatDate(member.acceptedAt ?? member.createdAt) })}
                  {member.status === 'DECLINED' && tw('manage.invite_status_declined', { date: formatDate(member.declinedAt ?? member.createdAt) })}
                </div>
                <div className="ls">{member.email}</div>
              </div>
              {isPending && (
                <button type="button" className="resend">{tw('btn.resend_invite')}</button>
              )}
            </div>
          </div>

          {error && <div className="pp-error-msg" role="alert">{error}</div>}
        </div>

        {/* Footer */}
        <div className="df">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="pp-btn-primary"
              onClick={() => void handleSave()}
              disabled={!canSave}
              style={{ height: 36, flex: 1, justifyContent: 'center' }}
            >
              {saving ? tc('messages.processing') : tw('manage.btn_save')}
            </button>
          </div>
          <div style={{ marginTop: 10 }}>
            <button type="button" className="pp-btn-danger" onClick={() => void handleRemove()} disabled={saving}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
              {tw('manage.btn_remove')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
