import { useState, useEffect, useRef, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

declare const Choices: new (el: HTMLElement, opts?: object) => { destroy(): void };

interface UserItem {
  publicId: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  profile: { publicId: string; code: string; label: string };
  userType: { publicId: string; code: string; label: string } | null;
  subscription?: { status: string; plan: { publicId: string; code: string; name: string } } | null;
}

interface DropdownOption { publicId: string; code: string; label: string; }

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  profileId: '',
  userTypeId: '',
  status: 'ACTIVE',
};

function StatusBadge({ status }: { status: string }) {
  const { t: tc } = useTranslation('common');
  if (status === 'ACTIVE') return <span className="badge bg-success-transparent text-success">{tc('status.active')}</span>;
  if (status === 'INACTIVE') return <span className="badge bg-warning-transparent text-warning">{tc('status.inactive')}</span>;
  return <span className="badge bg-secondary-transparent text-secondary">{status}</span>;
}

export default function UsersPage() {
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation('common');
  const { token, user: authUser } = useAuth();
  const api = getApiBase();
  const isBasicUser = authUser?.profileCode === 'BASIC_USER';
  const { showToast } = useToast();

  // Página de gestão de plataforma — apenas PLATFORM_ADMIN.
  // Outros utilizadores são redireccionados para a vista do seu workspace.
  if (authUser && authUser.profileCode !== 'PLATFORM_ADMIN') {
    return <Navigate to="/workspace/users" replace />;
  }

  const [users, setUsers] = useState<UserItem[]>([]);
  const [profiles, setProfiles] = useState<DropdownOption[]>([]);
  const [userTypes, setUserTypes] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Soft delete (Deactivate) — sets status=INACTIVE, reversible
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<UserItem | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Hard delete (Remove) — recursive, irreversible. PLATFORM_ADMIN only.
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Subscription tab (only for PLATFORM_ADMIN editing existing user)
  const isPlatformAdmin = authUser?.profileCode === 'PLATFORM_ADMIN';
  const [modalTab, setModalTab] = useState<'account' | 'subscription'>('account');
  const [availablePlans, setAvailablePlans] = useState<Array<{ publicId: string; code: string; name: string; planStatus: string }>>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planNotes, setPlanNotes] = useState('');
  const [assigningPlan, setAssigningPlan] = useState(false);

  // Choices.js refs
  const choicesProfileRef = useRef<HTMLSelectElement>(null);
  const choicesTypeRef = useRef<HTMLSelectElement>(null);
  const choicesStatusRef = useRef<HTMLSelectElement>(null);

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  function loadData() {
    setLoading(true);
    Promise.all([
      apiFetch(`${api}/users`, { headers: authHeaders() }).then(r => r.json()),
      apiFetch(`${api}/profiles`, { headers: authHeaders() }).then(r => r.json()),
      apiFetch(`${api}/user-types`, { headers: authHeaders() }).then(r => r.json()),
    ])
      .then(([u, p, t]) => {
        setUsers(Array.isArray(u) ? u : []);
        setProfiles(Array.isArray(p) ? p : []);
        setUserTypes(Array.isArray(t) ? t : []);
        setPageError('');
      })
      .catch(() => setPageError('Erro ao carregar dados. Tente recarregar a página.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = (showModal || showDeleteModal || showDeactivateModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal, showDeleteModal, showDeactivateModal]);

  function openCreate() {
    setEditingUser(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowModal(true);
  }

  function openEdit(u: UserItem) {
    setEditingUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      profileId: u.profile.publicId,
      userTypeId: u.userType ? u.userType.publicId : '',
      status: u.status,
    });
    setFormError('');
    setModalTab('account');
    setSelectedPlanId(u.subscription?.plan.publicId ?? '');
    setPlanNotes('');
    setShowModal(true);
    // Lazy-load plans only when admin opens the modal
    if (isPlatformAdmin && availablePlans.length === 0) {
      apiFetch(`${api}/plans`, { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setAvailablePlans(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingUser(null);
    setModalTab('account');
  }

  async function handleAssignPlan() {
    if (!editingUser || !selectedPlanId) return;
    if (selectedPlanId === editingUser.subscription?.plan.publicId && !planNotes) {
      // No-op
      return;
    }
    setAssigningPlan(true);
    try {
      const res = await apiFetch(`${api}/plans/assign`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: editingUser.publicId,
          planId: selectedPlanId,
          notes: planNotes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast('danger', Array.isArray(d.message) ? d.message.join(' · ') : (d.message ?? tc('messages.network_error')));
        return;
      }
      // Re-fetch user list so the table reflects the new plan
      const refreshed = await apiFetch(`${api}/users`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : null));
      if (Array.isArray(refreshed)) setUsers(refreshed);
      showToast('success', tc('messages.success_updated'));
      setPlanNotes('');
    } catch {
      showToast('danger', tc('messages.network_error'));
    } finally {
      setAssigningPlan(false);
    }
  }

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        userTypeId: form.userTypeId ? form.userTypeId : null,
      };

      // PLATFORM_ADMIN provides profileId; BASIC_USER relies on backend to set it
      if (!isBasicUser && form.profileId) {
        body.profileId = form.profileId;
      }

      if (!editingUser) {
        // PLATFORM_ADMIN must send a password; BASIC_USER may omit it (backend generates one)
        if (form.password) body.password = form.password;
      } else {
        body.status = form.status;
      }

      const url = editingUser ? `${api}/users/${editingUser.publicId}` : `${api}/users`;
      const method = editingUser ? 'PATCH' : 'POST';

      const res = await apiFetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json() as { message?: string | string[] } & Partial<UserItem>;

      if (!res.ok) {
        const msg = data.message;
        setFormError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Erro ao guardar.'));
        return;
      }

      if (editingUser) {
        setUsers(prev => prev.map(u => u.publicId === (data as UserItem).publicId ? (data as UserItem) : u));
        showToast('success', tc('messages.success_updated'));
      } else {
        setUsers(prev => [...prev, data as UserItem]);
        showToast('success', tc('messages.success_created'));
      }
      closeModal();
    } catch {
      setFormError(tc('messages.network_error'));
    } finally {
      setFormLoading(false);
    }
  }

  // ── Soft delete (Deactivate) — comportamento legado, reversível ────────
  function openDeactivate(u: UserItem) {
    setDeactivatingUser(u);
    setShowDeactivateModal(true);
  }

  async function handleDeactivate() {
    if (!deactivatingUser) return;
    setDeactivateLoading(true);
    try {
      const res = await apiFetch(`${api}/users/${deactivatingUser.publicId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as UserItem;
        setUsers(prev => prev.map(u => u.publicId === data.publicId ? data : u));
        setShowDeactivateModal(false);
        setDeactivatingUser(null);
        showToast('success', tc('messages.success_updated'));
      } else {
        const d = await res.json().catch(() => ({}));
        showToast('danger', (d as { message?: string }).message ?? tc('messages.network_error'));
      }
    } catch {
      showToast('danger', tc('messages.network_error'));
    } finally {
      setDeactivateLoading(false);
    }
  }

  // ── Hard delete (Remove) — recursivo, irreversível. Confirmação por email. ──
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');

  function openDelete(u: UserItem) {
    setDeletingUser(u);
    setDeleteEmailConfirm('');
    setShowDeleteModal(true);
  }

  async function handleDelete() {
    if (!deletingUser) return;
    if (deleteEmailConfirm.trim().toLowerCase() !== deletingUser.email.toLowerCase()) {
      showToast('warning', t('delete.email_mismatch'));
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await apiFetch(`${api}/users/${deletingUser.publicId}?hard=true`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        // Hard delete: remove da lista (não há linha para actualizar — foi apagado).
        setUsers(prev => prev.filter(u => u.publicId !== deletingUser.publicId));
        setShowDeleteModal(false);
        setDeletingUser(null);
        setDeleteEmailConfirm('');
        showToast('success', tc('messages.success_deleted'));
      } else {
        const d = await res.json().catch(() => ({}));
        const code = (d as { error_code?: string }).error_code;
        if (code === 'CANNOT_DELETE_SELF') {
          showToast('danger', t('delete.error_self'));
        } else if (code === 'FORBIDDEN') {
          showToast('danger', tc('errors.forbidden'));
        } else {
          showToast('danger', (d as { message?: string }).message ?? tc('messages.network_error'));
        }
      }
    } catch {
      showToast('danger', tc('messages.network_error'));
    } finally {
      setDeleteLoading(false);
    }
  }

  const activeCount = users.filter(u => u.status === 'ACTIVE').length;
  const inactiveCount = users.filter(u => u.status === 'INACTIVE').length;

  // ── Choices.js (user modal) ───────────────────────────────────────────────
  useEffect(() => {
    if (!showModal || typeof Choices === 'undefined') return;
    const instances: Array<{ destroy(): void }> = [];
    const init = (ref: React.RefObject<HTMLSelectElement | null>, searchEnabled = false) => {
      if (!ref.current) return;
      const c = new Choices(ref.current, { searchEnabled, itemSelectText: '', shouldSort: false, allowHTML: false });
      instances.push(c);
    };
    if (!isBasicUser) init(choicesProfileRef);
    init(choicesTypeRef);
    if (editingUser) init(choicesStatusRef);
    return () => instances.forEach(c => c.destroy());
  }, [showModal]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Page Header */}
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">
            {isBasicUser ? t('page.title') : t('page.title')}
          </h1>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><a href="/dashboard" className="text-primary">{tc('nav.dashboard')}</a></li>
              <li className="breadcrumb-item active">{isBasicUser ? t('page.title') : t('page.title')}</li>
            </ol>
          </nav>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="ri-user-add-line fs-16"></i>
          {isBasicUser ? t('btn.new_person') : t('btn.new_user')}
        </button>
      </div>

      {/* Summary stats */}
      <div className="row g-3 mb-4">
        <div className="col-auto">
          <div className="card custom-card mb-0">
            <div className="card-body py-2 px-3 d-flex align-items-center gap-2">
              <i className="ri-group-line text-primary fs-18"></i>
              <span className="fw-semibold">{users.length}</span>
              <span className="text-muted fs-13">{t('stats.total')}</span>
            </div>
          </div>
        </div>
        <div className="col-auto">
          <div className="card custom-card mb-0">
            <div className="card-body py-2 px-3 d-flex align-items-center gap-2">
              <i className="ri-checkbox-circle-line text-success fs-18"></i>
              <span className="fw-semibold text-success">{activeCount}</span>
              <span className="text-muted fs-13">{t('stats.active')}</span>
            </div>
          </div>
        </div>
        <div className="col-auto">
          <div className="card custom-card mb-0">
            <div className="card-body py-2 px-3 d-flex align-items-center gap-2">
              <i className="ri-forbid-line text-warning fs-18"></i>
              <span className="fw-semibold text-warning">{inactiveCount}</span>
              <span className="text-muted fs-13">{t('stats.inactive')}</span>
            </div>
          </div>
        </div>
      </div>

      {pageError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <i className="ri-error-warning-line fs-18"></i>
          {pageError}
        </div>
      )}

      {/* Table card */}
      <div className="card custom-card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h6 className="card-title mb-0">
            <i className="ri-group-line me-2 text-primary"></i>
            {isBasicUser ? t('card.list_people') : t('card.list_title')}
          </h6>
          <button className="btn btn-sm btn-light" onClick={loadData} title={tc('actions.refresh')}>
            <i className="ri-refresh-line"></i>
          </button>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">{tc('messages.loading')}</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-4" style={{ width: '90px' }}>#</th>
                    <th>{t('table.name')}</th>
                    <th>{t('table.email')}</th>
                    {!isBasicUser && <th>{t('table.profile')}</th>}
                    <th>{t('table.type')}</th>
                    <th>{t('table.plan')}</th>
                    <th>{t('table.status')}</th>
                    <th style={{ width: '90px' }}>{tc('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={isBasicUser ? 7 : 8} className="text-center text-muted py-5">
                        <i className="ri-inbox-line fs-24 d-block mb-2"></i>
                        {tc('messages.no_results')}
                      </td>
                    </tr>
                  ) : users.map(u => (
                    <tr key={u.publicId}>
                      <td className="ps-4 text-muted fs-13">{u.publicId.substring(0, 8)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="avatar avatar-sm avatar-rounded bg-primary text-white d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
                            style={{ fontSize: '11px' }}
                          >
                            {u.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <span className="fw-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="text-muted fs-13">{u.email}</td>
                      {!isBasicUser && (
                        <td>
                          <span className="badge bg-primary-transparent text-primary">{u.profile.label}</span>
                        </td>
                      )}
                      <td>
                        {u.userType
                          ? <span className="badge bg-info-transparent text-info">{u.userType.label}</span>
                          : <span className="text-muted fs-13">—</span>}
                      </td>
                      <td>
                        {u.subscription?.plan
                          ? <span className="badge bg-secondary-transparent text-secondary">{u.subscription.plan.name}</span>
                          : <span className="text-muted fs-13">—</span>}
                      </td>
                      <td><StatusBadge status={u.status} /></td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <button
                            className="btn btn-sm btn-primary-light"
                            title={tc('actions.edit')}
                            onClick={() => openEdit(u)}
                          >
                            <i className="ri-pencil-line"></i>
                          </button>
                          {/* Desactivar — soft (status=INACTIVE), reversível */}
                          <button
                            className="btn btn-sm btn-warning-light"
                            title={tc('actions.deactivate')}
                            onClick={() => openDeactivate(u)}
                            disabled={u.status === 'INACTIVE'}
                          >
                            <i className="ri-user-forbid-line"></i>
                          </button>
                          {/* Remover — hard delete recursivo, irreversível (PLATFORM_ADMIN only) */}
                          {authUser?.profileCode === 'PLATFORM_ADMIN' && (
                            <button
                              className="btn btn-sm btn-danger-light"
                              title={t('delete.title')}
                              onClick={() => openDelete(u)}
                              disabled={u.publicId === authUser?.publicId}
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className={`${editingUser ? 'ri-pencil-line' : 'ri-user-add-line'} me-2 text-primary`}></i>
                    {editingUser
                      ? `${t('modal.edit_title')} — ${editingUser.name}`
                      : isBasicUser ? t('btn.new_person') : t('modal.create_title')}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeModal} aria-label={tc('actions.close')}></button>
                </div>
                <form onSubmit={handleFormSubmit} noValidate>
                  <div className="modal-body">
                    {formError && (
                      <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
                        <i className="ri-error-warning-line flex-shrink-0"></i>
                        <span>{formError}</span>
                      </div>
                    )}
                    {/* Tabs — só PLATFORM_ADMIN vê a tab Subscrição (e só ao editar) */}
                    {isPlatformAdmin && editingUser && (
                      <ul className="nav nav-tabs mb-3" role="tablist">
                        <li className="nav-item">
                          <button
                            type="button"
                            className={`nav-link ${modalTab === 'account' ? 'active' : ''}`}
                            onClick={() => setModalTab('account')}
                          >
                            {t('modal.tab_account')}
                          </button>
                        </li>
                        <li className="nav-item">
                          <button
                            type="button"
                            className={`nav-link ${modalTab === 'subscription' ? 'active' : ''}`}
                            onClick={() => setModalTab('subscription')}
                          >
                            <i className="ri-shield-star-line me-1"></i>
                            {t('modal.tab_subscription')}
                          </button>
                        </li>
                      </ul>
                    )}
                    {modalTab === 'account' && (
                    <div className="row g-3">

                      <div className="col-md-6">
                        <label className="form-label fw-medium">
                          {t('form.name')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={form.name}
                          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          required
                          placeholder={t('form.name_placeholder')}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label fw-medium">
                          {t('form.email')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          value={form.email}
                          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                          required
                          placeholder={t('form.email_placeholder')}
                        />
                      </div>

                      {!editingUser && !isBasicUser && (
                        <div className="col-md-6">
                          <label className="form-label fw-medium">
                            {t('form.password')} <span className="text-danger">*</span>
                          </label>
                          <input
                            type="password"
                            className="form-control"
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            required
                            placeholder={t('form.password_placeholder')}
                            autoComplete="new-password"
                          />
                        </div>
                      )}
                      {!editingUser && isBasicUser && (
                        <div className="col-12">
                          <div className="alert alert-info py-2 px-3 d-flex align-items-center gap-2 mb-0 fs-13">
                            <i className="ri-mail-send-line flex-shrink-0"></i>
                            <span>
                              {t('modal.self_register_info')}
                            </span>
                          </div>
                        </div>
                      )}

                      {!isBasicUser && (
                        <div className="col-md-6">
                          <label className="form-label fw-medium">
                            {t('form.profile')} <span className="text-danger">*</span>
                          </label>
                          <select
                            ref={choicesProfileRef}
                            className="form-select"
                            value={form.profileId}
                            onChange={e => setForm(f => ({ ...f, profileId: e.target.value }))}
                            required={!isBasicUser}
                          >
                            <option value="">{t('form.select_profile')}</option>
                            {profiles.map(p => (
                              <option key={p.publicId} value={p.publicId}>{p.label}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="col-md-6">
                        <label className="form-label fw-medium">{t('form.type')}</label>
                        <select
                          ref={choicesTypeRef}
                          className="form-select"
                          value={form.userTypeId}
                          onChange={e => setForm(f => ({ ...f, userTypeId: e.target.value }))}
                        >
                          <option value="">{t('form.none')}</option>
                          {userTypes.map(t => (
                            <option key={t.publicId} value={t.publicId}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      {editingUser && (
                        <div className="col-md-6">
                          <label className="form-label fw-medium">{t('form.status')}</label>
                          <select
                            ref={choicesStatusRef}
                            className="form-select"
                            value={form.status}
                            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                          >
                            <option value="ACTIVE">{tc('status.active')}</option>
                            <option value="INACTIVE">{tc('status.inactive')}</option>
                          </select>
                        </div>
                      )}

                    </div>
                    )}

                    {/* Subscription tab — PLATFORM_ADMIN editing existing user */}
                    {isPlatformAdmin && editingUser && modalTab === 'subscription' && (
                      <div className="row g-3">
                        <div className="col-12">
                          <div className="alert alert-primary-transparent py-2 px-3 fs-13">
                            <i className="ri-information-line me-1"></i>
                            {t('modal.subscription_hint')}
                          </div>
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-medium">{t('modal.current_plan')}</label>
                          <div className="form-control bg-light">
                            {editingUser.subscription?.plan
                              ? <><span className="badge bg-secondary-transparent text-secondary me-2">{editingUser.subscription.plan.code}</span>{editingUser.subscription.plan.name}</>
                              : <span className="text-muted">{tc('form.none')}</span>}
                          </div>
                        </div>
                        <div className="col-md-12">
                          <label className="form-label fw-medium">{t('modal.assign_plan')}</label>
                          <select
                            className="form-select"
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                          >
                            {availablePlans
                              .filter((p) => p.planStatus === 'ACTIVE')
                              .map((p) => (
                                <option key={p.publicId} value={p.publicId}>
                                  {p.code} — {p.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-medium">{t('modal.notes_optional')}</label>
                          <input
                            type="text"
                            className="form-control"
                            value={planNotes}
                            onChange={(e) => setPlanNotes(e.target.value)}
                            placeholder={t('modal.notes_placeholder')}
                          />
                        </div>
                        <div className="col-12 d-flex justify-content-end">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleAssignPlan}
                            disabled={assigningPlan || !selectedPlanId || selectedPlanId === editingUser.subscription?.plan.publicId}
                          >
                            {assigningPlan
                              ? <><span className="spinner-border spinner-border-sm me-2"></span>{tc('messages.saving')}</>
                              : <><i className="ri-shield-star-line me-2"></i>{t('btn.assign_plan')}</>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={closeModal}>
                      {tc('actions.close')}
                    </button>
                    {modalTab === 'account' && (
                      <button type="submit" className="btn btn-primary" disabled={formLoading}>
                        {formLoading
                          ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>{tc('messages.saving')}</>
                          : <><i className="ri-save-line me-2"></i>{tc('actions.save')}</>
                        }
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Deactivate Confirmation Modal (soft, reversível) ──────────────── */}
      {showDeactivateModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className="ri-user-forbid-line me-2 text-warning"></i>
                    {t('deactivate.title')}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeactivateModal(false)}
                    aria-label={tc('actions.close')}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-1">
                    {t('deactivate.text')}{' '}
                    <strong>{deactivatingUser?.name}</strong>?
                  </p>
                  <p className="text-muted mb-0 fs-13">
                    {t('deactivate.info')}
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowDeactivateModal(false)}>
                    {tc('actions.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={handleDeactivate}
                    disabled={deactivateLoading}
                  >
                    {deactivateLoading
                      ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>{tc('messages.processing')}</>
                      : <><i className="ri-user-forbid-line me-2"></i>{tc('actions.deactivate')}</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Hard Delete Confirmation Modal ────────────────────────────────── */}
      {showDeleteModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-danger-transparent">
                  <h5 className="modal-title fw-semibold text-danger">
                    <i className="ri-delete-bin-line me-2"></i>
                    {t('delete.title')}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeleteModal(false)}
                    aria-label={tc('actions.close')}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-danger d-flex align-items-start gap-2 mb-3">
                    <i className="ri-error-warning-line fs-18 mt-1 flex-shrink-0"></i>
                    <div>
                      <strong className="d-block mb-1">{t('delete.disclaimer_title')}</strong>
                      <span className="fs-13">{t('delete.disclaimer_text')}</span>
                    </div>
                  </div>
                  <p className="mb-2">
                    {t('delete.text')}{' '}
                    <strong>{deletingUser?.name}</strong> (<code>{deletingUser?.email}</code>)?
                  </p>
                  <ul className="text-muted fs-13 mb-3">
                    <li>{t('delete.list.subscription')}</li>
                    <li>{t('delete.list.workspace')}</li>
                    <li>{t('delete.list.memberships')}</li>
                    <li>{t('delete.list.avatar')}</li>
                    <li>{t('delete.list.notifications')}</li>
                  </ul>
                  <label className="form-label fw-medium fs-13">
                    {t('delete.confirm_label')} <code>{deletingUser?.email}</code>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={deleteEmailConfirm}
                    onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                    placeholder={deletingUser?.email}
                    autoComplete="off"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowDeleteModal(false)}>
                    {tc('actions.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDelete}
                    disabled={deleteLoading || deleteEmailConfirm.trim().toLowerCase() !== (deletingUser?.email.toLowerCase() ?? '')}
                  >
                    {deleteLoading
                      ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>{tc('messages.processing')}</>
                      : <><i className="ri-delete-bin-line me-2"></i>{t('delete.btn_confirm')}</>
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
