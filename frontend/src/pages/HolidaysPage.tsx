import { useState, useEffect, useRef, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useIsPlatformAdmin } from '../hooks/useIsPlatformAdmin';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { formatDate as fmtDate, toFlatpickrFormat } from '../lib/dateFormatting';

declare const flatpickr: (el: HTMLElement, opts?: object) => { destroy(): void };

// ─── Types ────────────────────────────────────────────────────────────────────

interface HolidayDateItem {
  publicId: string;
  name: string;
  date: string; // ISO string, UTC midnight
  status: string;
}

interface HolidayItem {
  publicId: string;
  name: string;
  description: string | null;
  status: string;
  _count: { dates: number };
  createdAt: string;
  updatedAt: string;
}

interface HolidayDetail extends HolidayItem {
  dates: HolidayDateItem[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_HOL_FORM = { name: '', description: '' };
const EMPTY_DATE_FORM = { name: '', date: '' };

// ─── Small helpers ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const { t: tc } = useTranslation('common');
  if (status === 'ACTIVE')
    return <span className="badge bg-success-transparent text-success">{tc('status.active')}</span>;
  if (status === 'INACTIVE')
    return <span className="badge bg-danger-transparent text-danger">{tc('status.inactive')}</span>;
  return <span className="badge bg-secondary-transparent text-secondary">{status}</span>;
}

// Wrapper para o helper central — sem contexto de projecto, cai no DEFAULT_DATE_FORMAT.
const formatDate = (iso: string): string => fmtDate(iso);

function parseApiError(data: { message?: string | string[] }, fallback: string): string {
  const msg = data.message;
  if (!msg) return fallback;
  return Array.isArray(msg) ? msg.join(' · ') : msg;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HolidaysPage() {
  const { token } = useAuth();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('holidays');
  const { t: tc } = useTranslation('common');
  const isAdmin = useIsPlatformAdmin();

  // ── Feature flag
  const [canCreate, setCanCreate] = useState(false);

  // ── Data
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [selectedHoliday, setSelectedHoliday] = useState<HolidayDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pageError, setPageError] = useState('');

  // ── Holiday modal (create / edit)
  const [showHolModal, setShowHolModal] = useState(false);
  const [editingHol, setEditingHol] = useState<HolidayItem | null>(null);
  const [holForm, setHolForm] = useState({ ...EMPTY_HOL_FORM });
  const [holFormError, setHolFormError] = useState('');
  const [holFormLoading, setHolFormLoading] = useState(false);

  // ── Delete holiday modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingHol, setDeletingHol] = useState<HolidayItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Add date modal
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateForm, setDateForm] = useState({ ...EMPTY_DATE_FORM });
  const [dateFormError, setDateFormError] = useState('');
  const [dateFormLoading, setDateFormLoading] = useState(false);

  // ── Per-date action loading
  const [dateActionLoading, setDateActionLoading] = useState<string | null>(null);

  // ── Edit date modal
  const [editDateModal, setEditDateModal] = useState<{ publicId: string; name: string; date: string } | null>(null);
  const [editDateFormError, setEditDateFormError] = useState('');
  const [editDateFormLoading, setEditDateFormLoading] = useState(false);

  // ── FlatPickr refs
  const fpDateRef = useRef<HTMLInputElement>(null);
  const fpEditDateRef = useRef<HTMLInputElement>(null);

  // ── Auth header
  function h() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  // ── Check feature flag ───────────────────────────────────────────────────────

