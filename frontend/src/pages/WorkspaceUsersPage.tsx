import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useBootstrapOffcanvas } from '../hooks/useBootstrapOffcanvas';
import { confirmAction } from '../lib/confirm';

type MemberType = 'BASIC' | 'LICENSED';
type MemberStatus = 'INVITED' | 'ACCEPTED' | 'DECLINED';
type ProjectRole = 'OWNER' | 'CONTRIBUTOR' | 'READER';

interface WorkspaceMemberItem {
  publicId: string;
  email: string;
  name: string | null;
  memberType: MemberType;
  status: MemberStatus;
  acceptedAt: string | null;
  declinedAt: string | null;
  createdAt: string;
  user: {
    publicId: string;
    name: string;
    email: string;
    avatarKey: string | null;
  } | null;
}

interface SeatsSummary {
  used: number;
  total: number;
  base: number;
  extraSeats: number;
  plan: { publicId: string; code: string; name: string } | null;
}

interface ProjectAssignment {
  publicId: string;
  name: string;
  assigned: boolean;
  role: ProjectRole | null;
  status: string | null;
}

const PALETTE = ['#845adf', '#23b7e5', '#26bf94', '#f5b849', '#49b6f5', '#e6533c'];
function avatarColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
function initialsOf(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export default function WorkspaceUsersPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t: tw } = useTranslation('workspace_members');
  const { t: tc } = useTranslation('common');
  const api = getApiBase();

  const [members, setMembers] = useState<WorkspaceMemberItem[]>([]);
  const [seats, setSeats] = useState<SeatsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Add user modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteType, setInviteType] = useState<MemberType>('BASIC');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  // Phase 6 — projectos do owner para o multi-select inline (estilo DevOps)
  const [ownerProjects, setOwnerProjects] = useState<Array<{ publicId: string; name: string }>>([]);
  const [inviteAssignments, setInviteAssignments] = useState<Record<string, ProjectRole>>({}); // publicId → role

  // Manage user offcanvas
  const offcanvasRef = useRef<HTMLDivElement>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [activeMember, setActiveMember] = useState<WorkspaceMemberItem | null>(null);
  const [memberProjects, setMemberProjects] = useState<ProjectAssignment[]>([]);
  const [savingProjects, setSavingProjects] = useState(false);
  const [savingType, setSavingType] = useState(false);

  useBootstrapOffcanvas(offcanvasRef, manageOpen, () => {
    setManageOpen(false);
    setActiveMember(null);
    setMemberProjects([]);
  });

  const authHeaders = (): HeadersInit => ({ Authorization: `Bearer ${token}` });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [m, s] = await Promise.all([
        apiFetch(`${api}/workspace-members`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : [])),
        apiFetch(`${api}/workspace-members/seats`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : null)),
      ]);
      setMembers(Array.isArray(m) ? m : []);
      setSeats(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadAll();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Invite ─────────────────────────────────────────────────────────────

  const openInviteModal = async () => {
    setInviteEmail('');
    setInviteName('');
    setInviteType('BASIC');
    setInviteError('');
    setInviteAssignments({});
    setShowInviteModal(true);
    // Lazy load owner's projects (uses GET /projects which is filtered to caller's accessible projects)
    if (ownerProjects.length === 0) {
      try {
        const res = await apiFetch(`${api}/projects`, { headers: authHeaders() });
        const data = res.ok ? await res.json() : [];
        // Apenas projectos onde o user é owner — backend devolve `ownerId`,
        // mas `/projects` já filtra. Aqui assumimos que o caller é owner;
        // backend posteriormente valida `setMemberProjects` e devolve 404 se não for.
        if (Array.isArray(data)) {
          setOwnerProjects(data.map((p: { publicId: string; name: string }) => ({ publicId: p.publicId, name: p.name })));
        }
      } catch {
        setOwnerProjects([]);
      }
    }
  };

  const toggleInviteProject = (publicId: string) => {
    setInviteAssignments((prev) => {
      const next = { ...prev };
      if (next[publicId]) delete next[publicId];
      else next[publicId] = 'READER';
      return next;
    });
  };
  const setInviteProjectRole = (publicId: string, role: ProjectRole) => {
    setInviteAssignments((prev) => ({ ...prev, [publicId]: role }));
  };

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setInviteLoading(true);
    try {
      const res = await apiFetch(`${api}/workspace-members`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim() || undefined,
          memberType: inviteType,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.error_code === 'SEAT_LIMIT_REACHED') {
          throw new Error(tw('error.seat_limit', { used: d.used, total: d.total }));
        }
        if (d.error_code === 'ALREADY_MEMBER') {
          throw new Error(tw('error.already_member'));
        }
        throw new Error(Array.isArray(d.message) ? d.message.join(' · ') : d.message ?? tc('errors.generic'));
      }
      const created = await res.json() as WorkspaceMemberItem;

      // Se o convidado já tem conta E foram seleccionados projectos, aplicar agora.
      // Para novos emails (sem conta), o backend rejeita com MEMBER_NOT_REGISTERED —
      // os projectos podem ser atribuídos depois via "Manage user".
      const assignments = Object.entries(inviteAssignments).map(([publicId, role]) => ({
        projectPublicId: publicId,
        role,
      }));
      if (created.user && assignments.length > 0) {
        await apiFetch(`${api}/workspace-members/${created.publicId}/projects`, {
          method: 'PATCH',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignments }),
        }).catch(() => { /* non-blocking */ });
      } else if (!created.user && assignments.length > 0) {
        showToast('info', tw('info.projects_pending_accept'));
      }

      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteType('BASIC');
      setInviteAssignments({});
      showToast('success', tw('success.invited'));
      loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : tc('errors.generic');
      setInviteError(msg);
    } finally {
      setInviteLoading(false);
    }
  };

  // ── Manage ─────────────────────────────────────────────────────────────

  const openManage = async (m: WorkspaceMemberItem) => {
    setActiveMember(m);
    setManageOpen(true);
    try {
      const res = await apiFetch(`${api}/workspace-members/${m.publicId}/projects`, { headers: authHeaders() });
      const data = res.ok ? await res.json() : [];
      setMemberProjects(Array.isArray(data) ? data : []);
    } catch {
      setMemberProjects([]);
    }
  };

  const changeMemberType = async (newType: MemberType) => {
    if (!activeMember || activeMember.memberType === newType) return;
    setSavingType(true);
    try {
      const res = await apiFetch(`${api}/workspace-members/${activeMember.publicId}`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberType: newType }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.error_code === 'SEAT_LIMIT_REACHED') {
          showToast('warning', tw('error.seat_limit', { used: d.used, total: d.total }));
        } else {
          showToast('danger', d.message ?? tc('errors.generic'));
        }
        return;
      }
      const updated = await res.json();
      setActiveMember(updated);
      setMembers((prev) => prev.map((m) => (m.publicId === updated.publicId ? updated : m)));
      // refresh seats
      apiFetch(`${api}/workspace-members/seats`, { headers: authHeaders() })
        .then((r) => r.ok ? r.json() : null)
        .then((s) => s && setSeats(s));
      showToast('success', tw('success.access_changed'));
    } finally {
      setSavingType(false);
    }
  };

  const toggleProject = (publicId: string, assigned: boolean) => {
    setMemberProjects((prev) => prev.map((p) => p.publicId === publicId ? { ...p, assigned, role: assigned ? (p.role ?? 'READER') : null } : p));
  };
  const setProjectRole = (publicId: string, role: ProjectRole) => {
    setMemberProjects((prev) => prev.map((p) => p.publicId === publicId ? { ...p, role } : p));
  };

  const saveProjects = async () => {
    if (!activeMember) return;
    setSavingProjects(true);
    try {
      const assignments = memberProjects
        .filter((p) => p.assigned && p.role)
        .map((p) => ({ projectPublicId: p.publicId, role: p.role! }));
      const res = await apiFetch(`${api}/workspace-members/${activeMember.publicId}/projects`, {
        method: 'PATCH',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast('danger', d.message ?? tc('errors.generic'));
        return;
      }
      const data = await res.json();
      setMemberProjects(Array.isArray(data) ? data : []);
      showToast('success', tw('success.projects_saved'));
    } finally {
      setSavingProjects(false);
    }
  };

  const resendInvite = async () => {
    if (!activeMember) return;
    const res = await apiFetch(`${api}/workspace-members/${activeMember.publicId}/resend-invite`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (res.ok) {
      showToast('info', tw('success.invite_resent'));
    } else {
      const d = await res.json().catch(() => ({}));
      showToast('danger', d.message ?? tc('errors.generic'));
    }
  };

  const removeMember = async () => {
    if (!activeMember) return;
    const ok = await confirmAction({
      title: tw('confirm.remove.title'),
      text: tw('confirm.remove.text', { name: activeMember.name ?? activeMember.email }),
      confirmText: tw('confirm.remove.confirm'),
      cancelText: tc('actions.cancel'),
      variant: 'danger',
    });
    if (!ok) return;
    const res = await apiFetch(`${api}/workspace-members/${activeMember.publicId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      setManageOpen(false);
      setActiveMember(null);
      showToast('success', tw('success.removed'));
      loadAll();
    } else {
      const d = await res.json().catch(() => ({}));
      showToast('danger', d.message ?? tc('errors.generic'));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{tw('page.title')}</h1>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 breadcrumb-style2">
              <li className="breadcrumb-item"><a href="/dashboard">{tc('nav.dashboard')}</a></li>
              <li className="breadcrumb-item">{tw('page.section')}</li>
              <li className="breadcrumb-item active">{tw('page.title')}</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex align-items-center gap-3">
          {seats && seats.plan && (
            <div className="text-end">
              <div className="fs-12 text-muted">{tw('seats.label')}</div>
              <div className="fw-semibold fs-14">
                {seats.used}/{seats.total === -1 ? '∞' : seats.total}
                <span className="text-muted fs-12 ms-1">· {seats.plan.name}</span>
              </div>
            </div>
          )}
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openInviteModal}>
            <i className="ri-add-line fs-16"></i>{tw('btn.add_user')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="card custom-card">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4">{tw('table.name')}</th>
                    <th>{tw('table.access_level')}</th>
                    <th>{tw('table.status')}</th>
                    <th>{tw('table.joined')}</th>
                    <th style={{ width: 90 }}>{tc('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-muted">{tw('empty')}</td></tr>
                  ) : (
                    members.map((m) => {
                      const display = m.user?.name ?? m.name ?? m.email;
                      const colorId = m.user?.publicId ?? m.email;
                      return (
                        <tr key={m.publicId}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center gap-2">
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColorFor(colorId), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600 }}>
                                {initialsOf(display)}
                              </div>
                              <div>
                                <div className="fw-medium">{display}</div>
                                <div className="text-muted fs-12">{m.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${m.memberType === 'LICENSED' ? 'bg-primary-transparent text-primary' : 'bg-secondary-transparent text-secondary'}`}>
                              {tw(`access.${m.memberType.toLowerCase()}`)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${m.status === 'ACCEPTED' ? 'bg-success-transparent text-success' : m.status === 'INVITED' ? 'bg-warning-transparent text-warning' : 'bg-danger-transparent text-danger'}`}>
                              {tw(`status.${m.status.toLowerCase()}`)}
                            </span>
                          </td>
                          <td className="text-muted fs-13">{new Date(m.createdAt).toLocaleDateString()}</td>
                          <td>
                            <button className="btn btn-sm btn-icon btn-light" onClick={() => openManage(m)} title={tw('btn.manage')}>
                              <i className="ri-more-2-fill"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <form onSubmit={handleInvite} noValidate>
                  <div className="modal-header">
                    <h5 className="modal-title">{tw('modal.invite.title')}</h5>
                    <button type="button" className="btn-close" onClick={() => setShowInviteModal(false)}></button>
                  </div>
                  <div className="modal-body">
                    {inviteError && <div className="alert alert-danger py-2 px-3 fs-13">{inviteError}</div>}
                    <div className="mb-3">
                      <label className="form-label fs-13">{tw('form.email')}</label>
                      <input type="email" className="form-control" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fs-13">{tw('form.name_optional')}</label>
                      <input type="text" className="form-control" value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fs-13">{tw('form.access_level')}</label>
                      <div className="d-flex gap-2">
                        <label className="form-check flex-1 p-2 border rounded">
                          <input type="radio" className="form-check-input me-2" checked={inviteType === 'BASIC'} onChange={() => setInviteType('BASIC')} />
                          <span className="fw-medium">{tw('access.basic')}</span>
                          <div className="text-muted fs-12">{tw('access.basic_hint')}</div>
                        </label>
                        <label className="form-check flex-1 p-2 border rounded">
                          <input type="radio" className="form-check-input me-2" checked={inviteType === 'LICENSED'} onChange={() => setInviteType('LICENSED')} />
                          <span className="fw-medium">{tw('access.licensed')}</span>
                          <div className="text-muted fs-12">{tw('access.licensed_hint')}</div>
                        </label>
                      </div>
                    </div>
                    {/* Phase 6 — selecção de projectos + roles inline (estilo DevOps "Add to projects"). */}
                    <div className="mb-2">
                      <label className="form-label fs-13">{tw('form.add_to_projects')}</label>
                      {ownerProjects.length === 0 ? (
                        <div className="text-muted fs-12 p-2 border rounded bg-light">
                          {tw('manage.no_projects')}
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-1" style={{ maxHeight: 180, overflowY: 'auto' }}>
                          {ownerProjects.map((p) => {
                            const role = inviteAssignments[p.publicId];
                            const checked = !!role;
                            return (
                              <div key={p.publicId} className="d-flex align-items-center gap-2 p-2 border rounded">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={checked}
                                  onChange={() => toggleInviteProject(p.publicId)}
                                />
                                <div className="flex-1 fs-13">{p.name}</div>
                                {checked && (
                                  <select
                                    className="form-select form-select-sm"
                                    style={{ width: 130 }}
                                    value={role}
                                    onChange={(e) => setInviteProjectRole(p.publicId, e.target.value as ProjectRole)}
                                  >
                                    <option value="READER">{tw('role.reader')}</option>
                                    <option value="CONTRIBUTOR">{tw('role.contributor')}</option>
                                    <option value="OWNER">{tw('role.owner')}</option>
                                  </select>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <small className="text-muted fs-12 d-block mt-2">
                        <i className="ri-information-line me-1"></i>
                        {tw('form.projects_hint')}
                      </small>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={() => setShowInviteModal(false)}>{tc('actions.cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={inviteLoading}>
                      {inviteLoading && <span className="spinner-border spinner-border-sm me-2"></span>}
                      {tw('btn.send_invite')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Manage user offcanvas */}
      <div ref={offcanvasRef} className="offcanvas offcanvas-end" tabIndex={-1} style={{ width: 480 }}>
        <div className="offcanvas-header">
          <h5 className="offcanvas-title">{tw('manage.title')}</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas"></button>
        </div>
        <div className="offcanvas-body">
          {activeMember && (
            <>
              <div className="mb-4 pb-3 border-bottom">
                <div className="d-flex align-items-center gap-3">
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: avatarColorFor(activeMember.user?.publicId ?? activeMember.email), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600 }}>
                    {initialsOf(activeMember.user?.name ?? activeMember.name ?? activeMember.email)}
                  </div>
                  <div>
                    <div className="fw-semibold">{activeMember.user?.name ?? activeMember.name ?? activeMember.email}</div>
                    <div className="text-muted fs-13">{activeMember.email}</div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h6 className="fs-13 fw-semibold mb-2">{tw('manage.access_level')}</h6>
                <div className="d-flex gap-2">
                  <button type="button" className={`btn flex-1 ${activeMember.memberType === 'BASIC' ? 'btn-primary' : 'btn-light'}`} disabled={savingType} onClick={() => changeMemberType('BASIC')}>
                    {tw('access.basic')}
                  </button>
                  <button type="button" className={`btn flex-1 ${activeMember.memberType === 'LICENSED' ? 'btn-primary' : 'btn-light'}`} disabled={savingType} onClick={() => changeMemberType('LICENSED')}>
                    {tw('access.licensed')}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <h6 className="fs-13 fw-semibold mb-2">{tw('manage.projects')}</h6>
                {memberProjects.length === 0 ? (
                  <div className="text-muted fs-13">{tw('manage.no_projects')}</div>
                ) : (
                  <>
                    <div className="d-flex flex-column gap-2">
                      {memberProjects.map((p) => (
                        <div key={p.publicId} className="d-flex align-items-center gap-2 p-2 border rounded">
                          <input type="checkbox" className="form-check-input" checked={p.assigned} onChange={(e) => toggleProject(p.publicId, e.target.checked)} />
                          <div className="flex-1">{p.name}</div>
                          {p.assigned && (
                            <select className="form-select form-select-sm" style={{ width: 130 }} value={p.role ?? 'READER'} onChange={(e) => setProjectRole(p.publicId, e.target.value as ProjectRole)}>
                              <option value="READER">{tw('role.reader')}</option>
                              <option value="CONTRIBUTOR">{tw('role.contributor')}</option>
                              <option value="OWNER">{tw('role.owner')}</option>
                            </select>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="btn btn-sm btn-primary mt-3" onClick={saveProjects} disabled={savingProjects}>
                      {savingProjects && <span className="spinner-border spinner-border-sm me-2"></span>}
                      {tw('btn.save_projects')}
                    </button>
                  </>
                )}
              </div>

              <div className="mb-4">
                <h6 className="fs-13 fw-semibold mb-2">{tw('manage.invite_actions')}</h6>
                {activeMember.status === 'INVITED' && (
                  <button type="button" className="btn btn-sm btn-light" onClick={resendInvite}>
                    <i className="ri-mail-send-line me-1"></i>{tw('btn.resend_invite')}
                  </button>
                )}
              </div>

              <div className="mt-auto pt-3 border-top">
                <button type="button" className="btn btn-danger-light w-100" onClick={removeMember}>
                  <i className="ri-delete-bin-line me-1"></i>{tw('btn.remove')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
