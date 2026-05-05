import { useState, useEffect, useRef, useMemo, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

declare const Choices: new (el: HTMLElement, opts?: object) => { destroy(): void };

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMemberItem {
  publicId: string;
  isLead: boolean;
  role: string | null;
  createdAt: string;
  user: {
    publicId: string;
    name: string;
    email: string;
    status: string;
    profile: { code: string; label: string };
    userType: { code: string; label: string } | null;
  };
}

interface TeamItem {
  publicId: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  members: TeamMemberItem[];
}

interface UserOption {
  publicId: string;
  name: string;
  email: string;
  status: string;
  profile: { code: string; label: string };
  userType: { code: string; label: string } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_TEAM_FORM = { name: '', description: '', status: 'ACTIVE' };
const EMPTY_MEMBER_FORM = { userId: '', isLead: false };

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t: tc } = useTranslation('common');
  if (status === 'ACTIVE') return <span className="badge bg-success-transparent text-success">{tc('status.active')}</span>;
  if (status === 'INACTIVE') return <span className="badge bg-warning-transparent text-warning">{tc('status.inactive')}</span>;
  return <span className="badge bg-secondary-transparent text-secondary">{status}</span>;
}

function Initials({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const letters = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      className={`avatar avatar-${size} avatar-rounded bg-primary text-white d-flex align-items-center justify-content-center fw-semibold flex-shrink-0`}
      style={{ fontSize: size === 'sm' ? '11px' : '13px' }}
    >
      {letters}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const { token, user: authUser } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('teams');
  const { t: tc } = useTranslation('common');

  // Data
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Create / Edit team modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamItem | null>(null);
  const [teamForm, setTeamForm] = useState({ ...EMPTY_TEAM_FORM });
  const [teamFormError, setTeamFormError] = useState('');
  const [teamFormLoading, setTeamFormLoading] = useState(false);

  // Deactivate modal
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivatingTeam, setDeactivatingTeam] = useState<TeamItem | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Members modal (per-team management)
  const [showMembers, setShowMembers] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamItem | null>(null);
  const [memberForm, setMemberForm] = useState({ ...EMPTY_MEMBER_FORM });
  const [memberFormError, setMemberFormError] = useState('');
  const [memberFormLoading, setMemberFormLoading] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);

  // Choices.js ref for member user select
  const choicesMemberUserRef = useRef<HTMLSelectElement>(null);

  // Add-member-to-team modal (page-level)
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState('');
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberIsLead, setAddMemberIsLead] = useState(false);
  const [addMemberError, setAddMemberError] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  // ── Auth header ──────────────────────────────────────────────────────────────

  function h() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  // ── Load data ────────────────────────────────────────────────────────────────

  function loadData() {
    setLoading(true);
    Promise.all([
      apiFetch(`${api}/teams`, { headers: h() }).then(r => r.json()),
      apiFetch(`${api}/users`, { headers: h() }).then(r => r.json()),
    ])
      .then(([t, u]) => {
        setTeams(Array.isArray(t) ? t : []);
        setAllUsers(Array.isArray(u) ? u : []);
        setPageError('');
      })
      .catch(() => setPageError(tc('errors.generic')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when any modal is open
  const anyModalOpen = showTeamModal || showDeactivate || showMembers || showAddMember;
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [anyModalOpen]);

  // ── Team CRUD ────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingTeam(null);
    setTeamForm({ ...EMPTY_TEAM_FORM });
    setTeamFormError('');
    setShowTeamModal(true);
  }

  function openEdit(team: TeamItem) {
    setEditingTeam(team);
    setTeamForm({ name: team.name, description: team.description ?? '', status: team.status });
    setTeamFormError('');
    setShowTeamModal(true);
  }

  async function handleTeamSubmit(e: FormEvent) {
    e.preventDefault();
    setTeamFormError('');
    setTeamFormLoading(true);
    try {
      const body: Record<string, unknown> = { name: teamForm.name, description: teamForm.description || undefined };
      if (editingTeam) body.status = teamForm.status;

      const url = editingTeam ? `${api}/teams/${editingTeam.publicId}` : `${api}/teams`;
      const method = editingTeam ? 'PATCH' : 'POST';
      const res = await apiFetch(url, { method, headers: h(), body: JSON.stringify(body) });
      const data = await res.json() as { message?: string | string[] } & Partial<TeamItem>;

      if (!res.ok) {
        const msg = data.message;
        setTeamFormError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? tc('errors.generic')));
        return;
      }

      const saved = data as TeamItem;
      if (editingTeam) {
        setTeams(prev => prev.map(team => team.publicId === saved.publicId ? saved : team));
        showToast('success', t('success.updated'));
      } else {
        setTeams(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
        showToast('success', t('success.created'));
      }
      setShowTeamModal(false);
    } catch {
      setTeamFormError(tc('errors.generic'));
    } finally {
      setTeamFormLoading(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivatingTeam) return;
    setDeactivateLoading(true);
    try {
      const res = await apiFetch(`${api}/teams/${deactivatingTeam.publicId}`, { method: 'DELETE', headers: h() });
      if (res.ok) {
        const data = await res.json() as TeamItem;
        setTeams(prev => prev.map(team => team.publicId === data.publicId ? data : team));
        setShowDeactivate(false);
        showToast('success', t('success.deleted'));
      }
    } catch { /* ignore */ }
    finally { setDeactivateLoading(false); }
  }

  // ── Members modal ────────────────────────────────────────────────────────────

  function openMembers(team: TeamItem) {
    setSelectedTeam(team);
    setMemberForm({ ...EMPTY_MEMBER_FORM });
    setMemberFormError('');
    setShowMembers(true);
  }

  /** Update selectedTeam and the corresponding entry in teams[] */
  function applyTeamUpdate(updated: TeamItem) {
    setSelectedTeam(updated);
    setTeams(prev => prev.map(team => team.publicId === updated.publicId ? updated : team));
  }

  async function handleAddMember(e: FormEvent) {
    e.preventDefault();
    if (!selectedTeam || !memberForm.userId) return;
    setMemberFormError('');
    setMemberFormLoading(true);
    try {
      const res = await apiFetch(`${api}/teams/${selectedTeam.publicId}/members`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify({ userId: memberForm.userId, isLead: memberForm.isLead }),
      });
      const data = await res.json() as { message?: string | string[] } & Partial<TeamItem>;
      if (!res.ok) {
        const msg = data.message;
        setMemberFormError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? tc('errors.generic')));
        return;
      }
      applyTeamUpdate(data as TeamItem);
      setMemberForm({ ...EMPTY_MEMBER_FORM });
      showToast('success', t('success.member_added'));
    } catch {
      setMemberFormError(tc('errors.generic'));
    } finally {
      setMemberFormLoading(false);
    }
  }

  async function handleToggleLead(member: TeamMemberItem) {
    if (!selectedTeam) return;
    setMemberActionLoading(member.user.publicId);
    try {
      const res = await apiFetch(`${api}/teams/${selectedTeam.publicId}/members/${member.user.publicId}`, {
        method: 'PATCH',
        headers: h(),
        body: JSON.stringify({ isLead: !member.isLead }),
      });
      if (res.ok) {
        const data = await res.json() as TeamItem;
        applyTeamUpdate(data);
        showToast('info', t('success.lead_updated'));
      }
    } catch { /* ignore */ }
    finally { setMemberActionLoading(null); }
  }

  async function handleRemoveMember(member: TeamMemberItem) {
    if (!selectedTeam) return;
    setMemberActionLoading(member.user.publicId);
    try {
      const res = await apiFetch(`${api}/teams/${selectedTeam.publicId}/members/${member.user.publicId}`, {
        method: 'DELETE',
        headers: h(),
      });
      if (res.ok) {
        const data = await res.json() as TeamItem;
        applyTeamUpdate(data);
        showToast('success', t('success.member_removed'));
      }
    } catch { /* ignore */ }
    finally { setMemberActionLoading(null); }
  }

  function openAddMember() {
    setAddMemberTeamId('');
    setAddMemberUserId('');
    setAddMemberIsLead(false);
    setAddMemberError('');
    setShowAddMember(true);
  }

  async function handleAddMemberSubmit(e: FormEvent) {
    e.preventDefault();
    if (!addMemberTeamId || !addMemberUserId) return;
    setAddMemberError('');
    setAddMemberLoading(true);
    try {
      const res = await apiFetch(`${api}/teams/${addMemberTeamId}/members`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify({ userId: addMemberUserId, isLead: addMemberIsLead }),
      });
      const data = await res.json() as { message?: string | string[] } & Partial<TeamItem>;
      if (!res.ok) {
        const msg = data.message;
        setAddMemberError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? tc('errors.generic')));
        return;
      }
      // Update the team in the list
      const updated = data as TeamItem;
      setTeams(prev => prev.map(team => team.publicId === updated.publicId ? updated : team));
      setShowAddMember(false);
      showToast('success', t('success.member_added'));
    } catch {
      setAddMemberError(tc('errors.generic'));
    } finally {
      setAddMemberLoading(false);
    }
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const activeCount = teams.filter(team => team.status === 'ACTIVE').length;
  const totalMembers = teams.reduce((acc, team) => acc + team.members.length, 0);

  const availableUsers = useMemo(() => allUsers.filter(u =>
    u.status !== 'ARCHIVED' &&
    !selectedTeam?.members.some(m => m.user.publicId === u.publicId)
  ), [allUsers, selectedTeam]);

  // ── Choices.js (add-member user select) ──────────────────────────────────
  useEffect(() => {
    if (!showMembers || typeof Choices === 'undefined') return;
    if (!choicesMemberUserRef.current) return;
    const select = choicesMemberUserRef.current;
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = t('member.user_label');
    select.appendChild(emptyOpt);
    availableUsers.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.publicId;
      opt.textContent = `${u.name}${u.userType ? ` — ${u.userType.label}` : ''}${u.status === 'INACTIVE' ? ` (${tc('status.inactive')})` : ''}`;
      select.appendChild(opt);
    });
    const c = new Choices(select, {
      searchEnabled: true, itemSelectText: '', shouldSort: false,
      searchPlaceholderValue: t('search.placeholder'), allowHTML: false,
    });
    const handleChange = () => {
      setMemberForm(f => ({ ...f, userId: select.value }));
    };
    select.addEventListener('change', handleChange);
    return () => {
      select.removeEventListener('change', handleChange);
      c.destroy();
      while (select.firstChild) select.removeChild(select.firstChild);
    };
  }, [showMembers, availableUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Users available for the page-level "add member" modal — always include current user
  const allUsersWithSelf = (() => {
    const base = [...allUsers.filter(u => u.status !== 'ARCHIVED')];
    if (authUser && !base.some(u => u.publicId === authUser.publicId)) {
      base.unshift({
        publicId: authUser.publicId,
        name: authUser.name,
        email: authUser.email,
        status: 'ACTIVE',
        profile: { code: authUser.profileCode, label: authUser.profileLabel },
        userType: authUser.userTypeCode
          ? { code: authUser.userTypeCode, label: authUser.userTypeLabel ?? '' }
          : null,
      });
    }
    return base;
  })();

  // For the selected team in the add-member modal, exclude already-members
  const selectedAddTeam = teams.find(team => team.publicId === addMemberTeamId) ?? null;
  const addMemberAvailableUsers = allUsersWithSelf.filter(
    u => !selectedAddTeam?.members.some(m => m.user.publicId === u.publicId)
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page Header */}
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{t('page.title')}</h1>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><a href="/dashboard" className="text-primary">{tc('nav.dashboard')}</a></li>
              <li className="breadcrumb-item active">{t('page.title')}</li>
            </ol>
          </nav>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-secondary d-flex align-items-center gap-2"
            onClick={openAddMember}
            disabled={teams.filter(team => team.status === 'ACTIVE').length === 0}
          >
            <i className="ri-user-add-line fs-16"></i>
            {t('btn.add_member')}
          </button>
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
            <i className="ri-team-line fs-16"></i>
            {t('btn.add_team')}
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="row g-3 mb-4">
        {[
          { icon: 'ri-team-line', color: 'primary', value: teams.length, label: t('stats.total') },
          { icon: 'ri-checkbox-circle-line', color: 'success', value: activeCount, label: t('stats.active') },
          { icon: 'ri-group-line', color: 'info', value: totalMembers, label: t('stats.members_total') },
        ].map(s => (
          <div className="col-auto" key={s.label}>
            <div className="card custom-card mb-0">
              <div className="card-body py-2 px-3 d-flex align-items-center gap-2">
                <i className={`${s.icon} text-${s.color} fs-18`}></i>
                <span className={`fw-semibold text-${s.color}`}>{s.value}</span>
                <span className="text-muted fs-13">{s.label}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pageError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <i className="ri-error-warning-line fs-18"></i>{pageError}
        </div>
      )}

      {/* Teams table */}
      <div className="card custom-card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="card-title mb-0">
            <i className="ri-team-line me-2 text-primary"></i>
            {t('page.title')}
          </h6>
          <button className="btn btn-sm btn-light" onClick={loadData}>
            <i className="ri-refresh-line"></i>
          </button>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4" style={{ width: '50px' }}>#</th>
                    <th>{t('table.name')}</th>
                    <th>{t('form.description')}</th>
                    <th style={{ width: '100px' }}>{t('table.members')}</th>
                    <th>{t('badge.lead')}</th>
                    <th>{t('table.status')}</th>
                    <th style={{ width: '120px' }}>{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-5">
                        <i className="ri-inbox-line fs-24 d-block mb-2"></i>
                        {t('search.empty')}
                      </td>
                    </tr>
                  ) : teams.map(team => {
                    const lead = team.members.find(m => m.isLead);
                    return (
                      <tr key={team.publicId}>
                        <td className="ps-4 text-muted fs-13">#{team.publicId.substring(0, 8)}</td>
                        <td className="fw-medium">{team.name}</td>
                        <td className="text-muted fs-13">{team.description || <span className="text-muted">—</span>}</td>
                        <td>
                          <span className="badge bg-info-transparent text-info">
                            <i className="ri-group-line me-1"></i>{team.members.length}
                          </span>
                        </td>
                        <td>
                          {lead ? (
                            <div className="d-flex align-items-center gap-2">
                              <Initials name={lead.user.name} />
                              <span className="fs-13 fw-medium">{lead.user.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted fs-13">—</span>
                          )}
                        </td>
                        <td><StatusBadge status={team.status} /></td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            <button
                              className="btn btn-sm btn-info-light"
                              title={t('modal.members_title')}
                              onClick={() => openMembers(team)}
                            >
                              <i className="ri-group-line"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-primary-light"
                              title={tc('actions.edit')}
                              onClick={() => openEdit(team)}
                            >
                              <i className="ri-pencil-line"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-danger-light"
                              title={t('modal.confirm_deactivate_title')}
                              onClick={() => { setDeactivatingTeam(team); setShowDeactivate(true); }}
                              disabled={team.status === 'INACTIVE'}
                            >
                              <i className="ri-forbid-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Team Modal ─────────────────────────────────────────── */}
      {showTeamModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className={`${editingTeam ? 'ri-pencil-line' : 'ri-team-line'} me-2 text-primary`}></i>
                    {editingTeam ? t('modal.edit_title') : t('modal.create_title')}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowTeamModal(false)} aria-label={tc('actions.close')}></button>
                </div>
                <form onSubmit={handleTeamSubmit} noValidate>
                  <div className="modal-body">
                    {teamFormError && (
                      <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
                        <i className="ri-error-warning-line flex-shrink-0"></i>
                        <span>{teamFormError}</span>
                      </div>
                    )}
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('form.name')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={teamForm.name}
                          onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))}
                          required
                          placeholder={t('form.name_placeholder')}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">{t('form.description')}</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={teamForm.description}
                          onChange={e => setTeamForm(f => ({ ...f, description: e.target.value }))}
                          placeholder={t('form.description_placeholder')}
                        />
                      </div>
                      {editingTeam && (
                        <div className="col-12">
                          <label className="form-label fw-medium">{t('form.status')}</label>
                          <select
                            className="form-select"
                            value={teamForm.status}
                            onChange={e => setTeamForm(f => ({ ...f, status: e.target.value }))}
                          >
                            <option value="ACTIVE">{tc('status.active')}</option>
                            <option value="INACTIVE">{tc('status.inactive')}</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={() => setShowTeamModal(false)}>{tc('actions.cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={teamFormLoading}>
                      {teamFormLoading
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>...</>
                        : <><i className="ri-save-line me-2"></i>{tc('actions.save')}</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Deactivate Confirmation Modal ────────────────────────────────────── */}
      {showDeactivate && deactivatingTeam && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className="ri-forbid-line me-2 text-warning"></i>
                    {t('modal.confirm_deactivate_title')}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowDeactivate(false)} aria-label={tc('actions.close')}></button>
                </div>
                <div className="modal-body">
                  <p className="mb-1">
                    {t('modal.confirm_deactivate_text')} <strong>{deactivatingTeam.name}</strong>?
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowDeactivate(false)}>{tc('actions.cancel')}</button>
                  <button type="button" className="btn btn-warning" onClick={handleDeactivate} disabled={deactivateLoading}>
                    {deactivateLoading
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>...</>
                      : <><i className="ri-forbid-line me-2"></i>{t('modal.confirm_deactivate_confirm')}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Members Modal ────────────────────────────────────────────────────── */}
      {showMembers && selectedTeam && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">

                {/* Header */}
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-semibold mb-0">
                      <i className="ri-group-line me-2 text-primary"></i>
                      {t('modal.members_title')} — {selectedTeam.name}
                    </h5>
                    <small className="text-muted">{selectedTeam.members.length} {t('table.members').toLowerCase()}</small>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowMembers(false)} aria-label={tc('actions.close')}></button>
                </div>

                <div className="modal-body">

                  {/* Current members list */}
                  {selectedTeam.members.length === 0 ? (
                    <div className="text-center text-muted py-4">
                      <i className="ri-group-line fs-32 d-block mb-2 opacity-25"></i>
                      <p className="mb-0">{t('member.no_members')}</p>
                    </div>
                  ) : (
                    <div className="table-responsive mb-4">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>{t('member.user_label')}</th>
                            <th>{t('form.description')}</th>
                            <th style={{ width: '120px' }}>{t('badge.lead')}</th>
                            <th style={{ width: '100px' }}>{t('table.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedTeam.members.map(m => (
                            <tr key={m.publicId}>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <Initials name={m.user.name} />
                                  <div>
                                    <div className="fw-medium fs-14">{m.user.name}</div>
                                    <div className="text-muted fs-12">{m.user.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                {m.user.userType
                                  ? <span className="badge bg-info-transparent text-info">{m.user.userType.label}</span>
                                  : <span className="text-muted fs-13">—</span>}
                              </td>
                              <td>
                                {m.isLead ? (
                                  <span className="badge bg-warning-transparent text-warning">
                                    <i className="ri-star-line me-1"></i>{t('badge.lead')}
                                  </span>
                                ) : (
                                  <span className="badge bg-light text-muted">{t('member.is_lead_label')}</span>
                                )}
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-1">
                                  {/* Toggle lead */}
                                  <button
                                    className={`btn btn-sm ${m.isLead ? 'btn-warning-light' : 'btn-light'}`}
                                    title={m.isLead ? t('member.demote_lead') : t('member.promote_lead')}
                                    onClick={() => handleToggleLead(m)}
                                    disabled={memberActionLoading === m.user.publicId}
                                  >
                                    {memberActionLoading === m.user.publicId
                                      ? <span className="spinner-border spinner-border-sm"></span>
                                      : <i className="ri-star-line"></i>}
                                  </button>
                                  {/* Remove member */}
                                  <button
                                    className="btn btn-sm btn-danger-light"
                                    title={t('member.remove')}
                                    onClick={() => handleRemoveMember(m)}
                                    disabled={memberActionLoading === m.user.publicId}
                                  >
                                    <i className="ri-user-unfollow-line"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add member section */}
                  <div className="border-top pt-3">
                    <h6 className="fw-semibold mb-3">
                      <i className="ri-user-add-line me-2 text-primary"></i>
                      {t('modal.add_member_title')}
                    </h6>

                    {memberFormError && (
                      <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
                        <i className="ri-error-warning-line flex-shrink-0"></i>
                        <span>{memberFormError}</span>
                      </div>
                    )}

                    {availableUsers.length === 0 ? (
                      <p className="text-muted fs-13 mb-0">
                        <i className="ri-information-line me-1"></i>
                        {t('member.no_members')}
                      </p>
                    ) : (
                      <form onSubmit={handleAddMember} noValidate>
                        <div className="row g-2 align-items-end">
                          <div className="col">
                            <label className="form-label fw-medium fs-13">
                              {t('member.user_label')} <span className="text-danger">*</span>
                            </label>
                            <select
                              ref={choicesMemberUserRef}
                              className="form-select form-select-sm"
                            />
                          </div>
                          <div className="col-auto d-flex align-items-end pb-1">
                            <div className="form-check mb-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="isLead-check"
                                checked={memberForm.isLead}
                                onChange={e => setMemberForm(f => ({ ...f, isLead: e.target.checked }))}
                              />
                              <label className="form-check-label fs-13" htmlFor="isLead-check">
                                {t('member.is_lead_label')}
                              </label>
                            </div>
                          </div>
                          <div className="col-auto">
                            <button
                              type="submit"
                              className="btn btn-sm btn-primary"
                              disabled={memberFormLoading || !memberForm.userId}
                            >
                              {memberFormLoading
                                ? <span className="spinner-border spinner-border-sm"></span>
                                : <><i className="ri-user-add-line me-1"></i>{t('member.add_button')}</>}
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowMembers(false)}>{tc('actions.close')}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Add Member Modal (page-level) ─────────────────────────────────── */}
      {showAddMember && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className="ri-user-add-line me-2 text-primary"></i>
                    {t('modal.add_member_title')}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowAddMember(false)} aria-label={tc('actions.close')}></button>
                </div>
                <form onSubmit={handleAddMemberSubmit} noValidate>
                  <div className="modal-body">
                    {addMemberError && (
                      <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
                        <i className="ri-error-warning-line flex-shrink-0"></i>
                        <span>{addMemberError}</span>
                      </div>
                    )}
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('form.name')} <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={addMemberTeamId}
                          onChange={e => { setAddMemberTeamId(e.target.value); setAddMemberUserId(''); }}
                          required
                        >
                          <option value="">{t('search.placeholder')}</option>
                          {teams.filter(team => team.status === 'ACTIVE').map(team => (
                            <option key={team.publicId} value={team.publicId}>{team.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('member.user_label')} <span className="text-danger">*</span>
                        </label>
                        <select
                          className="form-select"
                          value={addMemberUserId}
                          onChange={e => setAddMemberUserId(e.target.value)}
                          required
                          disabled={!addMemberTeamId}
                        >
                          <option value="">
                            {addMemberTeamId ? t('member.user_label') : t('search.placeholder')}
                          </option>
                          {addMemberAvailableUsers.map(u => (
                            <option key={u.publicId} value={u.publicId}>
                              {u.name}{u.publicId === authUser?.publicId ? ' (eu)' : ''}{u.userType ? ` — ${u.userType.label}` : ''}{u.status === 'INACTIVE' ? ` (${tc('status.inactive')})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-12">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="addMemberIsLead"
                            checked={addMemberIsLead}
                            onChange={e => setAddMemberIsLead(e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="addMemberIsLead">
                            {t('member.promote_lead')}
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={() => setShowAddMember(false)}>{tc('actions.cancel')}</button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={addMemberLoading || !addMemberTeamId || !addMemberUserId}
                    >
                      {addMemberLoading
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>...</>
                        : <><i className="ri-user-add-line me-2"></i>{t('member.add_button')}</>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
