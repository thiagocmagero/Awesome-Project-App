import { useState, useEffect, useRef, FormEvent, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useIsPlatformAdmin } from '../hooks/useIsPlatformAdmin';
import { getApiBase, apiFetch } from '../lib/api';
import { formatDate } from '../lib/dateFormatting';
import { useToast } from '../contexts/ToastContext';

declare const Choices: new (el: HTMLElement, opts?: object) => { destroy(): void };

// ── Types ───────────────────────────────────────────────────────────────────

interface ClientItem {
  publicId: string;
  name: string;
  email: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  profile: { publicId: string; code: string; label: string };
  userType: { publicId: string; code: string; label: string } | null;
  subscription?: { status: string; plan: { publicId: string; code: string; name: string } } | null;
  memberCount?: number;
  workspacePublicId?: string | null;
}

interface DropdownOption { publicId: string; code: string; label: string; }

interface PlanOption { publicId: string; code: string; name: string; planStatus: string; }

interface ClientStats {
  projects: number;
  teams: number;
  workspaceMembers: number;
  teamMembers: number;
  tasks: number;
  subtasks: number;
  files: number;
  holidays: number;
  storageBytes: number;
}

const SUBSCRIPTION_STATUSES = [
  'TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED', 'INCOMPLETE',
] as const;

const ACCOUNT_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING'] as const;

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  profileId: '',
  status: 'ACTIVE',
};

// ── Badges ──────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t: tc } = useTranslation('common');
  if (status === 'ACTIVE') return <span className="badge bg-success-transparent text-success">{tc('status.active')}</span>;
  if (status === 'INACTIVE') return <span className="badge bg-warning-transparent text-warning">{tc('status.inactive')}</span>;
  if (status === 'PENDING') return <span className="badge bg-info-transparent text-info">{tc('status.pending', 'Pending')}</span>;
  return <span className="badge bg-secondary-transparent text-secondary">{status}</span>;
}

function AccessLevelBadge({ profileCode }: { profileCode: string }) {
  const { t } = useTranslation('users');
  const isAdmin = profileCode === 'PLATFORM_ADMIN';
  return (
    <span className={`badge ${isAdmin ? 'bg-primary-transparent text-primary' : 'bg-secondary-transparent text-secondary'}`}>
      {isAdmin ? t('form.access_level_admin') : t('form.access_level_client')}
    </span>
  );
}