  useEffect(() => {
    if (isAdmin) {
      setCanCreate(true);
      return;
    }
    apiFetch(`${api}/feature-flags/check/multi_holiday`, { headers: h() })
      .then(r => r.json())
      .then(data => setCanCreate(data.enabled === true))
      .catch(() => setCanCreate(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load list ────────────────────────────────────────────────────────────────

  function loadHolidays() {
    setLoading(true);
    apiFetch(`${api}/holidays`, { headers: h() })
      .then(r => r.json())
      .then(data => {
        setHolidays(Array.isArray(data) ? data : []);
        setPageError('');
      })
      .catch(() => setPageError(tc('errors.generic')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadHolidays(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load detail ──────────────────────────────────────────────────────────────

  async function loadDetail(publicId: string) {
    setDetailLoading(true);
    try {
      const res = await apiFetch(`${api}/holidays/${publicId}`, { headers: h() });
      const data = await res.json() as HolidayDetail;
      setSelectedHoliday(data);
    } catch {
      showToast('danger', tc('errors.generic'));
    } finally {
      setDetailLoading(false);
    }
  }

  function selectHoliday(hol: HolidayItem) {
    loadDetail(hol.publicId);
  }

  // ── Body scroll lock ─────────────────────────────────────────────────────────

  const anyModalOpen = showHolModal || showDeleteModal || showDateModal || editDateModal !== null;
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [anyModalOpen]);

  // ── FlatPickr (add-date modal) ───────────────────────────────────────────────

  useEffect(() => {
    if (!showDateModal || typeof flatpickr === 'undefined') return;
    const fp = flatpickr(fpDateRef.current!, {
      dateFormat: toFlatpickrFormat(undefined),
      allowInput: true,
      onChange: (dates: Date[]) => {
        const d = dates[0];
        if (d) {
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          setDateForm(f => ({ ...f, date: iso }));
        }
      },
    });
    return () => fp.destroy();
  }, [showDateModal]);

  // ── FlatPickr (edit-date modal) ──────────────────────────────────────────────

  useEffect(() => {
    if (!editDateModal || typeof flatpickr === 'undefined') return;
    const fp = flatpickr(fpEditDateRef.current!, {
      dateFormat: toFlatpickrFormat(undefined),
      allowInput: true,
      defaultDate: editDateModal.date || undefined,
      onChange: (dates: Date[]) => {
        const d = dates[0];
        if (d) {
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          setEditDateModal(m => m ? { ...m, date: iso } : null);
        }
      },
    });
    return () => fp.destroy();
  }, [!!editDateModal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Holiday CRUD ─────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingHol(null);
    setHolForm({ ...EMPTY_HOL_FORM });
    setHolFormError('');
    setShowHolModal(true);
  }

  function openEdit(hol: HolidayItem) {
    setEditingHol(hol);
    setHolForm({ name: hol.name, description: hol.description ?? '' });
    setHolFormError('');
    setShowHolModal(true);
  }

  async function handleHolSubmit(e: FormEvent) {
    e.preventDefault();
    setHolFormError('');
    setHolFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: holForm.name,
        description: holForm.description || undefined,
      };
      const url = editingHol
        ? `${api}/holidays/${editingHol.publicId}`
        : `${api}/holidays`;
      const method = editingHol ? 'PATCH' : 'POST';
      const res = await apiFetch(url, { method, headers: h(), body: JSON.stringify(body) });
      const data = await res.json() as { message?: string | string[] } & Partial<HolidayItem>;

      if (!res.ok) {
        setHolFormError(parseApiError(data as { message?: string | string[] }, tc('errors.generic')));
        return;
      }

      const saved = data as HolidayItem;
      if (editingHol) {
        setHolidays(prev => prev.map(h => h.publicId === saved.publicId ? saved : h));
        if (selectedHoliday?.publicId === saved.publicId) {
          setSelectedHoliday(prev => prev ? { ...prev, ...saved } : null);
        }
        showToast('success', t('success.updated'));
      } else {
        setHolidays(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
        showToast('success', t('success.created'));
      }
      setShowHolModal(false);
    } catch {
      setHolFormError(tc('errors.generic'));
    } finally {
      setHolFormLoading(false);
    }
  }

  function openDelete(hol: HolidayItem) {
    setDeletingHol(hol);
    setShowDeleteModal(true);
  }

  async function handleDeleteHol() {
    if (!deletingHol) return;
    setDeleteLoading(true);
    try {
      const res = await apiFetch(`${api}/holidays/${deletingHol.publicId}`, {
        method: 'DELETE',
        headers: h(),
      });

      if (res.status === 409) {
        const data = await res.json() as { message?: string | string[] };
        showToast('danger', parseApiError(data, tc('errors.generic')));
        setShowDeleteModal(false);
        return;
      }

      if (res.ok) {
        setHolidays(prev => prev.filter(h => h.publicId !== deletingHol.publicId));
        if (selectedHoliday?.publicId === deletingHol.publicId) {
          setSelectedHoliday(null);
        }
        setShowDeleteModal(false);
        showToast('success', t('success.deleted'));
      } else {
        const data = await res.json() as { message?: string | string[] };
        showToast('danger', parseApiError(data, tc('errors.generic')));
        setShowDeleteModal(false);
      }
    } catch {
      showToast('danger', tc('errors.generic'));
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  // ── Date CRUD ────────────────────────────────────────────────────────────────

  function openAddDate() {
    setDateForm({ ...EMPTY_DATE_FORM });
    setDateFormError('');
    setShowDateModal(true);
  }

  async function handleDateSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedHoliday) return;
    setDateFormError('');
    setDateFormLoading(true);
    try {
      const res = await apiFetch(`${api}/holidays/${selectedHoliday.publicId}/dates`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify({ name: dateForm.name, date: dateForm.date }),
      });
      const data = await res.json() as { message?: string | string[] } & Partial<HolidayDetail>;

      if (!res.ok) {
        setDateFormError(parseApiError(data as { message?: string | string[] }, tc('errors.generic')));
        return;
      }

      await loadDetail(selectedHoliday.publicId);
      setHolidays(prev => prev.map(h =>
        h.publicId === selectedHoliday.publicId
          ? { ...h, _count: { dates: h._count.dates + 1 } }
          : h
      ));
      setShowDateModal(false);
      showToast('success', t('success.date_added'));
    } catch {
      setDateFormError(tc('errors.generic'));
    } finally {
      setDateFormLoading(false);
    }
  }

  function openEditDate(date: HolidayDateItem) {
    setEditDateFormError('');
    setEditDateModal({ publicId: date.publicId, name: date.name, date: date.date.slice(0, 10) });
  }

  async function handleEditDateSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editDateModal || !selectedHoliday) return;
    setEditDateFormError('');
    setEditDateFormLoading(true);
    try {
      const res = await apiFetch(
        `${api}/holidays/${selectedHoliday.publicId}/dates/${editDateModal.publicId}`,
        {
          method: 'PATCH',
          headers: h(),
          body: JSON.stringify({ name: editDateModal.name, date: editDateModal.date }),
        }
      );
      const data = await res.json() as { message?: string | string[] } & Partial<HolidayDateItem>;
      if (!res.ok) {
        setEditDateFormError(parseApiError(data as { message?: string | string[] }, tc('errors.generic')));
        return;
      }
      const updated = data as HolidayDateItem;
      setSelectedHoliday(prev =>
        prev
          ? { ...prev, dates: prev.dates.map(d => d.publicId === updated.publicId ? updated : d) }
          : null
      );
      setEditDateModal(null);
      showToast('success', t('success.date_updated'));
    } catch {
      setEditDateFormError(tc('errors.generic'));
    } finally {
      setEditDateFormLoading(false);
    }
  }

  async function handleToggleDateStatus(date: HolidayDateItem) {
    if (!selectedHoliday) return;
    setDateActionLoading(date.publicId);
    const newStatus = date.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const prevStatus = date.status;
    try {
      const res = await apiFetch(
        `${api}/holidays/${selectedHoliday.publicId}/dates/${date.publicId}`,
        {
          method: 'PATCH',
          headers: h(),
          body: JSON.stringify({ status: newStatus }),
        }
      );
      if (res.ok) {
        setSelectedHoliday(prev =>
          prev
            ? {
                ...prev,
                dates: prev.dates.map(d =>
                  d.publicId === date.publicId ? { ...d, status: newStatus } : d
                ),
              }
            : null
        );
        showToast(
          'success',
          prevStatus === 'ACTIVE' ? t('success.date_deactivated') : t('success.date_activated')
        );
      } else {
        const data = await res.json() as { message?: string | string[] };
        showToast('danger', parseApiError(data, tc('errors.generic')));
      }
    } catch {
      showToast('danger', tc('errors.generic'));
    } finally {
      setDateActionLoading(null);
    }
  }

  async function handleDeleteDate(date: HolidayDateItem) {
    if (!selectedHoliday) return;
    setDateActionLoading(date.publicId);
    try {
      const res = await apiFetch(
        `${api}/holidays/${selectedHoliday.publicId}/dates/${date.publicId}`,
        { method: 'DELETE', headers: h() }
      );
      if (res.ok) {
        setSelectedHoliday(prev =>
          prev
            ? { ...prev, dates: prev.dates.filter(d => d.publicId !== date.publicId) }
            : null
        );
        setHolidays(prev => prev.map(h =>
          h.publicId === selectedHoliday.publicId
            ? { ...h, _count: { dates: Math.max(0, h._count.dates - 1) } }
            : h
        ));
        showToast('success', t('success.date_deleted'));
      } else {
        const data = await res.json() as { message?: string | string[] };
        showToast('danger', parseApiError(data, tc('errors.generic')));
      }
    } catch {
      showToast('danger', tc('errors.generic'));
    } finally {
      setDateActionLoading(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page Header */}
      <div className="d-md-flex d-block align-items-center justify-content-between my-4 page-header-breadcrumb">
        <h1 className="page-header-title fw-semibold fs-18 flex-grow-1 mb-0">{t('page.title')}</h1>
      </div>

      {pageError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4">
          <i className="ri-error-warning-line fs-18"></i>
          {pageError}
        </div>
      )}

      <div className="row g-4">

        {/* ── Left Panel: Holiday List ──────────────────────────────────────── */}
        <div className="col-md-4">
          <div className="card custom-card h-100">
            <div className="card-header d-flex align-items-center justify-content-between">
              <h6 className="card-title mb-0">
                <i className="ri-calendar-line me-2 text-primary"></i>
                {t('list.title')}
              </h6>
              <div className="d-flex align-items-center gap-2">
                <button
                  className="btn btn-sm btn-light"
                  onClick={loadHolidays}
                  title={tc('actions.refresh')}
                >
                  <i className="ri-refresh-line"></i>
                </button>
                {canCreate && (
                  <button
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                    onClick={openCreate}
                  >
                    <i className="ri-add-line"></i>
                    {t('btn.add')}
                  </button>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">{tc('loading')}</span>
                  </div>
                </div>
              ) : holidays.length === 0 ? (
                <div className="text-center text-muted py-5 px-3">
                  <i className="ri-calendar-line fs-36 d-block mb-3 opacity-50"></i>
                  {canCreate ? (
                    <p className="mb-0 fs-14">{t('list.empty_can_create')}</p>
                  ) : (
                    <>
                      <p className="mb-1 fs-14 fw-medium">{t('feature.unavailable_title')}</p>
                      <p className="mb-0 fs-13">{t('feature.unavailable_text')}</p>
                    </>
                  )}
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {holidays.map(hol => {
                    const isSelected = selectedHoliday?.publicId === hol.publicId;
                    return (
                      <li
                        key={hol.publicId}
                        className={`list-group-item list-group-item-action px-3 py-3 cursor-pointer${isSelected ? ' bg-primary-transparent' : ''}`}
                        onClick={() => selectHoliday(hol)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="d-flex align-items-start justify-content-between gap-2">
                          <div className="flex-grow-1 min-width-0">
                            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                              <span className={`fw-medium fs-14${isSelected ? ' text-primary' : ''}`}>
                                {hol.name}
                              </span>
                            </div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <span className="badge bg-light text-muted fs-11">
                                <i className="ri-calendar-event-line me-1"></i>
                                {t('list.date_count', { count: hol._count.dates })}
                              </span>
                              <StatusBadge status={hol.status} />
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              className="btn btn-sm btn-primary-light"
                              title={tc('actions.edit')}
                              onClick={() => openEdit(hol)}
                            >
                              <i className="ri-pencil-line"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-danger-light"
                              title={tc('actions.delete')}
                              onClick={() => openDelete(hol)}
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Panel: Holiday Detail ───────────────────────────────────── */}
        <div className="col-md-8">
          <div className="card custom-card h-100">
            {!selectedHoliday && !detailLoading ? (
              <div className="card-body d-flex align-items-center justify-content-center text-center text-muted py-5">
                <div>
                  <i className="ri-calendar-line fs-36 d-block mb-3 text-muted opacity-50"></i>
                  <p className="mb-0 fs-15">{t('detail.empty_hint')}</p>
                </div>
              </div>
            ) : detailLoading ? (
              <div className="card-body d-flex align-items-center justify-content-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">{tc('loading')}</span>
                </div>
              </div>
            ) : selectedHoliday ? (
              <>
                <div className="card-header d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h6 className="card-title mb-0">
                      <i className="ri-calendar-event-line me-2 text-primary"></i>
                      {selectedHoliday.name}
                    </h6>
                    <StatusBadge status={selectedHoliday.status} />
                  </div>
                  <button
                    className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                    onClick={openAddDate}
                  >
                    <i className="ri-add-line"></i>
                    {t('btn.add_date')}
                  </button>
                </div>

                {selectedHoliday.description && (
                  <div className="card-body border-bottom py-2 px-3">
                    <p className="text-muted fs-13 mb-0">{selectedHoliday.description}</p>
                  </div>
                )}

                <div className="card-body p-0">
                  {selectedHoliday.dates.length === 0 ? (
                    <div className="text-center text-muted py-5 px-3">
                      <i className="ri-calendar-2-line fs-24 d-block mb-2"></i>
                      {t('detail.dates_empty')}
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="ps-4">{t('table.name')}</th>
                            <th>{t('table.date')}</th>
                            <th style={{ width: '120px' }}>{t('table.status')}</th>
                            <th style={{ width: '110px' }}>{tc('table.actions')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedHoliday.dates.map(date => (
                            <tr key={date.publicId}>
                              <td className="ps-4 fw-medium">{date.name}</td>
                              <td className="text-muted fs-13">
                                <i className="ri-calendar-line me-1"></i>
                                {formatDate(date.date)}
                              </td>
                              <td>
                                {dateActionLoading === date.publicId ? (
                                  <span className="spinner-border spinner-border-sm text-primary" role="status">
                                    <span className="visually-hidden">{tc('loading')}</span>
                                  </span>
                                ) : (
                                  <button
                                    className="btn btn-sm p-0 border-0 bg-transparent"
                                    title={date.status === 'ACTIVE' ? tc('actions.deactivate') : tc('actions.activate')}
                                    onClick={() => handleToggleDateStatus(date)}
                                    disabled={!!dateActionLoading}
                                  >
                                    <StatusBadge status={date.status} />
                                  </button>
                                )}
                              </td>
                              <td>
                                <div className="d-flex gap-1">
                                  <button
                                    className="btn btn-sm btn-warning-light"
                                    title={tc('actions.edit')}
                                    onClick={() => openEditDate(date)}
                                    disabled={!!dateActionLoading}
                                  >
                                    <i className="ri-pencil-line"></i>
                                  </button>
                                  <button
                                    className="btn btn-sm btn-danger-light"
                                    title={tc('actions.delete')}
                                    onClick={() => handleDeleteDate(date)}
                                    disabled={!!dateActionLoading}
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
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Create / Edit Holiday Modal ──────────────────────────────────────────── */}
      {showHolModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className={`${editingHol ? 'ri-pencil-line' : 'ri-calendar-line'} me-2 text-primary`}></i>
                    {editingHol ? t('modal.hol.edit_title') : t('modal.hol.create_title')}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowHolModal(false)}
                    aria-label={tc('actions.close')}
                  ></button>
                </div>
                <form onSubmit={handleHolSubmit} noValidate>
                  <div className="modal-body">
                    {holFormError && (
                      <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
                        <i className="ri-error-warning-line flex-shrink-0"></i>
                        <span>{holFormError}</span>
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
                          value={holForm.name}
                          onChange={e => setHolForm(f => ({ ...f, name: e.target.value }))}
                          required
                          placeholder={t('form.name_placeholder')}
                          autoFocus
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">{t('form.description')}</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={holForm.description}
                          onChange={e => setHolForm(f => ({ ...f, description: e.target.value }))}
                          placeholder={t('form.description_placeholder')}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => setShowHolModal(false)}
                    >
                      {tc('actions.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={holFormLoading || !holForm.name.trim()}
                    >
                      {holFormLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          {tc('actions.saving')}
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line me-2"></i>
                          {tc('actions.save')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Delete Holiday Confirmation Modal ────────────────────────────────────── */}
      {showDeleteModal && deletingHol && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className="ri-delete-bin-line me-2 text-danger"></i>
                    {t('modal.delete.title')}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeleteModal(false)}
                    aria-label={tc('actions.close')}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-1">
                    {t('modal.delete.body', { name: deletingHol.name })}
                  </p>
                  <p className="text-muted mb-0 fs-13">
                    {t('modal.delete.warning')}
                  </p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    {tc('actions.cancel')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleDeleteHol}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        {tc('actions.deleting')}
                      </>
                    ) : (
                      <>
                        <i className="ri-delete-bin-line me-2"></i>
                        {tc('actions.delete')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Edit Date Modal ──────────────────────────────────────────────────────── */}
      {editDateModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className="ri-pencil-line me-2 text-warning"></i>
                    {t('modal.edit_date.title')}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setEditDateModal(null)}
                    aria-label={tc('actions.close')}
                  ></button>
                </div>
                <form onSubmit={handleEditDateSubmit} noValidate>
                  <div className="modal-body">
                    {editDateFormError && (
                      <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
                        <i className="ri-error-warning-line flex-shrink-0"></i>
                        <span>{editDateFormError}</span>
                      </div>
                    )}
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('form.date_name')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={editDateModal.name}
                          onChange={e => setEditDateModal(m => m ? { ...m, name: e.target.value } : null)}
                          required
                          autoFocus
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('form.date')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          ref={fpEditDateRef}
                          placeholder="DD-MM-YYYY"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => setEditDateModal(null)}
                    >
                      {tc('actions.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={editDateFormLoading || !editDateModal.name.trim() || !editDateModal.date}
                    >
                      {editDateFormLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          {tc('actions.saving')}
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line me-2"></i>
                          {tc('actions.save')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Add Date Modal ───────────────────────────────────────────────────────── */}
      {showDateModal && (
        <>
          <div className="modal-backdrop fade show"></div>
          <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-semibold">
                    <i className="ri-calendar-event-line me-2 text-primary"></i>
                    {t('modal.add_date.title')}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDateModal(false)}
                    aria-label={tc('actions.close')}
                  ></button>
                </div>
                <form onSubmit={handleDateSubmit} noValidate>
                  <div className="modal-body">
                    {dateFormError && (
                      <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3">
                        <i className="ri-error-warning-line flex-shrink-0"></i>
                        <span>{dateFormError}</span>
                      </div>
                    )}
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('form.date_name')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          value={dateForm.name}
                          onChange={e => setDateForm(f => ({ ...f, name: e.target.value }))}
                          required
                          placeholder={t('form.date_name_placeholder')}
                          autoFocus
                        />
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-medium">
                          {t('form.date')} <span className="text-danger">*</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          ref={fpDateRef}
                          placeholder="DD-MM-YYYY"
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-light"
                      onClick={() => setShowDateModal(false)}
                    >
                      {tc('actions.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={dateFormLoading || !dateForm.name.trim() || !dateForm.date}
                    >
                      {dateFormLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          {tc('actions.saving')}
                        </>
                      ) : (
                        <>
                          <i className="ri-save-line me-2"></i>
                          {t('btn.add_date_submit')}
                        </>
                      )}
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
