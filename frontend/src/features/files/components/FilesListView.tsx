import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileIcon, defaultStyles } from 'react-file-icon';
import { useToast } from '../../../contexts/ToastContext';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { formatDate } from '../../../lib/dateFormatting';
import { avatarColorFor, initialsOf } from '../../../lib/avatars';
import {
  ProjectAction,
  useProjectPermissions,
} from '../../../hooks/useProjectPermissions';
import { useFiles, useUploadsAvailability } from '../useFiles';
import { FileUploadButton } from './FileUploadButton';
import { ScanStatusBadge } from './ScanStatusBadge';
import { StorageUsageBar } from './StorageUsageBar';
import { parseErrorContext, formatUploadError } from '../errors';
import type { AppFile } from '../types';
import '../files-list.css';

interface Props {
  projectPublicId: string;
  /** `null` ⇒ tab "Ficheiros do Projeto" (lista project-level apenas).
   *  String ⇒ tab "Ficheiros" do TaskModal (lista da task específica). */
  taskPublicId: string | null;
  enabled?: boolean;
}

type ChipKey = 'all' | 'pdf' | 'docs' | 'sheets' | 'images' | 'others';
type SortKey = 'name' | 'size' | 'uploader' | 'date';
type SortDir = 'asc' | 'desc';
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 5;

const IMAGE_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'tif',
  'ico', 'avif', 'heic', 'svg',
]);
const DOC_EXTS = new Set(['doc', 'docx', 'odt', 'rtf', 'txt']);
const SHEET_EXTS = new Set(['xls', 'xlsx', 'csv', 'ods']);

function extOf(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? '' : name.slice(idx + 1).toLowerCase();
}

function categoryOf(file: AppFile): ChipKey {
  const ext = extOf(file.originalName);
  if (ext === 'pdf') return 'pdf';
  if (DOC_EXTS.has(ext)) return 'docs';
  if (SHEET_EXTS.has(ext)) return 'sheets';
  if (IMAGE_EXTS.has(ext)) return 'images';
  return 'others';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Lista de páginas estilo "1 ... 4 5 6 ... 21" — alinhado com `TaskTable`. */
function buildPageList(current: number, total: number): Array<number | 'ellipsis-left' | 'ellipsis-right'> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: Array<number | 'ellipsis-left' | 'ellipsis-right'> = [1];
  if (current > 3) pages.push('ellipsis-left');
  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p++) pages.push(p);
  if (current < total - 2) pages.push('ellipsis-right');
  pages.push(total);
  return pages;
}

/**
 * Lista unificada de ficheiros — usada na tab "Ficheiros do Projeto"
 * da PlanningPage e na tab "Ficheiros" do TaskModal.
 *
 * Card com header (título + contagem + CTA), toolbar (busca + chips),
 * tabela ordenável, kebab menu por linha, paginação client-side.
 *
 * Scoping crítico:
 *   - taskPublicId === null  ⇒ project-level (scope='project')
 *   - taskPublicId === string ⇒ ficheiros da task (filtro `?taskPublicId=`)
 */
