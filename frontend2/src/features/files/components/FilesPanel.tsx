// FilesPanel — adaptação inline de `frontend/src/features/files/components/FilesListView.tsx`
// para uso dentro do TaskModal. Tokens `.tm-files-*` do template canónico
// `views-task-modal.jsx:1132-1198`.
//
// DIFF vs legacy:
//   (A) Markup com `.tm-files-head` / `.tm-files-bar` / `.tm-files-table` /
//       `.tm-fk` / `.tm-pp-sel` / `.tm-storage` — alinha com template.
//   (B) Sem react-file-icon (lib não instalada em frontend2). Em vez disso,
//       abreviação `PDF` / `DOCX` / etc. com cor por categoria.
//   (E) Storage bar com placeholder (0% / 500 MB) — port real diferido.
//   (E) Rename inline com `<input>` em vez de modal — UX mais directa.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../contexts/ToastContext';
import { useTimezone } from '../../../contexts/TimezoneContext';
import { avatarColorFor, initialsOf } from '../../../lib/avatars';
import { formatMoment } from '../../../lib/dateFormatting';
import { useFiles } from '../useFiles';
import type { AppFile } from '../types';
import { FileUploadButton } from './FileUploadButton';
import { ScanStatusBadge } from './ScanStatusBadge';
import { fileKindOf } from '../../planning/components/TaskModal';
import {
  SvgDB, SvgPaperclip, SvgSearch, SvgSort,
} from '../../planning/components/TaskModalIcons';

type ChipKey = 'all' | 'pdf' | 'docs' | 'sheets' | 'images' | 'others';
type SortKey = 'name' | 'size' | 'uploader' | 'date';
type SortDir = 'asc' | 'desc';
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;
const DEFAULT_PAGE_SIZE = 5;

const IMAGE_EXTS = new Set(['png','jpg','jpeg','webp','gif','bmp','tiff','tif','ico','avif','heic','svg']);
const DOC_EXTS = new Set(['doc','docx','odt','rtf','txt']);
const SHEET_EXTS = new Set(['xls','xlsx','csv','ods']);

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
function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} kB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

interface Props {
  projectPublicId: string;
  taskPublicId: string;
  canUpload: boolean;
  canDelete: boolean;
  canRename: boolean;
}

