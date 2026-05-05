import { useState, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

interface UserLevelItem {
  id: number;
  code: string;
  label: string;
  order: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM = { code: '', label: '', order: '0' };
const EMPTY_EDIT_FORM = { label: '', order: '0', status: 'ACTIVE' };

function StatusBadge({ status }: { status: string }) {
  const { t: tc } = useTranslation('common');
  if (status === 'ACTIVE') return <span className="badge bg-success-transparent text-success">{tc('status.active')}</span>;
  if (status === 'INACTIVE') return <span className="badge bg-warning-transparent text-warning">{tc('status.inactive')}</span>;
  return <span className="badge bg-secondary-transparent text-secondary">{status}</span>;
}

export default function UserLevelsPage() {
  const { token } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('users');
  const { t: tc } = useTranslation('common');

  const [items, setItems] = useState<UserLevelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editingItem, setEditingItem] = useState<UserLevelItem | null>(null);
  const [editForm, setEditForm] = useState({ ...EMPTY_EDIT_FORM });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete modal
  const [showDelete, setShowDelete] = useState(false);
  const [deletingItem, setDeletingItem] = useState<UserLevelItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  function loadData() {
    setLoading(true);
    apiFetch(`${api}/user-levels`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setItems(Array.isArray(data) ? data : []);
        setPageError('');
      })
      .catch(() => setPageError(tc('errors.generic')))
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
      const res = await apiFetch(`${api}/user-levels`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          code: createForm.code,
          label: createForm.label,
          order: Number(createForm.order),
        }),
      });
      const data = await res.json() as { message?: string | string[] } & Partial<UserLevelItem>;
      if (!res.ok) {
        const msg = data.message;
        setCreateError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? tc('errors.generic')));
        return;
      }
      setItems(prev => [...prev, data as UserLevelItem].sort((a, b) => a.order - b.order));
      setShowCreate(false);
      showToast('success', t('levels.success.created'));
    } catch {
      setCreateError(tc('errors.generic'));
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────

  function openEdit(item: UserLevelItem) {
    setEditingItem(item);
    setEditForm({ label: item.label, order: String(item.order), status: item.status });
    setEditError('');
    setShowEdit(true);
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setEditError('');
    setEditLoading(true);
    try {
      const res = await apiFetch(`${api}/user-levels/${editingItem.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          label: editForm.label,
          order: Number(editForm.order),
          status: editForm.status,
        }),
      });
      const data = await res.json() as { message?: string | string[] } & Partial<UserLevelItem>;
      if (!res.ok) {
        const msg = data.message;
        setEditError(Array.isArray(msg) ? msg.join(' · ') : (msg ?? tc('errors.generic')));
        return;
      }
      setItems(prev =>
        prev.map(i => i.id === (data as UserLevelItem).id ? (data as UserLevelItem) : i)
          .sort((a, b) => a.order - b.order)
      );
      setShowEdit(false);
      showToast('success', t('levels.success.updated'));
    } catch {
      setEditError(tc('errors.generic'));
    } finally {
      setEditLoading(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────

  function openDelete(item: UserLevelItem) {
    setDeletingItem(item);
    setShowDelete(true);
  }

  async function handleDelete() {
    if (!deletingItem) return;
    setDeleteLoading(true);
    try {
      const res = await apiFetch(`${api}/user-levels/${deletingItem.id}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        const data = await res.json() as UserLevelItem;
        setItems(prev => prev.map(i => i.id === data.id ? data : i));
        setShowDelete(false);
        setDeletingItem(null);
        showToast('success', t('levels.success.deactivated'));
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
          <h1 className="page-title fw-medium fs-18 mb-2">{t('levels.page_title')}</h1>
          <nav>
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item"><a href="/dashboard" className="text-primary">{tc('nav.dashboard')}</a></li>
              <li className="breadcrumb-item active">{t('levels.page_title')}</li>
            </ol>
          </nav>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <i className="ri-add-line fs-16"></i>
          {t('levels.btn.add')}
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
              <i className="ri-bar-chart-line me-2 text-primary"></i>
              {t('levels.page_subtitle')}
            </h6>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary-transparent text-primary">{items.length}</span>
            <button className="btn btn-sm btn-light" onClick={loadData}>
              <i className="ri-refresh-line"></i>
            </button>
          </div>
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
                    <th>{t('levels.table.code')}</th>
                    <th>{t('levels.table.label')}</th>
                    <th style={{ width: '80px' }}>{t('levels.table.order')}</th>
                    <th>{t('levels.table.status')}</th>
                    <th className="text-end pe-4" style={{ width: '100px' }}>{t('levels.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-5">
                        <i className="ri-inbox-line fs-24 d-block mb-2"></i>
                        {tc('search.empty')}
                      </td>
                    </tr>
                  ) : items.map(item => (
                    <tr key={item.id}>
                      <td className="ps-4 text-muted fs-13">#{item.id}</td>
                      <td>
                        <code className="bg-light px-2 py-1 rounded fs-12">{item.code}</code>
                      </td>
                      <td className="fw-medium">{item.label}</td>
                      <td className="text-muted fs-13">{item.order}</td>
                      <td><StatusBadge status={item.status} /></td>
                      <td className="text-end pe-4">
                        <button
                          className="btn btn-sm btn-primary-light me-1"
                          title={tc('actions.edit')}
                          onClick={() => openEdit(item)}
                        >
                          <i className="ri-pencil-line"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-danger-light"
                          title={tc('actions.delete')}
                          onClick={() => openDelete(item)}
                          disabled={item.status === 'INACTIVE'}
                        >
                          <i className="ri-forbid-line"></i>
                        </button>
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
                    {t('levels.modal.create_title')}
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
                          {t('levels.form.code')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={createForm.code}
                          onChange={e => setCreateForm(f => ({ ...f, code: e.target.value }))}
                          required
                          placeholder={t('levels.form.code_placeholder')}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('levels.form.label')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={createForm.label}
                          onChange={e => setCreateForm(f => ({ ...f, label: e.target.value }))}
                          required
                          placeholder={t('levels.form.label_placeholder')}
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">{t('levels.form.order')}</label>
                        <input
                          type="number"
                          className="form-control"
                          value={createForm.order}
                          onChange={e => setCreateForm(f => ({ ...f, order: e.target.value }))}
                          min="0"
                          placeholder="0"
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
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>...</>
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
                    {t('levels.modal.edit_title')} — <code>{editingItem.code}</code>
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
                          {t('levels.form.label')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={editForm.label}
                          onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">{t('levels.form.order')}</label>
                        <input
                          type="number"
                          className="form-control"
                          value={editForm.order}
                          onChange={e => setEditForm(f => ({ ...f, order: e.target.value }))}
                          min="0"
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-medium">{tc('status.active')}</label>
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
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>...</>
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

      {/* ── Deactivate Modal ─────────────────────────────────────────────── */}
      {showDelete && deletingItem && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className="ri-forbid-line me-2 text-warning"></i>
                    {tc('messages.confirm_delete_title')}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowDelete(false)} aria-label={tc('actions.close')}></button>
                </div>
                <div className="modal-body">
                  <p className="mb-1">
                    {tc('messages.confirm_delete_text')} <strong>{deletingItem.label}</strong>?
                  </p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setShowDelete(false)}>
                    {tc('actions.cancel')}
                  </button>
                  <button type="button" className="btn btn-warning" onClick={handleDelete} disabled={deleteLoading}>
                    {deleteLoading
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>...</>
                      : <><i className="ri-forbid-line me-2"></i>{tc('actions.confirm')}</>
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
