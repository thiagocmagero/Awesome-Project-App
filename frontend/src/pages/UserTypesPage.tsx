import { useState, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface UserTypeItem {
  publicId: string;
  code: string;
  label: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM = { code: '', label: '' };
const EMPTY_EDIT_FORM = { label: '', status: 'ACTIVE' };

function StatusBadge({ status }: { status: string }) {
  const { t: tc } = useTranslation('common');
  if (status === 'ACTIVE') return <span className="badge bg-success-transparent text-success">{tc('status.active')}</span>;
  if (status === 'INACTIVE') return <span className="badge bg-warning-transparent text-warning">{tc('status.inactive')}</span>;
  return <span className="badge bg-secondary-transparent text-secondary">{status}</span>;
}

export default function UserTypesPage() {
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation('common');
  const { token } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();

  const [items, setItems] = useState<UserTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editingItem, setEditingItem] = useState<UserTypeItem | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete modal
  const [showDelete, setShowDelete] = useState(false);
  const [deletingItem, setDeletingItem] = useState<UserTypeItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  function loadData() {
    setLoading(true);
    apiFetch(`${api}/user-types`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setPageError('');
      })
      .catch(() => setPageError('Erro ao carregar tipos de utilizador.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = (showCreate || showEdit || showDelete) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCreate, showEdit, showDelete]);

  // ── Create ──────────────────────────────────────────────────────────────

  function openCreate() {
    setCreateForm({ ...EMPTY_FORM });
    setCreateError('');
    setShowCreate(true);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const res = await apiFetch(`${api}/user-types`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          code: createForm.code,
          label: createForm.label,
        }),
      });
      const data = await res.json() as { message?: string | string[] } & Partial<UserTypeItem>;
      if (!res.ok) {
        const msg = data.message;
        setCreateError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Erro ao criar.'));
        return;
      }
      setItems(prev => [...prev, data as UserTypeItem].sort((a, b) => a.label.localeCompare(b.label)));
      setShowCreate(false);
      showToast('success', tc('messages.success_created'));
    } catch {
      setCreateError(tc('messages.network_error'));
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────

  function openEdit(item: UserTypeItem) {
    setEditingItem(item);
    setEditForm({ label: item.label, status: item.status });
    setEditError('');
    setShowEdit(true);
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setEditError('');
    setEditLoading(true);
    try {
      const res = await apiFetch(`${api}/user-types/${editingItem.publicId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          label: editForm.label,
          status: editForm.status,
        }),
      });
      const data = await res.json() as { message?: string | string[] } & Partial<UserTypeItem>;
      if (!res.ok) {
        const msg = data.message;
        setEditError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? 'Erro ao atualizar.'));
        return;
      }
      setItems(prev => prev.map(i => i.publicId === (data as UserTypeItem).publicId ? (data as UserTypeItem) : i).sort((a, b) => a.label.localeCompare(b.label)));
      setShowEdit(false);
      showToast('success', tc('messages.success_updated'));
    } catch {
      setEditError(tc('messages.network_error'));
    } finally {
      setEditLoading(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  function openDelete(item: UserTypeItem) {
    setDeletingItem(item);
    setShowDelete(true);
  }

  async function handleDelete() {
    if (!deletingItem) return;
    setDeleteLoading(true);
    try {
      const res = await apiFetch(`${api}/user-types/${deletingItem.publicId}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        const data = await res.json() as UserTypeItem;
        setItems(prev => prev.map(i => i.publicId === data.publicId ? data : i));
        setShowDelete(false);
        setDeletingItem(null);
        showToast('success', tc('messages.success_deleted'));
      }
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <>
      {/* Page Header */}
      <div className="my-4 page-header-breadcrumb d-flex align-items-center justify-content-between flex-wrap gap-2">
        <div>
          <h1 className="page-title fw-medium fs-18 mb-2">{t('types.page_title')}</h1>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><a href="/dashboard" className="text-primary">{tc('nav.dashboard')}</a></li>
              <li className="breadcrumb-item active">{t('types.page_title')}</li>
            </ol>
          </nav>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="ri-add-line fs-16"></i>
          {t('types.modal_create')}
        </button>
      </div>

      {pageError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <i className="ri-error-warning-line fs-18"></i>
          {pageError}
        </div>
      )}

      <div className="card custom-card">
        <div className="card-header d-flex align-items-center justify-content-between">
          <div>
            <h6 className="card-title mb-1">
              <i className="ri-id-card-line me-2 text-primary"></i>
              {t('types.page_title')}
            </h6>
            <p className="card-subtitle text-muted fs-12 mb-0">
              {t('types.subtitle')}
            </p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary-transparent text-primary">{tc('table.count', { count: items.length })}</span>
            <button className="btn btn-sm btn-light" onClick={loadData} title={tc('actions.refresh')}>
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
                    <th>{t('types.table_code')}</th>
                    <th>{t('types.table_label')}</th>
                    <th>{tc('table.status')}</th>
                    <th style={{ width: '90px' }}>{tc('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-5">
                        <i className="ri-inbox-line fs-24 d-block mb-2"></i>
                        {t('types.empty')}
                      </td>
                    </tr>
                  ) : items.map(item => (
                    <tr key={item.publicId}>
                      <td className="ps-4 text-muted fs-13">{item.publicId.substring(0, 8)}</td>
                      <td>
                        <code className="bg-light px-2 py-1 rounded fs-12">{item.code}</code>
                      </td>
                      <td className="fw-medium">{item.label}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <button
                            className="btn btn-sm btn-primary-light"
                            title={tc('actions.edit')}
                            onClick={() => openEdit(item)}
                          >
                            <i className="ri-pencil-line"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger-light"
                            title={tc('actions.deactivate')}
                            onClick={() => openDelete(item)}
                            disabled={item.status === 'INACTIVE'}
                          >
                            <i className="ri-forbid-line"></i>
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

      {/* ── Create Modal ─────────────────────────────────────────────────── */}
      {showCreate && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className="ri-add-line me-2 text-primary"></i>
                    {t('types.modal_create')}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowCreate(false)} aria-label={tc('actions.close')}></button>
                </div>
                <form onSubmit={handleCreate} noValidate>
                  <div className="modal-body">
                    {createError && (
                      <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
                        <i className="ri-error-warning-line flex-shrink-0"></i>
                        <span>{createError}</span>
                      </div>
                    )}
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('types.table_code')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={createForm.code}
                          onChange={e => setCreateForm(f => ({ ...f, code: e.target.value }))}
                          required
                          placeholder={t('types.form_code_placeholder')}
                        />
                        <div className="form-text">{t('types.form_code_helper')}</div>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('types.table_label')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={createForm.label}
                          onChange={e => setCreateForm(f => ({ ...f, label: e.target.value }))}
                          required
                          placeholder={t('types.form_label_placeholder')}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={() => setShowCreate(false)}>
                      {tc('actions.cancel')}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={createLoading}>
                      {createLoading
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>{t('types.btn_creating')}</>
                        : <><i className="ri-save-line me-2"></i>{tc('actions.create')}</>
                      }
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {showEdit && editingItem && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className="ri-pencil-line me-2 text-primary"></i>
                    {t('types.modal_edit')} — <code>{editingItem.code}</code>
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowEdit(false)} aria-label={tc('actions.close')}></button>
                </div>
                <form onSubmit={handleEdit} noValidate>
                  <div className="modal-body">
                    {editError && (
                      <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
                        <i className="ri-error-warning-line flex-shrink-0"></i>
                        <span>{editError}</span>
                      </div>
                    )}
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('types.table_label')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={editForm.label}
                          onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">{tc('table.status')}</label>
                        <select
                          className="form-select"
                          value={editForm.status}
                          onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                        >
                          <option value="ACTIVE">{tc('status.active')}</option>
                          <option value="INACTIVE">{tc('status.inactive')}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-light" onClick={() => setShowEdit(false)}>
                      {tc('actions.cancel')}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={editLoading}>
                      {editLoading
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>{tc('messages.saving')}</>
                        : <><i className="ri-save-line me-2"></i>{tc('actions.save')}</>
                      }
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Delete / Deactivate Modal ─────────────────────────────────────── */}
      {showDelete && deletingItem && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className="ri-forbid-line me-2 text-warning"></i>
                    {t('types.deactivate_title')}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowDelete(false)} aria-label={tc('actions.close')}></button>
                </div>
                <div className="modal-body">
                  <p className="mb-1">
                    {t('types.deactivate_text')} <strong>{deletingItem.label}</strong>?
                  </p>
                  <p className="text-muted mb-0 fs-13">
                    {t('types.deactivate_info')}
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowDelete(false)}>
                    {tc('actions.cancel')}
                  </button>
                  <button type="button" className="btn btn-warning" onClick={handleDelete} disabled={deleteLoading}>
                    {deleteLoading
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>{tc('messages.processing')}</>
                      : <><i className="ri-forbid-line me-2"></i>{tc('actions.deactivate')}</>
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