export function FilesListView({
  projectPublicId,
  taskPublicId,
  enabled = true,
}: Props) {
  const { t } = useTranslation('files');
  const { t: tc } = useTranslation('common');
  const { showToast } = useToast();
  const dateFormat = useResolvedDateFormat();
  const { can, loading: permLoading } = useProjectPermissions(projectPublicId);
  const uploadsAvailable = useUploadsAvailability();

  const canView = can(ProjectAction.FILE_VIEW);
  const canUpload = can(ProjectAction.FILE_UPLOAD);
  const canRename = can(ProjectAction.FILE_RENAME);
  const canDelete = can(ProjectAction.FILE_DELETE);

  const { files, loading, upload, replace, rename, remove, getDownloadUrl } = useFiles({
    projectPublicId,
    taskPublicId,
    scope: taskPublicId ? 'all' : 'project',
    enabled: enabled && canView,
  });

  const [chip, setChip] = useState<ChipKey>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<AppFile | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<AppFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppFile | null>(null);

  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);

  const counts = useMemo<Record<ChipKey, number>>(() => {
    const c: Record<ChipKey, number> = { all: files.length, pdf: 0, docs: 0, sheets: 0, images: 0, others: 0 };
    for (const f of files) c[categoryOf(f)] += 1;
    return c;
  }, [files]);

  const visible = useMemo(() => {
    let arr = files;
    if (chip !== 'all') arr = arr.filter((f) => categoryOf(f) === chip);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter((f) => f.originalName.toLowerCase().includes(q));
    }
    const cmp = (a: AppFile, b: AppFile): number => {
      let v = 0;
      switch (sortKey) {
        case 'name':     v = a.originalName.localeCompare(b.originalName, undefined, { sensitivity: 'base' }); break;
        case 'size':     v = a.sizeBytes - b.sizeBytes; break;
        case 'uploader': v = (a.uploadedBy?.name ?? '').localeCompare(b.uploadedBy?.name ?? '', undefined, { sensitivity: 'base' }); break;
        case 'date':     v = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(); break;
      }
      return sortDir === 'asc' ? v : -v;
    };
    return [...arr].sort(cmp);
  }, [files, chip, search, sortKey, sortDir]);

  // Paginação derivada
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => visible.slice((safePage - 1) * pageSize, safePage * pageSize),
    [visible, safePage, pageSize],
  );

  // Repor para a 1ª página quando filtros/sort/tamanho mudam.
  useEffect(() => { setPage(1); }, [chip, search, sortKey, sortDir, pageSize]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'date' || key === 'size' ? 'desc' : 'asc');
    }
  }

  // Fecha kebab ao clicar fora.
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!openMenuFor) return;
    function onDoc(e: MouseEvent) {
      const tgt = e.target as Node;
      if (wrapRef.current && !wrapRef.current.contains(tgt)) setOpenMenuFor(null);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [openMenuFor]);

  if (permLoading) return <div className="text-muted">…</div>;
  if (!canView) return null;

  // ─── Handlers ──────────────────────────────────────────────────────────

  async function handleUpload(file: File) {
    try {
      await upload(file);
      showToast('success', t('upload.btn_submit'));
    } catch (err) {
      showToast('danger', formatUploadError(t, parseErrorContext(err)));
    }
  }

  async function handleDownload(f: AppFile) {
    if (f.scanStatus === 'INFECTED' || f.scanStatus === 'PENDING') return;
    try {
      const info = await getDownloadUrl(f.publicId);
      if (info?.url) window.open(info.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast('danger', formatUploadError(t, parseErrorContext(err)));
    }
  }

  async function handleReplaceFile(file: File) {
    if (!replaceTarget) return;
    try {
      await replace(replaceTarget.publicId, file);
      showToast('success', t('actions.replace'));
    } catch (err) {
      showToast('danger', formatUploadError(t, parseErrorContext(err)));
    } finally {
      setReplaceTarget(null);
    }
  }

  async function handleRenameSubmit() {
    if (!renameTarget) return;
    const input = document.getElementById('files-rename-input') as HTMLInputElement | null;
    const newName = input?.value.trim() ?? '';
    if (!newName) return;
    try {
      await rename(renameTarget.publicId, newName);
      showToast('success', t('actions.rename'));
    } catch (err) {
      showToast('danger', formatUploadError(t, parseErrorContext(err)));
    } finally {
      setRenameTarget(null);
    }
  }

  async function handleDeleteSubmit() {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.publicId);
      showToast('success', t('actions.delete'));
    } catch (err) {
      showToast('danger', formatUploadError(t, parseErrorContext(err)));
    } finally {
      setDeleteTarget(null);
    }
  }

  const chips: { key: ChipKey; labelKey: string }[] = [
    { key: 'all',    labelKey: 'task_files.chip.all' },
    { key: 'pdf',    labelKey: 'task_files.chip.pdf' },
    { key: 'docs',   labelKey: 'task_files.chip.docs' },
    { key: 'sheets', labelKey: 'task_files.chip.sheets' },
    { key: 'images', labelKey: 'task_files.chip.images' },
    { key: 'others', labelKey: 'task_files.chip.others' },
  ];

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return 'ri-arrow-up-down-line';
    return sortDir === 'asc' ? 'ri-arrow-up-line' : 'ri-arrow-down-line';
  };

  const filtersActive = chip !== 'all' || search.trim().length > 0;
  const pageList = buildPageList(safePage, totalPages);

  return (
    <div className="tfiles-wrap" ref={wrapRef}>
        {/* Header */}
        <div className="tfiles-head">
          <h6 className="tfiles-title">
            <i className="ri-attachment-2" aria-hidden="true" />
            {t('page.tab_label')}
            <span className="tfiles-count-pill">{files.length}</span>
          </h6>
          {canUpload && uploadsAvailable !== false && (
            <FileUploadButton
              onFile={handleUpload}
              disabled={uploadsAvailable === null}
              className="btn btn-purple btn-sm tfiles-btn-upload"
              label={t('upload.btn_send_file')}
            />
          )}
        </div>

        {/* Toolbar */}
        <div className="tfiles-toolbar">
          <div className="tfiles-search">
            <i className="ri-search-line" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('task_files.search_placeholder')}
            />
          </div>
          <div className="tfiles-chips">
            {chips.map(({ key, labelKey }) => (
              <button
                type="button"
                key={key}
                className={`tfiles-chip${chip === key ? ' is-active' : ''}`}
                onClick={() => setChip(key)}
              >
                {t(labelKey)}
                <span className="tfiles-chip-count">{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Empty state — sem ficheiros de todo */}
        {!loading && files.length === 0 && (
          <div className="tfiles-empty">
            {canUpload ? t('list.empty_uploadable') : t('list.empty_readonly')}
          </div>
        )}

        {/* Table — Bootstrap (.table) para alinhar visualmente com Planning */}
        {files.length > 0 && (
          <div className="card custom-card">
            <div className="card-body p-0">
              {/* Page-size selector — topo da tabela */}
              <div className="d-flex align-items-center gap-2 px-3 pt-3 pb-2">
                <label className="text-muted fs-13 mb-0" htmlFor="files-list-page-size">
                  {t('pager.page_size')}
                </label>
                <select
                  id="files-list-page-size"
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div className="table-responsive">
                <table className="table text-nowrap mb-0 align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }} aria-hidden="true" />
                      <th>
                        <button type="button" className="btn btn-link p-0 text-decoration-none text-reset fw-semibold d-inline-flex align-items-center gap-1" onClick={() => toggleSort('name')}>
                          {t('task_files.col.name')} <i className={sortIcon('name')} aria-hidden="true" />
                        </button>
                      </th>
                      <th>
                        <button type="button" className="btn btn-link p-0 text-decoration-none text-reset fw-semibold d-inline-flex align-items-center gap-1" onClick={() => toggleSort('size')}>
                          {t('task_files.col.size')} <i className={sortIcon('size')} aria-hidden="true" />
                        </button>
                      </th>
                      <th>
                        <button type="button" className="btn btn-link p-0 text-decoration-none text-reset fw-semibold d-inline-flex align-items-center gap-1" onClick={() => toggleSort('uploader')}>
                          {t('task_files.col.uploader')} <i className={sortIcon('uploader')} aria-hidden="true" />
                        </button>
                      </th>
                      <th>
                        <button type="button" className="btn btn-link p-0 text-decoration-none text-reset fw-semibold d-inline-flex align-items-center gap-1" onClick={() => toggleSort('date')}>
                          {t('task_files.col.date')} <i className={sortIcon('date')} aria-hidden="true" />
                        </button>
                      </th>
                      <th style={{ width: 56 }} aria-hidden="true" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-muted py-4">
                          <i className="ri-filter-3-line me-1" aria-hidden="true" />
                          {filtersActive ? t('list.empty_filtered') : t('task_files.search_empty')}
                        </td>
                      </tr>
                    ) : pageItems.map((f) => {
                      const ext = extOf(f.originalName);
                      const blocked = f.scanStatus === 'INFECTED' || f.scanStatus === 'PENDING';
                      const uploaderName = f.uploadedBy?.name ?? '—';
                      const isOpen = openMenuFor === f.publicId;
                      return (
                        <tr key={f.publicId}>
                          <td style={{ width: 36 }}>
                            <div style={{ width: 24 }}>
                              <FileIcon
                                extension={ext || undefined}
                                {...(defaultStyles[ext] ?? {})}
                                radius={4}
                              />
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <button
                                type="button"
                                className={`tfiles-name${blocked ? ' is-blocked' : ''}`}
                                title={f.originalName}
                                onClick={() => !blocked && handleDownload(f)}
                                disabled={blocked}
                              >
                                {f.originalName}
                              </button>
                              <ScanStatusBadge status={f.scanStatus} isSecured={f.isSecured} />
                            </div>
                          </td>
                          <td className="fs-13 text-muted">{formatBytes(f.sizeBytes)}</td>
                          <td className="fs-13 text-muted">
                            {f.uploadedBy ? (
                              <span className="d-inline-flex align-items-center gap-2">
                                {f.uploadedBy.avatarUrl ? (
                                  <img
                                    className="tfiles-avatar tfiles-avatar--img"
                                    src={`${f.uploadedBy.avatarUrl}${f.uploadedBy.avatarUpdatedAt ? `?v=${encodeURIComponent(f.uploadedBy.avatarUpdatedAt)}` : ''}`}
                                    alt={uploaderName}
                                  />
                                ) : (
                                  <span
                                    className="tfiles-avatar"
                                    style={{ background: avatarColorFor(uploaderName) }}
                                    aria-hidden="true"
                                  >
                                    {initialsOf(uploaderName)}
                                  </span>
                                )}
                                <span>{uploaderName}</span>
                              </span>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="fs-13 text-muted">{formatDate(f.uploadedAt, dateFormat)}</td>
                          <td style={{ width: 56, position: 'relative' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-icon btn-secondary-transparent"
                              aria-label={t('task_files.kebab_label')}
                              aria-expanded={isOpen}
                              onClick={() => setOpenMenuFor(isOpen ? null : f.publicId)}
                            >
                              <i className="ri-more-2-fill" aria-hidden="true" />
                            </button>
                            {isOpen && (
                              <div className="tfiles-menu" role="menu">
                                <button
                                  type="button"
                                  className="tfiles-menu-item"
                                  disabled={blocked}
                                  onClick={() => { setOpenMenuFor(null); handleDownload(f); }}
                                >
                                  <i className="ri-download-2-line" aria-hidden="true" />
                                  {t('actions.download')}
                                </button>
                                {canRename && (
                                  <button
                                    type="button"
                                    className="tfiles-menu-item"
                                    onClick={() => { setOpenMenuFor(null); setReplaceTarget(f); }}
                                  >
                                    <i className="ri-refresh-line" aria-hidden="true" />
                                    {t('actions.replace')}
                                  </button>
                                )}
                                {canRename && (
                                  <button
                                    type="button"
                                    className="tfiles-menu-item"
                                    onClick={() => { setOpenMenuFor(null); setRenameTarget(f); }}
                                  >
                                    <i className="ri-edit-line" aria-hidden="true" />
                                    {t('actions.rename')}
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    className="tfiles-menu-item is-danger"
                                    onClick={() => { setOpenMenuFor(null); setDeleteTarget(f); }}
                                  >
                                    <i className="ri-delete-bin-line" aria-hidden="true" />
                                    {t('actions.delete')}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Paginação Style-1 — fundo direito (formato Planning) */}
        {totalPages > 1 && (
          <div className="d-flex justify-content-end px-1 py-2">
            <nav aria-label="Page navigation" className="pagination-style-1">
              <ul className="pagination mb-0 flex-wrap">
                <li className={`page-item${safePage <= 1 ? ' disabled' : ''}`}>
                  <a
                    className="page-link"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (safePage > 1) setPage(safePage - 1);
                    }}
                  >
                    <i className="ri-arrow-left-s-line align-middle" />
                  </a>
                </li>
                {pageList.map((p, idx) => {
                  if (p === 'ellipsis-left' || p === 'ellipsis-right') {
                    return (
                      <li key={`${p}-${idx}`} className="page-item disabled">
                        <a className="page-link" href="#" onClick={(e) => e.preventDefault()}>
                          <i className="bi bi-three-dots" />
                        </a>
                      </li>
                    );
                  }
                  const active = p === safePage;
                  return (
                    <li key={p} className={`page-item${active ? ' active' : ''}`}>
                      <a
                        className="page-link"
                        href="#"
                        onClick={(e) => { e.preventDefault(); setPage(p); }}
                      >
                        {p}
                      </a>
                    </li>
                  );
                })}
                <li className={`page-item${safePage >= totalPages ? ' disabled' : ''}`}>
                  <a
                    className="page-link"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (safePage < totalPages) setPage(safePage + 1);
                    }}
                  >
                    <i className="ri-arrow-right-s-line align-middle" />
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        )}

        {/* Storage usage indicator — bottom-left */}
        <StorageUsageBar />

      {/* Modal: rename */}
      {renameTarget && (
        <>
          <div className="modal fade show d-block" role="dialog" tabIndex={-1} aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('rename.title')}</h5>
                  <button type="button" className="btn-close" onClick={() => setRenameTarget(null)} />
                </div>
                <div className="modal-body">
                  <label className="form-label">{t('rename.label')}</label>
                  <input
                    id="files-rename-input"
                    type="text"
                    className="form-control"
                    defaultValue={renameTarget.originalName}
                    autoFocus
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setRenameTarget(null)}>
                    {tc('actions.cancel')}
                  </button>
                  <button type="button" className="btn btn-primary" onClick={handleRenameSubmit}>
                    {t('rename.btn_save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {/* Modal: replace */}
      {replaceTarget && (
        <>
          <div className="modal fade show d-block" role="dialog" tabIndex={-1} aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('actions.replace')}</h5>
                  <button type="button" className="btn-close" onClick={() => setReplaceTarget(null)} />
                </div>
                <div className="modal-body">
                  <p className="text-muted small">{replaceTarget.originalName}</p>
                  <FileUploadButton
                    onFile={handleReplaceFile}
                    label={t('upload.btn_choose')}
                    className="btn btn-primary"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {/* Modal: delete */}
      {deleteTarget && (
        <>
          <div className="modal fade show d-block" role="dialog" tabIndex={-1} aria-modal="true">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('delete.title')}</h5>
                  <button type="button" className="btn-close" onClick={() => setDeleteTarget(null)} />
                </div>
                <div className="modal-body">
                  <p>{t('delete.confirm', { name: deleteTarget.originalName })}</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                    {tc('actions.cancel')}
                  </button>
                  <button type="button" className="btn btn-danger" onClick={handleDeleteSubmit}>
                    {t('delete.btn_confirm')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </div>
  );
}