function SubscriptionStatusBadge({ status }: { status: string | null | undefined }) {
  const { t } = useTranslation('users');
  if (!status) return <span className="text-muted fs-13">—</span>;
  const tone =
    status === 'ACTIVE' || status === 'TRIALING' ? 'bg-success-transparent text-success'
    : status === 'PAST_DUE' || status === 'PAUSED' || status === 'INCOMPLETE' ? 'bg-warning-transparent text-warning'
    : status === 'CANCELED' || status === 'EXPIRED' ? 'bg-danger-transparent text-danger'
    : 'bg-secondary-transparent text-secondary';
  return <span className={`badge ${tone}`}>{t(`subscription_status.${status}`, status)}</span>;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation('common');
  const { token, user: authUser } = useAuth();
  const api = getApiBase();
  const isPlatformAdmin = useIsPlatformAdmin();
  const { showToast } = useToast();

  // Página exclusiva de PLATFORM_ADMIN. Outros vão para a vista do workspace.
  if (authUser && !isPlatformAdmin) {
    const wsId = authUser.workspacePublicId;
    return <Navigate to={wsId ? `/${wsId}/users` : '/'} replace />;
  }

  // Data
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [profiles, setProfiles] = useState<DropdownOption[]>([]);
  const [availablePlans, setAvailablePlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Filters (server-side: planFilter, subscriptionStatusFilter, accountStatusFilter)
  const [planFilter, setPlanFilter] = useState('');
  const [subscriptionStatusFilter, setSubscriptionStatusFilter] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState('');
  // Client-side: search
  const [searchTerm, setSearchTerm] = useState('');

  // Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Detail / stats modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailClient, setDetailClient] = useState<ClientItem | null>(null);
  const [detailStats, setDetailStats] = useState<ClientStats | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Soft delete
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatingClient, setDeactivatingClient] = useState<ClientItem | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  // Hard delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingClient, setDeletingClient] = useState<ClientItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteEmailConfirm, setDeleteEmailConfirm] = useState('');

  // Subscription tab
  const [modalTab, setModalTab] = useState<'account' | 'subscription'>('account');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [planNotes, setPlanNotes] = useState('');
  const [assigningPlan, setAssigningPlan] = useState(false);

  // Choices.js refs
  const choicesAccessLevelRef = useRef<HTMLSelectElement>(null);
  const choicesStatusRef = useRef<HTMLSelectElement>(null);

  // Resolve profileId of PLATFORM_ADMIN and BASIC_USER from the loaded profiles
  const profileIdMap = useMemo(() => {
    const admin = profiles.find((p) => p.code === 'PLATFORM_ADMIN');
    const basic = profiles.find((p) => p.code === 'BASIC_USER');
    return {
      adminPublicId: admin?.publicId ?? '',
      clientPublicId: basic?.publicId ?? '',
    };
  }, [profiles]);

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

  function buildClientsUrl() {
    const params = new URLSearchParams();
    if (planFilter) params.set('planId', planFilter);
    if (subscriptionStatusFilter) params.set('subscriptionStatus', subscriptionStatusFilter);
    if (accountStatusFilter) params.set('status', accountStatusFilter);
    const qs = params.toString();
    return `${api}/users${qs ? `?${qs}` : ''}`;
  }

  function loadClients() {
    setLoading(true);
    apiFetch(buildClientsUrl(), { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((u) => {
        setClients(Array.isArray(u) ? u : []);
        setPageError('');
      })
      .catch(() => setPageError(tc('messages.network_error')))
      .finally(() => setLoading(false));
  }

  // Initial fetch — clients + profiles + plans
  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch(buildClientsUrl(), { headers: authHeaders() }).then((r) => r.json()),
      apiFetch(`${api}/profiles`, { headers: authHeaders() }).then((r) => r.json()),
      apiFetch(`${api}/plans`, { headers: authHeaders() }).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([u, p, pl]) => {
        setClients(Array.isArray(u) ? u : []);
        setProfiles(Array.isArray(p) ? p : []);
        setAvailablePlans(Array.isArray(pl) ? pl : []);
        setPageError('');
      })
      .catch(() => setPageError(tc('messages.network_error')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch clients when any server-side filter changes
  useEffect(() => {
    if (loading) return; // skip on initial mount (initial fetch handles it)
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planFilter, subscriptionStatusFilter, accountStatusFilter]);

  // Lock body scroll while modals are open
  useEffect(() => {
    document.body.style.overflow = (showModal || showDeleteModal || showDeactivateModal || showDetailModal) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal, showDeleteModal, showDeactivateModal, showDetailModal]);

  // ── Detail / stats modal ──────────────────────────────────────────────────

  function openDetail(c: ClientItem) {
    setDetailClient(c);
    setDetailStats(null);
    setShowDetailModal(true);
    setDetailLoading(true);
    apiFetch(`${api}/users/${c.publicId}/stats`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : null))
      .then((s: ClientStats | null) => setDetailStats(s))
      .catch(() => setDetailStats(null))
      .finally(() => setDetailLoading(false));
  }

  function closeDetail() {
    setShowDetailModal(false);
    setDetailClient(null);
    setDetailStats(null);
  }

  function formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(value < 10 && i > 0 ? 1 : 0)} ${sizes[i]}`;
  }

  // ── Modal open/close ─────────────────────────────────────────────────────

  function resolveAccessLevelProfileId(profileCode: string): string {
    return profileCode === 'PLATFORM_ADMIN'
      ? profileIdMap.adminPublicId
      : profileIdMap.clientPublicId;
  }

  function openCreate() {
    setEditingClient(null);
    setForm({
      ...EMPTY_FORM,
      profileId: profileIdMap.clientPublicId, // default = "Cliente"
    });
    setFormError('');
    setShowModal(true);
  }

  function openEdit(c: ClientItem) {
    setEditingClient(c);
    setForm({
      name: c.name,
      email: c.email,
      password: '',
      profileId: resolveAccessLevelProfileId(c.profile.code),
      status: c.status,
    });
    setFormError('');
    setModalTab('account');
    setSelectedPlanId(c.subscription?.plan.publicId ?? '');
    setPlanNotes('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingClient(null);
    setModalTab('account');
  }

  // ── Submit (create / edit) ────────────────────────────────────────────────

  async function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        profileId: form.profileId,
      };

      if (!editingClient) {
        if (form.password) body.password = form.password;
      } else {
        body.status = form.status;
      }

      const url = editingClient ? `${api}/users/${editingClient.publicId}` : `${api}/users`;
      const method = editingClient ? 'PATCH' : 'POST';

      const res = await apiFetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
      const data = await res.json() as { message?: string | string[] } & Partial<ClientItem>;

      if (!res.ok) {
        const msg = data.message;
        setFormError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Erro ao guardar.'));
        return;
      }

      if (editingClient) {
        setClients((prev) => prev.map((u) => u.publicId === (data as ClientItem).publicId ? (data as ClientItem) : u));
        showToast('success', tc('messages.success_updated'));
      } else {
        setClients((prev) => [...prev, data as ClientItem]);
        showToast('success', tc('messages.success_created'));
      }
      closeModal();
    } catch {
      setFormError(tc('messages.network_error'));
    } finally {
      setFormLoading(false);
    }
  }

  // ── Subscription tab — assign plan ────────────────────────────────────────

  async function handleAssignPlan() {
    if (!editingClient || !selectedPlanId) return;
    if (selectedPlanId === editingClient.subscription?.plan.publicId && !planNotes) return;
    setAssigningPlan(true);
    try {
      const res = await apiFetch(`${api}/plans/assign`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: editingClient.publicId,
          planId: selectedPlanId,
          notes: planNotes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast('danger', Array.isArray(d.message) ? d.message.join(' · ') : (d.message ?? tc('messages.network_error')));
        return;
      }
      // Re-fetch full list so the new plan reflects in the table
      const refreshed = await apiFetch(buildClientsUrl(), { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null));
      if (Array.isArray(refreshed)) setClients(refreshed);
      showToast('success', tc('messages.success_updated'));
      setPlanNotes('');
    } catch {
      showToast('danger', tc('messages.network_error'));
    } finally {
      setAssigningPlan(false);
    }
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  function openDeactivate(c: ClientItem) {
    setDeactivatingClient(c);
    setShowDeactivateModal(true);
  }

  async function handleDeactivate() {
    if (!deactivatingClient) return;
    setDeactivateLoading(true);
    try {
      const res = await apiFetch(`${api}/users/${deactivatingClient.publicId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json() as ClientItem;
        setClients((prev) => prev.map((u) => u.publicId === data.publicId ? data : u));
        setShowDeactivateModal(false);
        setDeactivatingClient(null);
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

  // ── Hard delete ───────────────────────────────────────────────────────────

  function openDelete(c: ClientItem) {
    setDeletingClient(c);
    setDeleteEmailConfirm('');
    setShowDeleteModal(true);
  }

  async function handleDelete() {
    if (!deletingClient) return;
    if (deleteEmailConfirm.trim().toLowerCase() !== deletingClient.email.toLowerCase()) {
      showToast('warning', t('delete.email_mismatch'));
      return;
    }
    setDeleteLoading(true);
    try {
      const res = await apiFetch(`${api}/users/${deletingClient.publicId}?hard=true`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        setClients((prev) => prev.filter((u) => u.publicId !== deletingClient.publicId));
        setShowDeleteModal(false);
        setDeletingClient(null);
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

  // ── Choices.js init in modal ──────────────────────────────────────────────

  useEffect(() => {
    if (!showModal || typeof Choices === 'undefined') return;
    const instances: Array<{ destroy(): void }> = [];
    if (choicesAccessLevelRef.current) {
      instances.push(new Choices(choicesAccessLevelRef.current, { searchEnabled: false, itemSelectText: '', shouldSort: false, allowHTML: false }));
    }
    if (editingClient && choicesStatusRef.current) {
      instances.push(new Choices(choicesStatusRef.current, { searchEnabled: false, itemSelectText: '', shouldSort: false, allowHTML: false }));
    }
    return () => instances.forEach((c) => c.destroy());
  }, [showModal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Client-side search filter (after server-side filters applied) ────────

  const visibleClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const q = searchTerm.trim().toLowerCase();
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [clients, searchTerm]);

  const totalCount = clients.length;
  const activeCount = clients.filter((u) => u.status === 'ACTIVE').length;
  const inactiveCount = clients.filter((u) => u.status === 'INACTIVE').length;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page Header */}
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{t('page.title_clients')}</h1>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><a href="/dashboard" className="text-primary">{tc('nav.dashboard')}</a></li>
              <li className="breadcrumb-item active">{t('page.title_clients')}</li>
            </ol>
          </nav>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="ri-user-add-line fs-16"></i>
          {t('btn.new_client')}
        </button>
      </div>

      {/* Summary stats */}
      <div className="row g-3 mb-4">
        <div className="col-auto">
          <div className="card custom-card mb-0">
            <div className="card-body py-2 px-3 d-flex align-items-center gap-2">
              <i className="ri-group-line text-primary fs-18"></i>
              <span className="fw-semibold">{totalCount}</span>
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
        <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
          <h6 className="card-title mb-0">
            <i className="ri-group-line me-2 text-primary"></i>
            {t('card.list_clients')}
          </h6>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="input-group input-group-sm" style={{ width: 220 }}>
              <span className="input-group-text">
                <i className="ri-search-line"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder={t('filter.search_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Plan filter */}
            <select
              className="form-select form-select-sm"
              style={{ width: 180 }}
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              aria-label={t('filter.plan')}
            >
              <option value="">{t('filter.all_plans')}</option>
              {availablePlans
                .filter((p) => p.planStatus === 'ACTIVE')
                .map((p) => (
                  <option key={p.publicId} value={p.publicId}>{p.name}</option>
                ))}
            </select>
            {/* Subscription status filter */}
            <select
              className="form-select form-select-sm"
              style={{ width: 200 }}
              value={subscriptionStatusFilter}
              onChange={(e) => setSubscriptionStatusFilter(e.target.value)}
              aria-label={t('filter.subscription_status')}
            >
              <option value="">{t('filter.all_subscription_statuses')}</option>
              {SUBSCRIPTION_STATUSES.map((s) => (
                <option key={s} value={s}>{t(`subscription_status.${s}`)}</option>
              ))}
            </select>
            {/* Account status filter */}
            <select
              className="form-select form-select-sm"
              style={{ width: 180 }}
              value={accountStatusFilter}
              onChange={(e) => setAccountStatusFilter(e.target.value)}
              aria-label={t('filter.account_status')}
            >
              <option value="">{t('filter.all_account_statuses')}</option>
              {ACCOUNT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === 'ACTIVE' ? tc('status.active')
                    : s === 'INACTIVE' ? tc('status.inactive')
                    : tc('status.pending', 'Pending')}
                </option>
              ))}
            </select>
            <button className="btn btn-sm btn-light" onClick={loadClients} title={tc('actions.refresh')}>
              <i className="ri-refresh-line"></i>
            </button>
          </div>
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
                    <th>{t('table.access_level')}</th>
                    <th>{t('table.plan')}</th>
                    <th>{t('table.subscription_status')}</th>
                    <th className="text-center">{t('table.member_count')}</th>
                    <th>{t('table.member_since')}</th>
                    <th>{t('table.status')}</th>
                    <th style={{ width: '130px' }}>{tc('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleClients.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center text-muted py-5">
                        <i className="ri-inbox-line fs-24 d-block mb-2"></i>
                        {tc('messages.no_results')}
                      </td>
                    </tr>
                  ) : visibleClients.map((c) => (
                    <tr key={c.publicId}>
                      <td className="ps-4 text-muted fs-13">{c.publicId.substring(0, 8)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div
                            className="avatar avatar-sm avatar-rounded bg-primary text-white d-flex align-items-center justify-content-center fw-semibold flex-shrink-0"
                            style={{ fontSize: '11px' }}
                          >
                            {c.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div className="d-flex flex-column">
                            <button
                              type="button"
                              className="btn btn-link p-0 fw-medium text-start text-primary text-decoration-none"
                              style={{ lineHeight: 1.1 }}
                              onClick={() => openDetail(c)}
                              title={t('detail.open_title')}
                            >
                              {c.name}
                            </button>
                            <span className="text-muted fs-12">{c.email}</span>
                          </div>
                        </div>
                      </td>
                      <td><AccessLevelBadge profileCode={c.profile.code} /></td>
                      <td>
                        {c.subscription?.plan
                          ? <span className="badge bg-secondary-transparent text-secondary">{c.subscription.plan.name}</span>
                          : <span className="text-muted fs-13">—</span>}
                      </td>
                      <td><SubscriptionStatusBadge status={c.subscription?.status} /></td>
                      <td className="text-center">
                        {typeof c.memberCount === 'number'
                          ? <span className="badge bg-light text-dark">{c.memberCount}</span>
                          : <span className="text-muted fs-13">—</span>}
                      </td>
                      <td className="text-muted fs-13">{formatDate(c.createdAt)}</td>
                      <td><StatusBadge status={c.status} /></td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <button
                            className="btn btn-sm btn-info-light"
                            title={t('detail.open_title')}
                            onClick={() => openDetail(c)}
                          >
                            <i className="ri-eye-line"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-primary-light"
                            title={tc('actions.edit')}
                            onClick={() => openEdit(c)}
                          >
                            <i className="ri-pencil-line"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-warning-light"
                            title={tc('actions.deactivate')}
                            onClick={() => openDeactivate(c)}
                            disabled={c.status === 'INACTIVE'}
                          >
                            <i className="ri-user-forbid-line"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger-light"
                            title={t('delete.title')}
                            onClick={() => openDelete(c)}
                            disabled={c.publicId === authUser?.publicId}
                          >
                            <i className="ri-delete-bin-line"></i>
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
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className={`${editingClient ? 'ri-pencil-line' : 'ri-user-add-line'} me-2 text-primary`}></i>
                    {editingClient
                      ? `${t('modal.edit_title')} — ${editingClient.name}`
                      : t('modal.create_title')}
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

                    {editingClient && (
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
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
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
                            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                            required
                            placeholder={t('form.email_placeholder')}
                          />
                        </div>

                        {!editingClient && (
                          <div className="col-md-6">
                            <label className="form-label fw-medium">
                              {t('form.password')} <span className="text-danger">*</span>
                            </label>
                            <input
                              type="password"
                              className="form-control"
                              value={form.password}
                              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                              required
                              placeholder={t('form.password_placeholder')}
                              autoComplete="new-password"
                            />
                          </div>
                        )}

                        <div className="col-md-6">
                          <label className="form-label fw-medium">
                            {t('form.access_level')} <span className="text-danger">*</span>
                          </label>
                          <select
                            ref={choicesAccessLevelRef}
                            className="form-select"
                            value={form.profileId}
                            onChange={(e) => setForm((f) => ({ ...f, profileId: e.target.value }))}
                            required
                            disabled={!profileIdMap.adminPublicId || !profileIdMap.clientPublicId}
                          >
                            {profileIdMap.clientPublicId && (
                              <option value={profileIdMap.clientPublicId}>{t('form.access_level_client')}</option>
                            )}
                            {profileIdMap.adminPublicId && (
                              <option value={profileIdMap.adminPublicId}>{t('form.access_level_admin')}</option>
                            )}
                          </select>
                        </div>

                        {editingClient && (
                          <div className="col-md-6">
                            <label className="form-label fw-medium">{t('form.status')}</label>
                            <select
                              ref={choicesStatusRef}
                              className="form-select"
                              value={form.status}
                              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                            >
                              <option value="ACTIVE">{tc('status.active')}</option>
                              <option value="INACTIVE">{tc('status.inactive')}</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {editingClient && modalTab === 'subscription' && (
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
                            {editingClient.subscription?.plan
                              ? <><span className="badge bg-secondary-transparent text-secondary me-2">{editingClient.subscription.plan.code}</span>{editingClient.subscription.plan.name}</>
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
                            disabled={assigningPlan || !selectedPlanId || selectedPlanId === editingClient.subscription?.plan.publicId}
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

      {/* ── Deactivate Modal (soft, reversível) ─────────────────────────────── */}
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
                  <p className="mb-1">{t('deactivate.text')} <strong>{deactivatingClient?.name}</strong>?</p>
                  <p className="text-muted mb-0 fs-13">{t('deactivate.info')}</p>
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
                      : <><i className="ri-user-forbid-line me-2"></i>{tc('actions.deactivate')}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Hard Delete Modal ──────────────────────────────────────────────── */}
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
                    <strong>{deletingClient?.name}</strong> (<code>{deletingClient?.email}</code>)?
                  </p>
                  <ul className="text-muted fs-13 mb-3">
                    <li>{t('delete.list.subscription')}</li>
                    <li>{t('delete.list.workspace')}</li>
                    <li>{t('delete.list.memberships')}</li>
                    <li>{t('delete.list.avatar')}</li>
                    <li>{t('delete.list.notifications')}</li>
                  </ul>
                  <label className="form-label fw-medium fs-13">
                    {t('delete.confirm_label')} <code>{deletingClient?.email}</code>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={deleteEmailConfirm}
                    onChange={(e) => setDeleteEmailConfirm(e.target.value)}
                    placeholder={deletingClient?.email}
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
                    disabled={deleteLoading || deleteEmailConfirm.trim().toLowerCase() !== (deletingClient?.email.toLowerCase() ?? '')}
                  >
                    {deleteLoading
                      ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>{tc('messages.processing')}</>
                      : <><i className="ri-delete-bin-line me-2"></i>{t('delete.btn_confirm')}</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Detail / Stats Modal ───────────────────────────────────────────── */}
      {showDetailModal && detailClient && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <div className="d-flex align-items-center gap-2">
                    <div
                      className="avatar avatar-md avatar-rounded bg-primary text-white d-flex align-items-center justify-content-center fw-semibold"
                      style={{ fontSize: '14px' }}
                    >
                      {detailClient.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="d-flex flex-column">
                      <h5 className="modal-title fw-semibold mb-0">{detailClient.name}</h5>
                      <span className="text-muted fs-12">{detailClient.email}</span>
                    </div>
                  </div>
                  <button type="button" className="btn-close" onClick={closeDetail} aria-label={tc('actions.close')}></button>
                </div>
                <div className="modal-body">
                  {/* Resumo de conta — chips */}
                  <div className="d-flex flex-wrap gap-2 mb-4">
                    <AccessLevelBadge profileCode={detailClient.profile.code} />
                    {detailClient.subscription?.plan && (
                      <span className="badge bg-secondary-transparent text-secondary">
                        {detailClient.subscription.plan.name}
                      </span>
                    )}
                    <SubscriptionStatusBadge status={detailClient.subscription?.status} />
                    <StatusBadge status={detailClient.status} />
                    <span className="badge bg-light text-dark">
                      <i className="ri-calendar-line me-1"></i>
                      {t('detail.client_since', { date: formatDate(detailClient.createdAt) })}
                    </span>
                  </div>

                  <h6 className="fw-semibold mb-3 fs-14 text-muted text-uppercase" style={{ letterSpacing: '0.05em' }}>
                    <i className="ri-bar-chart-2-line me-2"></i>
                    {t('detail.usage_title')}
                  </h6>

                  {detailLoading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">{tc('messages.loading')}</span>
                      </div>
                    </div>
                  ) : !detailStats ? (
                    <div className="alert alert-danger d-flex align-items-center gap-2">
                      <i className="ri-error-warning-line"></i>
                      {tc('messages.network_error')}
                    </div>
                  ) : (
                    <div className="row g-3">
                      <StatCard icon="ri-folder-2-line"      tone="primary"   label={t('detail.stat.projects')}          value={detailStats.projects} />
                      <StatCard icon="ri-team-line"          tone="info"      label={t('detail.stat.teams')}             value={detailStats.teams} />
                      <StatCard icon="ri-group-line"         tone="success"   label={t('detail.stat.workspace_members')} value={detailStats.workspaceMembers} />
                      <StatCard icon="ri-user-add-line"      tone="success"   label={t('detail.stat.team_members')}      value={detailStats.teamMembers} />
                      <StatCard icon="ri-task-line"          tone="warning"   label={t('detail.stat.tasks')}             value={detailStats.tasks} />
                      <StatCard icon="ri-list-indefinite"    tone="warning"   label={t('detail.stat.subtasks')}          value={detailStats.subtasks} />
                      <StatCard icon="ri-file-line"          tone="secondary" label={t('detail.stat.files')}             value={detailStats.files} />
                      <StatCard icon="ri-calendar-event-line" tone="secondary" label={t('detail.stat.holidays')}          value={detailStats.holidays} />
                      <StatCard icon="ri-hard-drive-2-line"  tone="dark"      label={t('detail.stat.storage')}           value={formatBytes(detailStats.storageBytes)} />
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={closeDetail}>
                    {tc('actions.close')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => { closeDetail(); openEdit(detailClient); }}
                  >
                    <i className="ri-pencil-line me-2"></i>
                    {tc('actions.edit')}
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

// ── StatCard helper ─────────────────────────────────────────────────────────

function StatCard({
  icon, tone, label, value,
}: { icon: string; tone: 'primary' | 'info' | 'success' | 'warning' | 'secondary' | 'dark'; label: string; value: number | string }) {
  return (
    <div className="col-6 col-md-4">
      <div className="card custom-card mb-0 h-100">
        <div className="card-body py-3 px-3 d-flex align-items-center gap-3">
          <span className={`avatar avatar-md bg-${tone}-transparent rounded`}>
            <i className={`${icon} fs-20 text-${tone}`}></i>
          </span>
          <div className="d-flex flex-column">
            <span className="fw-semibold fs-18" style={{ lineHeight: 1.1 }}>{value}</span>
            <span className="text-muted fs-12">{label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
