import { useState, useEffect, useRef, useMemo, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { PermissionsModal } from './ProjectPermissionsPage';
import {
  formatDate as fmtDate,
  formatDateTime,
  toFlatpickrFormat,
  DATE_FORMAT_OPTIONS,
  DEFAULT_DATE_FORMAT,
  INITIAL_PROJECT_DATE_FORMAT,
} from '../lib/dateFormatting';

declare const flatpickr: (el: HTMLElement, opts?: object) => { destroy(): void };
declare const Choices: new (el: HTMLElement, opts?: object) => { destroy(): void; setChoiceByValue(v: string): void };

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserBrief {
  publicId: string;
  name: string;
  email: string;
  status: string;
  profile: { code: string; label: string };
  userType: { code: string; label: string } | null;
}

interface TeamBrief {
  publicId: string;
  name: string;
  description: string | null;
  status: string;
  _count: { members: number };
}

interface ProjectTeamItem {
  publicId: string;
  team: TeamBrief;
}

interface ProjectItem {
  publicId: string;
  name: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  priority: string | null;
  dateFormat: string | null;
  workHours: { start: number; end: number } | null;
  createdAt: string;
  updatedAt: string;
  owner: UserBrief | null;
  manager: UserBrief | null;
  teams: ProjectTeamItem[];
}

interface TeamOption {
  publicId: string;
  name: string;
  description: string | null;
  status: string;
  members: { publicId: string }[];
}

interface ProjectMember {
  publicId: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  team: { publicId: string; name: string } | null;
  user: { publicId: string; name: string; email: string; status: string } | null;
  invitedBy: { publicId: string; name: string; email: string };
}

interface HolidayBrief {
  publicId: string;
  name: string;
  description: string | null;
  status: string;
  _count: { dates: number };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_PROJECT_FORM = {
  name: '',
  description: '',
  ownerId: '',
  managerId: '',
  status: 'ACTIVE',
  startDate: '',
  endDate: '',
  priority: '',
  // INITIAL_PROJECT_DATE_FORMAT vs DEFAULT_DATE_FORMAT é o single call-site
  // que muda quando a config user-level for adicionada (passa a derivar do user).
  dateFormat: INITIAL_PROJECT_DATE_FORMAT as string,
  /**
   * Janela horária útil (24h) para tasks com `durationUnit=HOUR`. Default
   * 09:00–18:00 (preenchido como '9' / '18' na UI). Strings em vez de números
   * porque os <input type="number"> mantêm strings vazias durante edição.
   */
  workHoursStart: '9',
  workHoursEnd: '18',
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t: tc } = useTranslation('common');
  if (status === 'ACTIVE') return <span className="badge bg-success-transparent text-success rounded-pill">{tc('status.active')}</span>;
  if (status === 'INACTIVE') return <span className="badge bg-warning-transparent text-warning rounded-pill">{tc('status.inactive')}</span>;
  return <span className="badge bg-secondary-transparent text-secondary rounded-pill">{status}</span>;
}

function PriorityBadge({ priority }: { priority?: string | null }) {
  const { t } = useTranslation('projects');
  if (priority === 'HIGH') return <span className="badge bg-danger-transparent text-danger">{t('priority.high')}</span>;
  if (priority === 'MEDIUM') return <span className="badge bg-warning-transparent text-warning">{t('priority.medium')}</span>;
  if (priority === 'LOW') return <span className="badge bg-success-transparent text-success">{t('priority.low')}</span>;
  return null;
}

// Wrapper para `formatDate` do helper central — pages globais sem contexto de
// projecto caem no `DEFAULT_DATE_FORMAT`.
const formatDate = (iso: string | null | undefined): string => fmtDate(iso);


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { token, user: authUser } = useAuth();
  const navigate = useNavigate();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('projects');
  const { t: tc } = useTranslation('common');

  // Data
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserBrief[]>([]);
  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Filter
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Create / Edit project modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);
  const [projectForm, setProjectForm] = useState({ ...EMPTY_PROJECT_FORM });
  const [projectFormError, setProjectFormError] = useState('');
  const [projectFormLoading, setProjectFormLoading] = useState(false);

  // Deactivate modal
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivatingProject, setDeactivatingProject] = useState<ProjectItem | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Teams modal
  const [showTeams, setShowTeams] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const [addTeamId, setAddTeamId] = useState('');
  const [addTeamError, setAddTeamError] = useState('');
  const [addTeamLoading, setAddTeamLoading] = useState(false);
  const [removeTeamLoading, setRemoveTeamLoading] = useState<string | null>(null);

  // Calendars modal
  const [showHolidays, setShowHolidays] = useState(false);
  const [holidaysProject, setHolidaysProject] = useState<ProjectItem | null>(null);
  const [projectHolidays, setProjectHolidays] = useState<HolidayBrief[]>([]);
  const [allHolidays, setAllHolidays] = useState<HolidayBrief[]>([]);
  const [holidaysLoading, setHolidaysLoading] = useState(false);
  const [addHolidayId, setAddHolidayId] = useState('');
  const [addHolidayError, setAddHolidayError] = useState('');
  const [addHolidayLoading, setAddHolidayLoading] = useState(false);
  const [removeHolidayLoading, setRemoveHolidayLoading] = useState<string | null>(null);

  // Members modal
  const [showMembers, setShowMembers] = useState(false);
  const [membersProject, setMembersProject] = useState<ProjectItem | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('READER');
  const [inviteTeamId, setInviteTeamId] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [removeMemberLoading, setRemoveMemberLoading] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState<string | null>(null);

  // Permissions modal
  const [showPermissions, setShowPermissions] = useState(false);
  const [permissionsProject, setPermissionsProject] = useState<ProjectItem | null>(null);

  // FlatPickr refs
  const fpStartRef = useRef<HTMLInputElement>(null);
  const fpEndRef = useRef<HTMLInputElement>(null);

  // Choices.js refs
  const choicesOwnerRef = useRef<HTMLSelectElement>(null);
  const choicesManagerRef = useRef<HTMLSelectElement>(null);
  const choicesStatusRef = useRef<HTMLSelectElement>(null);
  const choicesPriorityRef = useRef<HTMLSelectElement>(null);

  // ── Auth header ──────────────────────────────────────────────────────────────

  function h() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  // ── Load data ────────────────────────────────────────────────────────────────

  function loadData() {
    setLoading(true);
    Promise.all([
      apiFetch(`${api}/projects`, { headers: h() }).then(r => r.json()),
      apiFetch(`${api}/users`, { headers: h() }).then(r => r.json()),
      apiFetch(`${api}/teams`, { headers: h() }).then(r => r.json()),
    ])
      .then(([p, u, teamsData]) => {
        setProjects(Array.isArray(p) ? p : []);
        setAllUsers(Array.isArray(u) ? u : []);
        setAllTeams(Array.isArray(teamsData) ? teamsData : []);
        setPageError('');
      })
      .catch(() => setPageError(tc('errors.generic')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const anyModalOpen = showProjectModal || showDeactivate || showTeams || showMembers || showHolidays || showPermissions;
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [anyModalOpen]);

  // ── FlatPickr (project modal) ─────────────────────────────────────────────

  useEffect(() => {
    if (!showProjectModal || typeof flatpickr === 'undefined') return;
    // Reflectir o formato escolhido na aba "Região e Idioma" no próprio FlatPickr
    // para preview imediato. Recria-se sempre que o user muda a opção.
    const opts = { dateFormat: toFlatpickrFormat(projectForm.dateFormat), allowInput: true };
    const fpStart = flatpickr(fpStartRef.current!, {
      ...opts,
      defaultDate: editingProject?.startDate ? new Date(editingProject.startDate) : (projectForm.startDate || ''),
      onChange: (dates: Date[]) =>
        setProjectForm(f => ({ ...f, startDate: dates[0] ? dates[0].toISOString() : '' })),
    });
    const fpEnd = flatpickr(fpEndRef.current!, {
      ...opts,
      defaultDate: editingProject?.endDate ? new Date(editingProject.endDate) : (projectForm.endDate || ''),
      onChange: (dates: Date[]) =>
        setProjectForm(f => ({ ...f, endDate: dates[0] ? dates[0].toISOString() : '' })),
    });
    return () => { fpStart.destroy(); fpEnd.destroy(); };
  }, [showProjectModal, projectForm.dateFormat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Choices.js (project modal) ────────────────────────────────────────────

  useEffect(() => {
    if (!showProjectModal || typeof Choices === 'undefined') return;
    const instances: Array<{ destroy(): void }> = [];
    const init = (ref: React.RefObject<HTMLSelectElement | null>, searchEnabled = false) => {
      if (!ref.current) return;
      const c = new Choices(ref.current, { searchEnabled, itemSelectText: '', shouldSort: false, allowHTML: false });
      instances.push(c);
    };
    init(choicesOwnerRef, true);
    init(choicesManagerRef, true);
    init(choicesStatusRef);
    init(choicesPriorityRef);
    return () => instances.forEach(c => c.destroy());
  }, [showProjectModal, allUsers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Project CRUD ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingProject(null);
    setProjectForm({ ...EMPTY_PROJECT_FORM });
    setProjectFormError('');
    setShowProjectModal(true);
  }

  function openEdit(p: ProjectItem) {
    setEditingProject(p);
    setProjectForm({
      name: p.name,
      description: p.description ?? '',
      ownerId: p.owner ? p.owner.publicId : '',
      managerId: p.manager ? p.manager.publicId : '',
      status: p.status,
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? '',
      priority: p.priority ?? '',
      dateFormat: p.dateFormat ?? DEFAULT_DATE_FORMAT,
      workHoursStart: String(p.workHours?.start ?? 9),
      workHoursEnd:   String(p.workHours?.end ?? 18),
    });
    setProjectFormError('');
    setShowProjectModal(true);
  }

  async function handleProjectSubmit(e: FormEvent) {
    e.preventDefault();
    setProjectFormError('');
    setProjectFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: projectForm.name,
        description: projectForm.description || undefined,
        ownerId: projectForm.ownerId || undefined,
        managerId: projectForm.managerId || undefined,
        startDate: projectForm.startDate || undefined,
        endDate: projectForm.endDate || undefined,
        priority: projectForm.priority || undefined,
        dateFormat: projectForm.dateFormat || undefined,
      };

      // workHours — só envia se valores válidos. Default 09:00–18:00 quando vazio.
      const whStart = parseInt(projectForm.workHoursStart, 10);
      const whEnd   = parseInt(projectForm.workHoursEnd, 10);
      if (
        Number.isInteger(whStart) && Number.isInteger(whEnd) &&
        whStart >= 0 && whStart <= 23 && whEnd >= 1 && whEnd <= 24 && whEnd > whStart
      ) {
        body.workHours = { start: whStart, end: whEnd };
      } else if (editingProject) {
        // PATCH com null → limpa explicitamente (cai no default 9–18 do helper backend)
        body.workHours = null;
      }

      if (editingProject) {
        body.status = projectForm.status;
        if (!projectForm.ownerId) body.ownerId = null;
        if (!projectForm.managerId) body.managerId = null;
        if (!projectForm.startDate) body.startDate = null;
        if (!projectForm.endDate) body.endDate = null;
        if (!projectForm.priority) body.priority = null;
      }

      const url = editingProject ? `${api}/projects/${editingProject.publicId}` : `${api}/projects`;
      const method = editingProject ? 'PATCH' : 'POST';
      const res = await apiFetch(url, { method, headers: h(), body: JSON.stringify(body) });
      const data = await res.json() as { message?: string | string[] } & Partial<ProjectItem>;

      if (!res.ok) {
        const msg = data.message;
        setProjectFormError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? tc('errors.generic')));
        return;
      }

      const saved = data as ProjectItem;
      if (editingProject) {
        setProjects(prev => prev.map(p => p.publicId === saved.publicId ? saved : p));
        showToast('success', t('success.updated'));
      } else {
        setProjects(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
        showToast('success', t('success.created'));
      }
      setShowProjectModal(false);
    } catch {
      setProjectFormError(tc('errors.generic'));
    } finally {
      setProjectFormLoading(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivatingProject) return;
    setDeactivateLoading(true);
    try {
      const res = await apiFetch(`${api}/projects/${deactivatingProject.publicId}`, { method: 'DELETE', headers: h() });
      if (res.ok) {
        const data = await res.json() as ProjectItem;
        setProjects(prev => prev.map(p => p.publicId === data.publicId ? data : p));
        setShowDeactivate(false);
        showToast('success', t('success.deactivated'));
      }
    } catch { /* ignore */ }
    finally { setDeactivateLoading(false); }
  }

  // ── Teams modal ──────────────────────────────────────────────────────────────

  function openTeams(p: ProjectItem) {
    setSelectedProject(p);
    setAddTeamId('');
    setAddTeamError('');
    setShowTeams(true);
  }

  function applyProjectUpdate(updated: ProjectItem) {
    setSelectedProject(updated);
    setProjects(prev => prev.map(p => p.publicId === updated.publicId ? updated : p));
  }

  async function handleAddTeam(e: FormEvent) {
    e.preventDefault();
    if (!selectedProject || !addTeamId) return;
    setAddTeamError('');
    setAddTeamLoading(true);
    try {
      const res = await apiFetch(`${api}/projects/${selectedProject.publicId}/teams`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify({ teamId: addTeamId }),
      });
      const data = await res.json() as { message?: string | string[] } & Partial<ProjectItem>;
      if (!res.ok) {
        const msg = data.message;
        setAddTeamError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? tc('errors.generic')));
        return;
      }
      applyProjectUpdate(data as ProjectItem);
      setAddTeamId('');
      showToast('success', t('success.team_added'));
    } catch {
      setAddTeamError(tc('errors.generic'));
    } finally {
      setAddTeamLoading(false);
    }
  }

  async function handleRemoveTeam(teamPublicId: string) {
    if (!selectedProject) return;
    setRemoveTeamLoading(teamPublicId);
    try {
      const res = await apiFetch(`${api}/projects/${selectedProject.publicId}/teams/${teamPublicId}`, {
        method: 'DELETE',
        headers: h(),
      });
      if (res.ok) {
        const data = await res.json() as ProjectItem;
        applyProjectUpdate(data);
        showToast('success', t('success.team_removed'));
      }
    } catch { /* ignore */ }
    finally { setRemoveTeamLoading(null); }
  }

  // ── Members modal ────────────────────────────────────────────────────────────

  async function openMembers(p: ProjectItem) {
    setMembersProject(p);
    setInviteName('');
    setInviteEmail('');
    setInviteRole('READER');
    setInviteTeamId('');
    setInviteError('');
    setShowMembers(true);
    setMembersLoading(true);
    try {
      const res = await apiFetch(`${api}/projects/${p.publicId}/members`, { headers: h() });
      if (res.ok) setMembers(await res.json() as ProjectMember[]);
    } catch { /* ignore */ }
    finally { setMembersLoading(false); }
  }

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    if (!membersProject || !inviteEmail.trim()) return;
    if (!inviteTeamId) {
      setInviteError(t('members.error.no_team'));
      return;
    }
    setInviteError('');
    setInviteLoading(true);
    try {
      const body: Record<string, string> = { email: inviteEmail.trim(), role: inviteRole, teamId: inviteTeamId };
      if (inviteName.trim()) body.name = inviteName.trim();
      const res = await apiFetch(`${api}/projects/${membersProject.publicId}/members`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify(body),
      });
      const data = await res.json() as { message?: string | string[] } & Partial<ProjectMember>;
      if (!res.ok) {
        const msg = data.message;
        setInviteError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? tc('errors.generic')));
        return;
      }
      setMembers(prev => [...prev, data as ProjectMember]);
      setInviteName('');
      setInviteEmail('');
      setInviteTeamId('');
      showToast('success', t('success.invite_sent'));
    } catch {
      setInviteError(tc('errors.generic'));
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRemoveMember(memberPublicId: string) {
    if (!membersProject) return;
    setRemoveMemberLoading(memberPublicId);
    try {
      const res = await apiFetch(`${api}/projects/${membersProject.publicId}/members/${memberPublicId}`, {
        method: 'DELETE',
        headers: h(),
      });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.publicId !== memberPublicId));
        showToast('success', t('success.member_removed'));
      }
    } catch { /* ignore */ }
    finally { setRemoveMemberLoading(null); }
  }

  async function handleResend(memberPublicId: string) {
    setResendLoading(memberPublicId);
    try {
      const res = await apiFetch(`${api}/invitations/${memberPublicId}/resend`, {
        method: 'POST',
        headers: h(),
      });
      if (res.ok) {
        const updated = await res.json() as ProjectMember;
        setMembers(prev => prev.map(m => m.publicId === updated.publicId ? updated : m));
        showToast('info', t('success.invite_resent'));
      }
    } catch { /* ignore */ }
    finally { setResendLoading(null); }
  }

  // ── Holidays modal ───────────────────────────────────────────────────────────

  async function openHolidays(p: ProjectItem) {
    setHolidaysProject(p);
    setAddHolidayId('');
    setAddHolidayError('');
    setShowHolidays(true);
    setHolidaysLoading(true);
    try {
      const [projHolRes, allHolRes] = await Promise.all([
        apiFetch(`${api}/projects/${p.publicId}/holidays`, { headers: h() }),
        apiFetch(`${api}/holidays`, { headers: h() }),
      ]);
      if (projHolRes.ok) setProjectHolidays(await projHolRes.json());
      if (allHolRes.ok) setAllHolidays(await allHolRes.json());
    } catch { /* ignore */ } finally {
      setHolidaysLoading(false);
    }
  }

  async function handleAddHoliday(e: FormEvent) {
    e.preventDefault();
    if (!holidaysProject || !addHolidayId) return;
    setAddHolidayError('');
    setAddHolidayLoading(true);
    try {
      const res = await apiFetch(`${api}/projects/${holidaysProject.publicId}/holidays`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify({ holidayId: addHolidayId }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.message;
        setAddHolidayError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? tc('errors.generic')));
        return;
      }
      setProjectHolidays(data);
      setAddHolidayId('');
      showToast('success', t('success.holiday_added'));
    } catch {
      setAddHolidayError(tc('errors.generic'));
    } finally {
      setAddHolidayLoading(false);
    }
  }

  async function handleRemoveHoliday(holidayPublicId: string) {
    if (!holidaysProject) return;
    setRemoveHolidayLoading(holidayPublicId);
    try {
      const res = await apiFetch(
        `${api}/projects/${holidaysProject.publicId}/holidays/${holidayPublicId}`,
        { method: 'DELETE', headers: h() },
      );
      if (res.ok) {
        setProjectHolidays(prev => prev.filter(ph => ph.publicId !== holidayPublicId));
        showToast('success', t('success.holiday_removed'));
      }
    } catch { /* ignore */ } finally {
      setRemoveHolidayLoading(null);
    }
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const activeCount   = projects.filter(p => p.status === 'ACTIVE').length;
  const inactiveCount = projects.filter(p => p.status === 'INACTIVE').length;

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => filterTab === 'ALL' || p.status === filterTab)
      .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [projects, filterTab, searchQuery]);

  const activeUsers = (() => {
    const base = allUsers.filter(u => u.status === 'ACTIVE');
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

  const availableTeams = allTeams.filter(team =>
    team.status === 'ACTIVE' &&
    !selectedProject?.teams.some(pt => pt.team.publicId === team.publicId)
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
      </div>

      {pageError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <i className="ri-error-warning-line fs-18"></i>{pageError}
        </div>
      )}

      {/* Filter bar */}
      <div className="card custom-card mb-4">
        <div className="card-body p-3 d-flex align-items-center gap-3 flex-wrap justify-content-between">
          {/* Filter tabs */}
          <ul className="nav nav-tabs tab-style-2 nav-justified mb-0 d-sm-flex d-block flex-grow-1">
            {([
              ['ALL', t('filter.all'), projects.length],
              ['ACTIVE', t('filter.active'), activeCount],
              ['INACTIVE', t('filter.inactive'), inactiveCount],
            ] as const).map(([tab, label, count]) => (
              <li className="nav-item" key={tab}>
                <button
                  className={`nav-link${filterTab === tab ? ' active' : ''}`}
                  onClick={() => setFilterTab(tab)}
                  type="button"
                >
                  {label}
                  <span className={`badge ms-1 ${filterTab === tab ? 'bg-primary' : 'bg-light text-default'}`}>
                    {count}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* Search */}
          <div className="d-flex align-items-center gap-2">
            <div className="input-group" style={{ width: '220px' }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={t('search.placeholder')}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && setSearchQuery(searchInput)}
              />
              <button
                className="btn btn-primary btn-sm"
                type="button"
                onClick={() => setSearchQuery(searchInput)}
              >
                <i className="ri-search-line"></i>
              </button>
              {searchQuery && (
                <button
                  className="btn btn-light btn-sm"
                  type="button"
                  onClick={() => { setSearchQuery(''); setSearchInput(''); }}
                  title={tc('actions.clear_search')}
                >
                  <i className="ri-close-line"></i>
                </button>
              )}
            </div>
            <button className="btn btn-sm btn-light" onClick={loadData} title={tc('actions.reload')}>
              <i className="ri-refresh-line"></i>
            </button>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <i className="ri-add-line me-1"></i>{t('btn.add')}
            </button>
          </div>
        </div>
      </div>

      {/* Card grid */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">{tc('loading')}</span>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="ri-folder-line fs-40 d-block mb-3 opacity-50"></i>
          <p className="mb-0 fs-15">
            {projects.length === 0
              ? t('empty.no_projects')
              : t('empty.no_match')}
          </p>
        </div>
      ) : (
        <div className="row row-cols-xxl-4 row-cols-xl-3 row-cols-md-2 row-cols-1 g-4">
          {filteredProjects.map(p => {
            const totalMembers = p.teams.reduce((acc, pt) => acc + (pt.team._count?.members ?? 0), 0);
            const displayDate = p.endDate ? formatDate(p.endDate) : formatDate(p.startDate);
            const dateLabel = p.endDate ? t('card.date_label_end') : p.startDate ? t('card.date_label_start') : null;
            return (
              <div className="col" key={p.publicId}>
                <div className="card custom-card h-100 mb-0">
                  <div className="card-body">
                    {/* Header row */}
                    <div className="d-flex align-items-start justify-content-between mb-3">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <StatusBadge status={p.status} />
                        {p.priority && <PriorityBadge priority={p.priority} />}
                      </div>
                      {/* Actions dropdown */}
                      <div className="dropdown">
                        <a
                          href="#"
                          className="btn btn-sm btn-icon btn-light"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                        >
                          <i className="ri-more-2-fill text-muted"></i>
                        </a>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li>
                            <a
                              className="dropdown-item d-flex align-items-center gap-2"
                              href="#"
                              onClick={(e) => { e.preventDefault(); navigate(`/projects/${p.publicId}/planning`); }}
                            >
                              <i className="ri-bar-chart-grouped-line text-primary"></i>
                              {t('action.planning')}
                            </a>
                          </li>
                          <li>
                            <a
                              className="dropdown-item d-flex align-items-center gap-2"
                              href="#"
                              onClick={(e) => { e.preventDefault(); openMembers(p); }}
                            >
                              <i className="ri-user-add-line text-secondary"></i>
                              {t('action.members')}
                            </a>
                          </li>
                          <li>
                            <a
                              className="dropdown-item d-flex align-items-center gap-2"
                              href="#"
                              onClick={(e) => { e.preventDefault(); openTeams(p); }}
                            >
                              <i className="ri-team-line text-info"></i>
                              {t('action.teams')}
                            </a>
                          </li>
                          <li>
                            <a
                              className="dropdown-item d-flex align-items-center gap-2"
                              href="#"
                              onClick={(e) => { e.preventDefault(); openHolidays(p); }}
                            >
                              <i className="ri-calendar-line text-success"></i>
                              {t('action.holidays')}
                            </a>
                          </li>
                          <li>
                            <a
                              className="dropdown-item d-flex align-items-center gap-2"
                              href="#"
                              onClick={(e) => { e.preventDefault(); setPermissionsProject(p); setShowPermissions(true); }}
                            >
                              <i className="ri-shield-keyhole-line text-purple"></i>
                              {t('action.permissions')}
                            </a>
                          </li>
                          <li>
                            <a
                              className="dropdown-item d-flex align-items-center gap-2"
                              href="#"
                              onClick={(e) => { e.preventDefault(); openEdit(p); }}
                            >
                              <i className="ri-pencil-line text-warning"></i>
                              {tc('actions.edit')}
                            </a>
                          </li>
                          <li><hr className="dropdown-divider" /></li>
                          <li>
                            <a
                              className={`dropdown-item d-flex align-items-center gap-2${p.status === 'INACTIVE' ? ' disabled text-muted' : ' text-danger'}`}
                              href="#"
                              onClick={(e) => { e.preventDefault(); if (p.status !== 'INACTIVE') { setDeactivatingProject(p); setShowDeactivate(true); } }}
                            >
                              <i className="ri-forbid-line"></i>
                              {tc('actions.deactivate')}
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Title */}
                    <h6 className="mb-1 fw-semibold">{p.name}</h6>
                    <p className="text-muted fs-13 mb-3" style={{ minHeight: '38px' }}>
                      {p.description ? p.description.slice(0, 80) + (p.description.length > 80 ? '…' : '') : <em className="opacity-50">{t('card.no_description')}</em>}
                    </p>

                    {/* Teams / members info box */}
                    <div className="p-2 bg-light border rounded d-flex align-items-center gap-3">
                      <span className="avatar avatar-sm bg-primary-transparent rounded">
                        <i className="ri-team-line fs-16 text-primary"></i>
                      </span>
                      <div className="lh-1">
                        <p className="mb-0 fs-13 fw-medium">{t('card.teams_count', { count: p.teams.length })}</p>
                        <span className="text-muted fs-12">{t('card.members_count', { count: totalMembers })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="card-footer d-flex justify-content-between align-items-center py-2">
                    <div className="d-flex align-items-center gap-2">
                      {p.manager && (
                        <div
                          className="avatar avatar-xs avatar-rounded bg-primary text-white d-flex align-items-center justify-content-center fw-semibold"
                          style={{ fontSize: '9px' }}
                          title={`Gestor: ${p.manager.name}`}
                        >
                          {p.manager.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                      )}
                      {p.owner && (
                        <div
                          className="avatar avatar-xs avatar-rounded bg-success text-white d-flex align-items-center justify-content-center fw-semibold"
                          style={{ fontSize: '9px' }}
                          title={`Owner: ${p.owner.name}`}
                        >
                          {p.owner.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                      )}
                      {!p.manager && !p.owner && (
                        <span className="text-muted fs-12">{t('card.no_owners')}</span>
                      )}
                    </div>
                    {dateLabel ? (
                      <span className="fs-12 text-muted">
                        <i className="ri-calendar-line me-1"></i>
                        {dateLabel}: {displayDate}
                      </span>
                    ) : (
                      <span className="fs-12 text-muted">
                        <i className="ri-calendar-line me-1"></i>
                        {formatDate(p.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Project Modal ──────────────────────────────────────── */}
      {showProjectModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className={`${editingProject ? 'ri-pencil-line' : 'ri-folder-add-line'} me-2 text-primary`}></i>
                    {editingProject ? t('modal.edit_title', { name: editingProject.name }) : t('modal.create_title')}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowProjectModal(false)} aria-label={tc('actions.close')}></button>
                </div>
                <form onSubmit={handleProjectSubmit} noValidate>
                  <div className="modal-body">
                    {projectFormError && (
                      <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
                        <i className="ri-error-warning-line flex-shrink-0"></i>
                        <span>{projectFormError}</span>
                      </div>
                    )}

                    {/* Tabs Bootstrap nativas — Tab Style-2 do template Zynix */}
                    <ul className="nav nav-tabs tab-style-2 nav-justified mb-3 d-sm-flex d-block" role="tablist">
                      <li className="nav-item">
                        <a className="nav-link active" data-bs-toggle="tab" role="tab" href="#proj-tab-general" aria-selected="true">
                          <i className="ri-information-line me-1" />{t('tab.general')}
                        </a>
                      </li>
                      <li className="nav-item">
                        <a className="nav-link" data-bs-toggle="tab" role="tab" href="#proj-tab-region" aria-selected="false">
                          <i className="ri-global-line me-1" />{t('tab.region_language')}
                        </a>
                      </li>
                    </ul>

                    <div className="tab-content">

                      {/* ── Tab: Geral ─────────────────────────────────── */}
                      <div className="tab-pane show active" id="proj-tab-general" role="tabpanel">
                        <div className="row g-3">

                      {/* Name */}
                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('form.name')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={projectForm.name}
                          onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
                          required
                          placeholder={t('form.name_placeholder')}
                        />
                      </div>

                      {/* Description */}
                      <div className="col-12">
                        <label className="form-label fw-medium">{t('form.description')}</label>
                        <textarea
                          className="form-control"
                          rows={3}
                          value={projectForm.description}
                          onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
                          placeholder={t('form.description_placeholder')}
                        />
                      </div>

                      {/* Owner */}
                      <div className="col-md-6">
                        <label className="form-label fw-medium">
                          {t('form.owner')}
                          <span className="text-muted fw-normal fs-12 ms-1">{t('form.owner_hint')}</span>
                        </label>
                        <select
                          ref={choicesOwnerRef}
                          className="form-select"
                          value={projectForm.ownerId}
                          onChange={e => setProjectForm(f => ({ ...f, ownerId: e.target.value }))}
                        >
                          <option value="">{tc('form.none')}</option>
                          {activeUsers.map(u => (
                            <option key={u.publicId} value={u.publicId}>
                              {u.name}{u.userType ? ` — ${u.userType.label}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Manager */}
                      <div className="col-md-6">
                        <label className="form-label fw-medium">
                          {t('form.manager')}
                          <span className="text-muted fw-normal fs-12 ms-1">{t('form.manager_hint')}</span>
                        </label>
                        <select
                          ref={choicesManagerRef}
                          className="form-select"
                          value={projectForm.managerId}
                          onChange={e => setProjectForm(f => ({ ...f, managerId: e.target.value }))}
                        >
                          <option value="">{tc('form.none')}</option>
                          {activeUsers.map(u => (
                            <option key={u.publicId} value={u.publicId}>
                              {u.name}{u.userType ? ` — ${u.userType.label}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Start Date */}
                      <div className="col-md-6">
                        <label className="form-label fw-medium">{t('form.start_date')}</label>
                        <div className="input-group">
                          <span className="input-group-text text-muted">
                            <i className="ri-calendar-line"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            ref={fpStartRef}
                            placeholder={projectForm.dateFormat || DEFAULT_DATE_FORMAT}
                            readOnly
                          />
                          {projectForm.startDate && (
                            <button
                              type="button"
                              className="btn btn-light"
                              onClick={() => setProjectForm(f => ({ ...f, startDate: '' }))}
                              title={tc('actions.clear')}
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* End Date */}
                      <div className="col-md-6">
                        <label className="form-label fw-medium">{t('form.end_date')}</label>
                        <div className="input-group">
                          <span className="input-group-text text-muted">
                            <i className="ri-calendar-line"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            ref={fpEndRef}
                            placeholder={projectForm.dateFormat || DEFAULT_DATE_FORMAT}
                            readOnly
                          />
                          {projectForm.endDate && (
                            <button
                              type="button"
                              className="btn btn-light"
                              onClick={() => setProjectForm(f => ({ ...f, endDate: '' }))}
                              title={tc('actions.clear')}
                            >
                              <i className="ri-close-line"></i>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Priority */}
                      <div className="col-md-6">
                        <label className="form-label fw-medium">{t('form.priority')}</label>
                        <select
                          ref={choicesPriorityRef}
                          className="form-select"
                          value={projectForm.priority}
                          onChange={e => setProjectForm(f => ({ ...f, priority: e.target.value }))}
                        >
                          <option value="">{t('form.no_priority')}</option>
                          <option value="HIGH">{t('priority.high')}</option>
                          <option value="MEDIUM">{t('priority.medium')}</option>
                          <option value="LOW">{t('priority.low')}</option>
                        </select>
                      </div>

                      {/* Status (edit only) */}
                      <div className="col-md-6">
                        <label className="form-label fw-medium">{t('form.status')}</label>
                        <select
                          ref={choicesStatusRef}
                          className="form-select"
                          value={projectForm.status}
                          onChange={e => setProjectForm(f => ({ ...f, status: e.target.value }))}
                        >
                          <option value="ACTIVE">{tc('status.active')}</option>
                          <option value="INACTIVE">{tc('status.inactive')}</option>
                        </select>
                      </div>

                        </div>
                      </div>

                      {/* ── Tab: Região e Idioma ────────────────────── */}
                      <div className="tab-pane" id="proj-tab-region" role="tabpanel">
                        <div className="row g-3">
                          {/* Working hours — janela útil para tasks com durationUnit=HOUR.
                              Default 09:00–18:00. Ver docs/claude/tools/gantt/data-model.md. */}
                          <div className="col-md-8">
                            <label className="form-label fw-medium">{t('form.work_hours')}</label>
                            <div className="d-flex gap-2 align-items-center" style={{ maxWidth: 240 }}>
                              <input
                                type="number"
                                className="form-control"
                                min={0}
                                max={23}
                                step={1}
                                value={projectForm.workHoursStart}
                                onChange={(e) => setProjectForm(f => ({ ...f, workHoursStart: e.target.value }))}
                                placeholder={t('form.work_hours_start')}
                              />
                              <span>–</span>
                              <input
                                type="number"
                                className="form-control"
                                min={1}
                                max={24}
                                step={1}
                                value={projectForm.workHoursEnd}
                                onChange={(e) => setProjectForm(f => ({ ...f, workHoursEnd: e.target.value }))}
                                placeholder={t('form.work_hours_end')}
                              />
                            </div>
                            <small className="text-muted d-block mt-2">{t('form.work_hours_hint')}</small>
                          </div>

                          <div className="col-md-8">
                            <label className="form-label fw-medium">
                              {t('form.date_format')}
                              <span className="text-muted fw-normal fs-12 ms-1">{t('form.date_format_hint')}</span>
                            </label>
                            <select
                              className="form-select"
                              value={projectForm.dateFormat}
                              onChange={e => setProjectForm(f => ({ ...f, dateFormat: e.target.value }))}
                            >
                              {DATE_FORMAT_OPTIONS.map(o => (
                                <option key={o.value} value={o.value}>
                                  {t(`date_format.${o.i18nKey}`)} — {o.example}
                                </option>
                              ))}
                            </select>
                            <small className="text-muted d-block mt-2">
                              {t('form.date_format_preview')}:{' '}
                              <strong>{fmtDate(new Date(), projectForm.dateFormat)}</strong>
                              <span className="text-muted mx-2">·</span>
                              <strong>{formatDateTime(new Date(), projectForm.dateFormat)}</strong>
                            </small>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={() => setShowProjectModal(false)}>{tc('actions.cancel')}</button>
                    <button type="submit" className="btn btn-primary" disabled={projectFormLoading}>
                      {projectFormLoading
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>{tc('actions.saving')}</>
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
      {showDeactivate && deactivatingProject && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className="ri-forbid-line me-2 text-warning"></i>
                    {t('modal.deactivate.title')}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowDeactivate(false)} aria-label={tc('actions.close')}></button>
                </div>
                <div className="modal-body">
                  <p className="mb-1">
                    {t('modal.deactivate.body', { name: deactivatingProject.name })}
                  </p>
                  <p className="text-muted mb-0 fs-13">
                    {t('modal.deactivate.hint')}
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowDeactivate(false)}>{tc('actions.cancel')}</button>
                  <button type="button" className="btn btn-warning" onClick={handleDeactivate} disabled={deactivateLoading}>
                    {deactivateLoading
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>{tc('actions.saving')}</>
                      : <><i className="ri-forbid-line me-2"></i>{tc('actions.deactivate')}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Teams Modal ──────────────────────────────────────────────────────── */}
      {showTeams && selectedProject && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-semibold mb-0">
                      <i className="ri-team-line me-2 text-primary"></i>
                      {t('modal.teams.title', { name: selectedProject.name })}
                    </h5>
                    <small className="text-muted">{t('modal.teams.subtitle', { count: selectedProject.teams.length })}</small>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowTeams(false)} aria-label={tc('actions.close')}></button>
                </div>
                <div className="modal-body">
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <div className="text-muted fs-12 fw-medium mb-1">
                          <i className="ri-user-star-line me-1"></i>OWNER
                        </div>
                        {selectedProject.owner ? (
                          <>
                            <div className="fw-semibold fs-13">{selectedProject.owner.name}</div>
                            <div className="text-muted fs-12">{selectedProject.owner.email}</div>
                          </>
                        ) : (
                          <span className="text-muted fs-13">{tc('form.undefined')}</span>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="p-3 bg-light rounded">
                        <div className="text-muted fs-12 fw-medium mb-1">
                          <i className="ri-shield-user-line me-1"></i>GESTOR
                        </div>
                        {selectedProject.manager ? (
                          <>
                            <div className="fw-semibold fs-13">{selectedProject.manager.name}</div>
                            <div className="text-muted fs-12">{selectedProject.manager.email}</div>
                          </>
                        ) : (
                          <span className="text-muted fs-13">{tc('form.undefined')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Add team form */}
                  <form onSubmit={handleAddTeam} className="mb-4">
                    <label className="form-label fw-medium fs-13">{t('teams.form.label')}</label>
                    {addTeamError && (
                      <div className="alert alert-danger py-2 px-3 mb-2 fs-13">{addTeamError}</div>
                    )}
                    <div className="input-group">
                      <select
                        className="form-select"
                        value={addTeamId}
                        onChange={e => setAddTeamId(e.target.value)}
                      >
                        <option value="">{t('teams.form.select_placeholder')}</option>
                        {availableTeams.map(team => (
                          <option key={team.publicId} value={team.publicId}>{team.name}</option>
                        ))}
                      </select>
                      <button className="btn btn-primary" type="submit" disabled={!addTeamId || addTeamLoading}>
                        {addTeamLoading
                          ? <span className="spinner-border spinner-border-sm" role="status"></span>
                          : <><i className="ri-add-line me-1"></i>{t('teams.btn.associate')}</>}
                      </button>
                    </div>
                  </form>

                  {/* Existing teams */}
                  {selectedProject.teams.length === 0 ? (
                    <div className="text-center text-muted py-3 fs-13">
                      <i className="ri-team-line fs-24 d-block mb-2 opacity-50"></i>
                      {t('teams.empty')}
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>{t('teams.col.team')}</th>
                            <th style={{ width: '80px' }}>{tc('table.members')}</th>
                            <th style={{ width: '80px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProject.teams.map(pt => (
                            <tr key={pt.publicId}>
                              <td>
                                <div className="fw-medium fs-13">{pt.team.name}</div>
                                {pt.team.description && (
                                  <div className="text-muted fs-12">{pt.team.description}</div>
                                )}
                              </td>
                              <td>
                                <span className="badge bg-info-transparent text-info">
                                  {pt.team._count.members}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-danger-light"
                                  onClick={() => handleRemoveTeam(pt.team.publicId)}
                                  disabled={removeTeamLoading === pt.team.publicId}
                                  title={t('teams.btn.remove')}
                                >
                                  {removeTeamLoading === pt.team.publicId
                                    ? <span className="spinner-border spinner-border-sm" role="status"></span>
                                    : <i className="ri-delete-bin-line"></i>}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowTeams(false)}>{tc('actions.close')}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Holidays Modal ───────────────────────────────────────────────────── */}
      {showHolidays && holidaysProject && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-semibold mb-0">
                      <i className="ri-calendar-line me-2 text-primary"></i>
                      {t('modal.holidays.title', { name: holidaysProject.name })}
                    </h5>
                    <small className="text-muted">{t('modal.holidays.subtitle', { count: projectHolidays.length })}</small>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowHolidays(false)} aria-label={tc('actions.close')}></button>
                </div>
                <div className="modal-body">

                  {/* Add holiday form */}
                  <form onSubmit={handleAddHoliday} className="mb-4">
                    <label className="form-label fw-medium fs-13">{t('holidays.form.label')}</label>
                    {addHolidayError && (
                      <div className="alert alert-danger py-2 px-3 mb-2 fs-13">{addHolidayError}</div>
                    )}
                    <div className="input-group">
                      <select
                        className="form-select"
                        value={addHolidayId}
                        onChange={e => setAddHolidayId(e.target.value)}
                      >
                        <option value="">{t('holidays.form.select_placeholder')}</option>
                        {allHolidays
                          .filter(hol => hol.status === 'ACTIVE' && !projectHolidays.some(ph => ph.publicId === hol.publicId))
                          .map(hol => (
                            <option key={hol.publicId} value={hol.publicId}>{hol.name}</option>
                          ))}
                      </select>
                      <button className="btn btn-primary" type="submit" disabled={!addHolidayId || addHolidayLoading}>
                        {addHolidayLoading
                          ? <span className="spinner-border spinner-border-sm" role="status"></span>
                          : <><i className="ri-add-line me-1"></i>{t('holidays.btn.associate')}</>}
                      </button>
                    </div>
                  </form>

                  {/* Existing holidays */}
                  {holidaysLoading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    </div>
                  ) : projectHolidays.length === 0 ? (
                    <div className="text-center text-muted py-3 fs-13">
                      <i className="ri-calendar-line fs-24 d-block mb-2 opacity-50"></i>
                      {t('holidays.empty')}
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>{t('holidays.col.name')}</th>
                            <th style={{ width: '90px' }}>{t('holidays.col.count')}</th>
                            <th style={{ width: '80px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectHolidays.map(hol => (
                            <tr key={hol.publicId}>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <span className="fw-medium fs-13">{hol.name}</span>
                                </div>
                                {hol.description && (
                                  <div className="text-muted fs-12">{hol.description}</div>
                                )}
                              </td>
                              <td>
                                <span className="badge bg-light text-default">
                                  {hol._count.dates}
                                </span>
                              </td>
                              <td>
                                <button
                                  className="btn btn-sm btn-danger-light"
                                  onClick={() => handleRemoveHoliday(hol.publicId)}
                                  disabled={removeHolidayLoading === hol.publicId}
                                  title={t('holidays.btn.remove')}
                                >
                                  {removeHolidayLoading === hol.publicId
                                    ? <span className="spinner-border spinner-border-sm" role="status"></span>
                                    : <i className="ri-delete-bin-line"></i>}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowHolidays(false)}>{tc('actions.close')}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Members Modal ────────────────────────────────────────────────────── */}
      {showMembers && membersProject && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <div>
                    <h5 className="modal-title fw-semibold mb-0">
                      <i className="ri-user-add-line me-2 text-primary"></i>
                      {t('modal.members.title', { name: membersProject.name })}
                    </h5>
                    <small className="text-muted">{t('modal.members.subtitle', { count: members.length })}</small>
                  </div>
                  <button type="button" className="btn-close" onClick={() => setShowMembers(false)} aria-label={tc('actions.close')}></button>
                </div>
                <div className="modal-body">

                  {/* Invite form */}
                  <form onSubmit={handleInvite} className="mb-4">
                    <label className="form-label fw-medium fs-13">{t('members.form.label')}</label>
                    {inviteError && (
                      <div className="alert alert-danger py-2 px-3 mb-2 fs-13">{inviteError}</div>
                    )}
                    <div className="row g-2">
                      <div className="col-md-3">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder={t('members.form.name_placeholder')}
                          value={inviteName}
                          onChange={e => setInviteName(e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <input
                          type="email"
                          className="form-control form-control-sm"
                          placeholder={t('members.form.email_placeholder')}
                          value={inviteEmail}
                          onChange={e => setInviteEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-md-3">
                        {membersProject && membersProject.teams.length > 0 ? (
                          <select
                            className="form-select form-select-sm"
                            value={inviteTeamId}
                            onChange={e => setInviteTeamId(e.target.value)}
                            required
                          >
                            <option value="">{t('members.form.team_placeholder')}</option>
                            {membersProject.teams.map(pt => (
                              <option key={pt.team.publicId} value={pt.team.publicId}>
                                {pt.team.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-muted fs-12 pt-1">
                            <i className="ri-information-line me-1 text-warning" />
                            {t('members.no_teams_hint')}
                          </div>
                        )}
                      </div>
                      <div className="col-md-2">
                        <button
                          className="btn btn-primary btn-sm w-100"
                          type="submit"
                          disabled={inviteLoading || !inviteEmail.trim() || !inviteTeamId}
                        >
                          {inviteLoading
                            ? <span className="spinner-border spinner-border-sm" role="status"></span>
                            : <><i className="ri-send-plane-line me-1"></i>{t('members.btn.invite')}</>}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Members list */}
                  {membersLoading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    </div>
                  ) : members.length === 0 ? (
                    <div className="text-center text-muted py-3 fs-13">
                      <i className="ri-user-add-line fs-24 d-block mb-2 opacity-50"></i>
                      {t('members.empty')}
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>{t('members.col.name')}</th>
                            <th>{t('members.col.team')}</th>
                            <th>{t('members.col.role')}</th>
                            <th>{t('members.col.status')}</th>
                            <th style={{ width: '90px' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {members.map(m => (
                            <tr key={m.publicId}>
                              <td>
                                <div className="fw-medium fs-13">{m.user?.name ?? m.name ?? '—'}</div>
                                <div className="text-muted fs-12">{m.email}</div>
                              </td>
                              <td>
                                <span className="fs-13 text-muted">{m.team?.name ?? '—'}</span>
                              </td>
                              <td>
                                <span className="badge bg-light text-default">{m.role}</span>
                              </td>
                              <td>
                                {m.status === 'INVITED' && <span className="badge bg-warning-transparent text-warning">{t('members.status.invited')}</span>}
                                {m.status === 'ACCEPTED' && <span className="badge bg-success-transparent text-success">{t('members.status.accepted')}</span>}
                                {m.status === 'DECLINED' && <span className="badge bg-danger-transparent text-danger">{t('members.status.declined')}</span>}
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  {m.status === 'DECLINED' && (
                                    <button
                                      className="btn btn-sm btn-warning-light"
                                      onClick={() => handleResend(m.publicId)}
                                      disabled={resendLoading === m.publicId}
                                      title={t('members.btn.resend')}
                                    >
                                      {resendLoading === m.publicId
                                        ? <span className="spinner-border spinner-border-sm"></span>
                                        : <i className="ri-mail-send-line"></i>}
                                    </button>
                                  )}
                                  <button
                                    className="btn btn-sm btn-danger-light"
                                    onClick={() => handleRemoveMember(m.publicId)}
                                    disabled={removeMemberLoading === m.publicId}
                                    title={tc('actions.remove')}
                                  >
                                    {removeMemberLoading === m.publicId
                                      ? <span className="spinner-border spinner-border-sm"></span>
                                      : <i className="ri-delete-bin-line"></i>}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowMembers(false)}>{tc('actions.close')}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Permissions modal */}
      {showPermissions && permissionsProject && (
        <PermissionsModal
          projectId={permissionsProject.publicId}
          projectName={permissionsProject.name}
          onClose={() => setShowPermissions(false)}
        />
      )}
    </>
  );
}