export function FilesPanel({ projectPublicId, taskPublicId, canUpload, canDelete, canRename }: Props) {
  const { t } = useTranslation('files');
  const { t: tc } = useTranslation('common');
  const { showToast } = useToast();
  const tz = useTimezone();

  const { files, loading, upload, remove, rename, getDownloadUrl } = useFiles({
    projectPublicId,
    taskPublicId,
  });

  const [filter, setFilter] = useState<ChipKey>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [showPageSizeMenu, setShowPageSizeMenu] = useState(false);
  const [page, setPage] = useState(1);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [openMoreMenu, setOpenMoreMenu] = useState<string | null>(null);

  // Counts por categoria
  const counts = useMemo(() => {
    const c: Record<ChipKey, number> = { all: files.length, pdf: 0, docs: 0, sheets: 0, images: 0, others: 0 };
    for (const f of files) c[categoryOf(f)]++;
    return c;
  }, [files]);

  // Filtros
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return files.filter((f) => {
      if (filter !== 'all' && categoryOf(f) !== filter) return false;
      if (q && !f.originalName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [files, filter, search]);

  // Sort
  const sorted = useMemo(() => {
    const mult = sortDir === 'asc' ? 1 : -1;
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.originalName.toLowerCase().localeCompare(b.originalName.toLowerCase()); break;
        case 'size': cmp = a.sizeBytes - b.sizeBytes; break;
        case 'uploader': cmp = (a.uploadedBy?.name ?? '').localeCompare(b.uploadedBy?.name ?? ''); break;
        case 'date': cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(); break;
      }
      return cmp * mult;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageClamped = Math.min(page, totalPages);
  const start = (pageClamped - 1) * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  useEffect(() => { setPage(1); }, [filter, search, pageSize, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  async function handleUpload(file: File) {
    await upload(file);
  }
  async function handleDownload(f: AppFile) {
    try {
      const info = await getDownloadUrl(f.publicId);
      if (info?.url) window.open(info.url, '_blank');
    } catch (err) {
      showToast('danger', err instanceof Error ? err.message : tc('errors.generic'));
    }
  }
  async function handleDelete(f: AppFile) {
    if (!window.confirm(t('delete.confirm', { name: f.originalName }))) return;
    try {
      await remove(f.publicId);
      showToast('success', t('actions.delete'));
    } catch (err) {
      showToast('danger', err instanceof Error ? err.message : tc('errors.generic'));
    }
  }
  async function commitRename(f: AppFile) {
    const next = renameDraft.trim();
    if (!next || next === f.originalName) {
      setRenamingId(null);
      return;
    }
    try {
      await rename(f.publicId, next);
      showToast('success', t('actions.rename'));
    } catch (err) {
      showToast('danger', err instanceof Error ? err.message : tc('errors.generic'));
    } finally {
      setRenamingId(null);
    }
  }

  // Close more menu on click outside
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest('.tm-more-menu') && !target.closest('.tm-files-row .more')) {
        setOpenMoreMenu(null);
      }
      if (!target.closest('.tm-pp-sel') && !target.closest('.tm-tags-dropdown')) {
        setShowPageSizeMenu(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const chips: Array<{ key: ChipKey; labelKey: string; count: number }> = [
    { key: 'all',    labelKey: 'task_files.chip.all',    count: counts.all },
    { key: 'pdf',    labelKey: 'task_files.chip.pdf',    count: counts.pdf },
    { key: 'docs',   labelKey: 'task_files.chip.docs',   count: counts.docs },
    { key: 'sheets', labelKey: 'task_files.chip.sheets', count: counts.sheets },
    { key: 'images', labelKey: 'task_files.chip.images', count: counts.images },
    { key: 'others', labelKey: 'task_files.chip.others', count: counts.others },
  ];

  return (
    <div>
      <div className="tm-files-head">
        <span className="t"><SvgPaperclip /> {t('page.tab_label')}</span>
        <span className="n">{files.length}</span>
        <div className="grow"></div>
        {canUpload && (
          <FileUploadButton onFile={handleUpload} label={t('upload.btn_send_file')} className="tm-btn-send" />
        )}
      </div>

      <div className="tm-files-bar">
        <div className="search">
          <SvgSearch />
          <input
            placeholder={t('task_files.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="tm-files-filters">
          {chips.map((c) => (
            <span
              key={c.key}
              className={'tm-fk' + (filter === c.key ? ' active' : '')}
              onClick={() => setFilter(c.key)}
              role="button"
            >
              {t(c.labelKey)}<span className="n">{c.count}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="tm-files-table-bar" style={{ position: 'relative' }}>
        <span className="pp-lbl">{t('pager.page_size')}</span>
        <div
          className="tm-pp-sel"
          role="button"
          onClick={() => setShowPageSizeMenu((s) => !s)}
        >{pageSize}</div>
        {showPageSizeMenu && (
          <div className="tm-tags-dropdown" style={{ left: 80, top: '100%', minWidth: 80 }}>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                className="tm-tags-opt"
                onClick={() => { setPageSize(n); setShowPageSizeMenu(false); }}
              >{n}</button>
            ))}
          </div>
        )}
      </div>

      <div className="tm-files-table">
        <div className="tm-files-row head">
          <span className="col" onClick={() => toggleSort('name')}>
            {t('task_files.col.name')} <SvgSort />
          </span>
          <span className="col size-h" onClick={() => toggleSort('size')}>
            {t('task_files.col.size')} <SvgSort />
          </span>
          <span className="col who-h" onClick={() => toggleSort('uploader')}>
            {t('task_files.col.uploader')} <SvgSort />
          </span>
          <span className="col date-h" onClick={() => toggleSort('date')}>
            {t('task_files.col.date')} <SvgSort />
          </span>
          <span></span>
        </div>

        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
            {tc('messages.loading')}
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
            {files.length === 0 ? t('list.empty') : t('task_files.search_empty')}
          </div>
        )}

        {visible.map((f) => {
          const kind = fileKindOf(f.originalName);
          const isRenaming = renamingId === f.publicId;
          const uploaderPid = f.uploadedBy?.publicId ?? '';
          const uploaderName = f.uploadedBy?.name ?? '—';
          return (
            <div
              key={f.publicId}
              className="tm-files-row"
              style={{
                ['--fk-color' as string]: kind.col,
                ['--fk-soft' as string]: kind.soft,
              } as React.CSSProperties}
              onClick={() => !isRenaming && !openMoreMenu && void handleDownload(f)}
            >
              <div className="name-cell" onClick={(e) => isRenaming && e.stopPropagation()}>
                <div className="icn">{kind.kind}</div>
                {isRenaming ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={() => void commitRename(f)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void commitRename(f);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                  />
                ) : (
                  <span className="nm" title={f.originalName}>{f.originalName}</span>
                )}
              </div>
              <span className="size">{formatBytes(f.sizeBytes)}</span>
              <span className="who">
                <div
                  className="tm-asg-avatar"
                  style={{ background: avatarColorFor(uploaderPid), width: 22, height: 22, fontSize: 9 }}
                >{initialsOf(uploaderName)}</div>
                <span>{uploaderName}</span>
                {f.scanStatus !== null && (
                  <ScanStatusBadge status={f.scanStatus} isSecured={f.isSecured} />
                )}
              </span>
              <span className="date">{formatMoment(f.uploadedAt, tz)}</span>
              <span
                className="more"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMoreMenu((m) => m === f.publicId ? null : f.publicId);
                }}
              >⋮</span>
              {openMoreMenu === f.publicId && (
                <div className="tm-more-menu" style={{ right: 16, top: 44 }}>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setOpenMoreMenu(null); void handleDownload(f); }}>
                    {t('actions.download')}
                  </button>
                  {canRename && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMoreMenu(null);
                        setRenamingId(f.publicId);
                        setRenameDraft(f.originalName);
                      }}
                    >{t('actions.rename')}</button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="danger"
                      onClick={(e) => { e.stopPropagation(); setOpenMoreMenu(null); void handleDelete(f); }}
                    >{t('actions.delete')}</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 4, fontSize: 12 }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              className={'tm-fk' + (p === pageClamped ? ' active' : '')}
              style={{ minWidth: 28, justifyContent: 'center' }}
              onClick={() => setPage(p)}
            >{p}</button>
          ))}
        </div>
      )}

      {/* Storage bar — placeholder; valor real virá com config endpoint. */}
      <div className="tm-storage">
        <div className="ico"><SvgDB s={14} /></div>
        <div className="body">
          <div className="lbl">{t('storage_usage.label', { percent: '0', total: '500 MB' })}</div>
          <div className="bar"><div className="fill" style={{ width: '2%' }}></div></div>
        </div>
      </div>
    </div>
  );
}
