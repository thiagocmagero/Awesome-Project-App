import { useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Task, ResourceNode } from '../types';
import type { ITaskState } from '../states-types';
import { formatDate, formatDateTime } from '../../../lib/dateFormatting';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { TypeBadge } from './TypeBadge';
import { PriorityBadge } from './PriorityBadge';
import { StateBadge } from './StateBadge';
import { avatarColorFor, initialsOf as initials } from '../../../lib/avatars';
import './task-table.css';

export interface TaskTableProps {
  filteredTasks: Array<Task & { depth: number }>;
  boardColumns: ITaskState[];
  nodeMap: Map<string, ResourceNode>;
  /** True when the column filter is active (distinguishes "no tasks" from "filtered to empty"). */
  isFiltered: boolean;
  openEditTask: (task: Task) => void;
  setCommentTask: (v: { publicId: string; name: string } | null) => void;
  setDeletingTask: (task: Task | null) => void;
  setShowDeleteTask: (v: boolean) => void;
  /** Optional permission check — if provided, buttons are hidden when action is denied */
  canDo?: (action: string) => boolean;
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

const TASK_W_DEFAULT = 320;
const TASK_W_MIN = 200;
const TASK_W_MAX = 600;
const ACTIONS_W = 130;
const LS_TASK_W = 'planning.taskTable.taskW';
const LS_VISIBLE = 'planning.taskTable.visible';

type ColumnKey =
  | 'type'
  | 'start'
  | 'end'
  | 'dur'
  | 'progress'
  | 'priority'
  | 'state'
  | 'owner'
  | 'created';

type SortKey =
  | 'task'
  | 'type'
  | 'start_date'
  | 'end_date'
  | 'duration'
  | 'progress'
  | 'priority'
  | 'state'
  | 'owner'
  | 'created_at';
type SortDir = 'asc' | 'desc';

interface ColumnDef {
  k: ColumnKey;
  labelKey: string;
  width: number;
  defaultOn: boolean;
  sortKey: SortKey;
}

const COLUMNS: ColumnDef[] = [
  { k: 'type',     labelKey: 'table.type',       width: 110, defaultOn: true, sortKey: 'type' },
  { k: 'start',    labelKey: 'table.start_date', width: 140, defaultOn: true, sortKey: 'start_date' },
  { k: 'end',      labelKey: 'table.end_date',   width: 140, defaultOn: true, sortKey: 'end_date' },
  { k: 'dur',      labelKey: 'table.duration',   width:  90, defaultOn: true, sortKey: 'duration' },
  { k: 'progress', labelKey: 'table.progress',   width: 160, defaultOn: true, sortKey: 'progress' },
  { k: 'priority', labelKey: 'table.priority',   width: 110, defaultOn: true, sortKey: 'priority' },
  { k: 'state',    labelKey: 'table.state',      width: 130, defaultOn: true, sortKey: 'state' },
  { k: 'owner',    labelKey: 'table.owner',      width: 140, defaultOn: true, sortKey: 'owner' },
  { k: 'created',  labelKey: 'table.created_at', width: 160, defaultOn: true, sortKey: 'created_at' },
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function loadVisible(): Set<ColumnKey> {
  try {
    const raw = localStorage.getItem(LS_VISIBLE);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const allowed = new Set(COLUMNS.map((c) => c.k));
        const arr = parsed.filter(
          (s): s is ColumnKey => typeof s === 'string' && allowed.has(s as ColumnKey),
        );
        return new Set(arr);
      }
    }
  } catch {
    /* ignore */
  }
  return new Set(COLUMNS.filter((c) => c.defaultOn).map((c) => c.k));
}

function loadTaskW(): number {
  try {
    const raw = localStorage.getItem(LS_TASK_W);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n)) return clamp(Math.round(n), TASK_W_MIN, TASK_W_MAX);
  } catch {
    /* ignore */
  }
  return TASK_W_DEFAULT;
}

/** Constrói a lista de páginas a mostrar (estilo "1 ... 4 5 6 ... 21"). */
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

export function TaskTable({
  filteredTasks, boardColumns, nodeMap, isFiltered,
  openEditTask,
  setCommentTask, setDeletingTask, setShowDeleteTask,
  canDo,
}: TaskTableProps) {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const dateFormat = useResolvedDateFormat();
  const fmtCell = (s: string | undefined | null) => formatDate(s, dateFormat);
  const fmtDateTime = (s: string | undefined | null) => formatDateTime(s, dateFormat);

  const columnByPublicId = useMemo(
    () => new Map(boardColumns.map((c) => [c.publicId, c])),
    [boardColumns],
  );

  // ── Pagination + sort ──────────────────────────────────────────────────────
  const [pageSize, setPageSize]       = useState<number>(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortKey, setSortKey]         = useState<SortKey | null>(null);
  const [sortDir, setSortDir]         = useState<SortDir>('asc');

  // ── Visible columns + Tarefa width (persisted) ─────────────────────────────
  const [visible, setVisible] = useState<Set<ColumnKey>>(() => loadVisible());
  const [taskW, setTaskW]     = useState<number>(() => loadTaskW());
  const [menuOpen, setMenuOpen] = useState(false);

  // Persist on change
  useEffect(() => {
    try { localStorage.setItem(LS_VISIBLE, JSON.stringify(Array.from(visible))); } catch { /* ignore */ }
  }, [visible]);
  useEffect(() => {
    try { localStorage.setItem(LS_TASK_W, String(taskW)); } catch { /* ignore */ }
  }, [taskW]);

  // ── Sort logic ──────────────────────────────────────────────────────────────
  const ownerNameOf = useCallback((tk: Task): string => {
    const ids = tk.owner_id ?? [];
    for (const id of ids) {
      const node = nodeMap.get(id);
      if (node?.text) return node.text;
    }
    return '';
  }, [nodeMap]);

  const sortedTasks = useMemo(() => {
    if (!sortKey) return filteredTasks;
    const dir = sortDir === 'asc' ? 1 : -1;
    const cmpStr = (a: string, b: string) =>
      a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
    const cmpNum = (a: number, b: number) => a - b;
    const cmpDate = (a: string | undefined | null, b: string | undefined | null) =>
      (a ? new Date(a).getTime() : 0) - (b ? new Date(b).getTime() : 0);
    const arr = [...filteredTasks];
    arr.sort((a, b) => {
      let v = 0;
      switch (sortKey) {
        case 'task':       v = cmpStr(a.text ?? '', b.text ?? ''); break;
        case 'type':       v = cmpStr(a.type ?? '', b.type ?? ''); break;
        case 'start_date': v = cmpDate(a.start_date, b.start_date); break;
        case 'end_date':   v = cmpDate(a.end_date, b.end_date); break;
        case 'duration':   v = cmpNum(a.duration ?? 0, b.duration ?? 0); break;
        case 'progress':   v = cmpNum(a.progress ?? 0, b.progress ?? 0); break;
        case 'priority':   v = cmpNum(a.priority ?? Number.POSITIVE_INFINITY, b.priority ?? Number.POSITIVE_INFINITY); break;
        case 'state': {
          const sa = a.boardColumn ? columnByPublicId.get(a.boardColumn)?.position ?? 999 : 999;
          const sb = b.boardColumn ? columnByPublicId.get(b.boardColumn)?.position ?? 999 : 999;
          v = cmpNum(sa, sb);
          break;
        }
        case 'owner':      v = cmpStr(ownerNameOf(a), ownerNameOf(b)); break;
        case 'created_at': v = cmpDate(a.createdAt, b.createdAt); break;
      }
      return v * dir;
    });
    return arr;
  }, [filteredTasks, sortKey, sortDir, columnByPublicId, ownerNameOf]);

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);
  useEffect(() => { setCurrentPage(1); }, [sortKey, sortDir, pageSize]);

  const visibleTasks = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return sortedTasks.slice(start, start + pageSize);
  }, [sortedTasks, currentPage, pageSize, totalPages]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }
  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return 'ri-arrow-up-down-line';
    return sortDir === 'asc' ? 'ri-arrow-up-line' : 'ri-arrow-down-line';
  };

  // ── Resize Tarefa (mousedown → window mousemove → mouseup) ─────────────────
  const dragStartRef = useRef<{ startX: number; startW: number } | null>(null);
  const onResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { startX: e.clientX, startW: taskW };
    document.body.classList.add('resizing');
    const onMove = (ev: MouseEvent) => {
      const s = dragStartRef.current;
      if (!s) return;
      const next = clamp(s.startW + (ev.clientX - s.startX), TASK_W_MIN, TASK_W_MAX);
      setTaskW(next);
    };
    const onUp = () => {
      dragStartRef.current = null;
      document.body.classList.remove('resizing');
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const onResizeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setTaskW((w) => clamp(w - 8, TASK_W_MIN, TASK_W_MAX));
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      setTaskW((w) => clamp(w + 8, TASK_W_MIN, TASK_W_MAX));
      e.preventDefault();
    }
  };

  // ── Columns popover (close on outside click) ───────────────────────────────
  const colsWrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function onDocMouseDown(ev: MouseEvent) {
      const wrap = colsWrapRef.current;
      if (!wrap) return;
      if (!wrap.contains(ev.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [menuOpen]);

  function toggleColumn(k: ColumnKey) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }
  const visibleCount = visible.size;
  const totalCount = COLUMNS.length;
  function toggleAll() {
    if (visibleCount < totalCount) {
      setVisible(new Set(COLUMNS.map((c) => c.k)));
    } else {
      setVisible(new Set());
    }
  }

  // ── Overflow detection (ResizeObserver + scroll) ───────────────────────────
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [scrolledToEnd, setScrolledToEnd] = useState(true);

  const recompute = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflow = el.scrollWidth > el.clientWidth + 1;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2;
    setHasOverflow(overflow);
    setScrolled(el.scrollLeft > 2);
    setScrolledToEnd(!overflow || atEnd);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    recompute();
    const ro = new ResizeObserver(() => recompute());
    ro.observe(el);
    const onScroll = () => recompute();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', onScroll);
    };
  }, [recompute, visible, taskW, visibleTasks.length]);

  const visibleCols = useMemo(
    () => COLUMNS.filter((c) => visible.has(c.k)),
    [visible],
  );
  const actionsSticky = hasOverflow;

  // ── Cell renderer ───────────────────────────────────────────────────────────
  const renderCell = (k: ColumnKey, tk: Task & { depth: number }): ReactNode => {
    switch (k) {
      case 'type':
        return <TypeBadge type={tk.type} />;
      case 'start':
        return <span className="mono">{fmtCell(tk.start_date)}</span>;
      case 'end':
        return <span className="mono">{fmtCell(tk.end_date)}</span>;
      case 'dur':
        return tk.type === 'milestone'
          ? <span className="text-muted">—</span>
          : <span className="mono">{tk.duration}d</span>;
      case 'progress': {
        const pct = Math.round(tk.progress * 100);
        return (
          <div className="d-flex align-items-center gap-2">
            <div className="progress flex-grow-1" style={{ height: 6, minWidth: 80 }}>
              <div className="progress-bar" style={{ width: `${pct}%` }} />
            </div>
            <span className="fs-12 text-muted mono" style={{ minWidth: 32 }}>{pct}%</span>
          </div>
        );
      }
      case 'priority':
        return <PriorityBadge priority={tk.priority} />;
      case 'state':
        return <StateBadge column={tk.boardColumn ? columnByPublicId.get(tk.boardColumn) ?? null : null} />;
      case 'owner': {
        const owners = (tk.owner_id ?? [])
          .map((oid: string) => {
            const node = nodeMap.get(oid);
            return node
              ? { name: node.text, publicId: node.id, avatarUrl: node.avatarUrl }
              : null;
          })
          .filter(Boolean) as Array<{ name: string; publicId: string; avatarUrl: string | null }>;
        if (owners.length === 0) return <span className="text-muted fs-13">—</span>;
        const visibleOwners = owners.slice(0, 3);
        const overflow = owners.length - visibleOwners.length;
        return (
          <div className="avatar-list-stacked">
            {visibleOwners.map((m) => (
              m.avatarUrl ? (
                <img
                  key={m.publicId}
                  className="avatar avatar-sm avatar-rounded"
                  src={m.avatarUrl}
                  alt={m.name}
                  title={m.name}
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <span
                  key={m.publicId}
                  className="avatar avatar-sm avatar-rounded text-white fw-semibold"
                  style={{ backgroundColor: avatarColorFor(m.publicId) }}
                  title={m.name}
                >
                  {initials(m.name)}
                </span>
              )
            ))}
            {overflow > 0 && (
              <span className="avatar avatar-sm avatar-rounded bg-dark text-white fs-11">
                +{overflow}
              </span>
            )}
          </div>
        );
      }
      case 'created':
        return <span className="mono">{fmtDateTime(tk.createdAt)}</span>;
    }
  };

  const pageList = buildPageList(Math.min(currentPage, totalPages), totalPages);
  const safePage = Math.min(currentPage, totalPages);

  // Pixel widths (used inline so colgroup-driven widths stick mesmo com table-layout: fixed)
  const taskWStyle = { width: taskW, minWidth: taskW, maxWidth: taskW };
  const titleMaxWidth = Math.max(60, taskW - 28 /* padding + ícone + gap */ - 24);

  return (
    <div role="tabpanel">
      {filteredTasks.length === 0 ? (
        <div className="text-center text-muted py-5">
          <i className="ri-task-line fs-1 d-block mb-2 opacity-50" />
          <p className="mb-0">
            {isFiltered ? t('task.empty_filtered') : t('task.empty')}
          </p>
        </div>
      ) : (
        <div className="card custom-card">
          <div className="card-body p-0">
            {/* Toolbar */}
            <div className="ttbl-toolbar">
              <div className="ttbl-toolbar__left">
                <label className="text-muted fs-13 mb-0" htmlFor="task-table-page-size">
                  {t('table.per_page')}
                </label>
                <select
                  id="task-table-page-size"
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <span className="ttbl-toolbar__total">
                  {t('table.total_tasks', { count: filteredTasks.length })}
                </span>
              </div>
              <div className="ttbl-toolbar__right ttbl-cols-wrap" ref={colsWrapRef}>
                <button
                  type="button"
                  className="btn btn-sm btn-light ttbl-cols-btn"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  <i className="ri-layout-column-line" aria-hidden="true" />
                  <span>{t('table.columns_btn')}</span>
                  <span className="ttbl-cols-badge">{visibleCount}/{totalCount}</span>
                </button>
                {menuOpen && (
                  <div className="ttbl-cols-pop" role="menu">
                    <div className="ttbl-cols-pop__head">
                      <span className="ttbl-cols-pop__title">{t('table.columns_btn')}</span>
                      <button type="button" className="ttbl-cols-pop__toggle-all" onClick={toggleAll}>
                        {visibleCount < totalCount ? t('table.cols_all') : t('table.cols_none')}
                      </button>
                    </div>
                    {COLUMNS.map((c) => (
                      <label key={c.k} className="ttbl-cols-pop__item">
                        <input
                          type="checkbox"
                          checked={visible.has(c.k)}
                          onChange={() => toggleColumn(c.k)}
                        />
                        <span>{t(c.labelKey)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Scroll container */}
            <div
              ref={scrollRef}
              className={`ttbl-scroll${scrolled ? ' scrolled' : ''}${hasOverflow ? ' has-overflow' : ''}${scrolledToEnd ? ' scrolled-to-end' : ''}`}
              tabIndex={0}
            >
              <table className="ttbl">
                <colgroup>
                  <col style={{ width: taskW }} />
                  {visibleCols.map((c) => (
                    <col key={c.k} style={{ width: c.width }} />
                  ))}
                  <col style={{ width: ACTIONS_W }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="ttbl-task" style={taskWStyle}>
                      <button
                        type="button"
                        className="ttbl-sort-btn"
                        onClick={() => toggleSort('task')}
                      >
                        {t('table.task')} <i className={sortIcon('task')} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="ttbl-resize"
                        aria-label={t('table.resize_handle')}
                        onMouseDown={onResizeMouseDown}
                        onKeyDown={onResizeKeyDown}
                      />
                    </th>
                    {visibleCols.map((c) => (
                      <th key={c.k} style={{ width: c.width }}>
                        <button
                          type="button"
                          className="ttbl-sort-btn"
                          onClick={() => toggleSort(c.sortKey)}
                        >
                          {t(c.labelKey)} <i className={sortIcon(c.sortKey)} aria-hidden="true" />
                        </button>
                      </th>
                    ))}
                    <th
                      className={`ttbl-actions${actionsSticky ? ' ttbl-actions--sticky' : ''}`}
                      style={{ width: ACTIONS_W }}
                    >
                      {tc('table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.map((tk) => (
                    <tr key={tk.id}>
                      <td className="ttbl-task" style={taskWStyle}>
                        <div
                          className="ttbl-task-cell"
                          style={{ paddingLeft: tk.depth * 20 }}
                        >
                          {tk.type === 'milestone'
                            ? <i className="ri-flag-2-line text-warning" aria-hidden="true" />
                            : tk.type === 'project'
                            ? <i className="ri-folder-line text-secondary" aria-hidden="true" />
                            : <i className="ri-circle-line text-primary" aria-hidden="true" />}
                          {(!canDo || canDo('TASK_EDIT')) ? (
                            <button
                              type="button"
                              className="ttbl-task-title"
                              style={{ maxWidth: titleMaxWidth }}
                              title={tk.text}
                              onClick={() => openEditTask(tk)}
                            >
                              {tk.text}
                            </button>
                          ) : (
                            <span
                              className="ttbl-task-title is-readonly"
                              style={{ maxWidth: titleMaxWidth }}
                              title={tk.text}
                            >
                              {tk.text}
                            </span>
                          )}
                        </div>
                      </td>
                      {visibleCols.map((c) => (
                        <td key={c.k}>{renderCell(c.k, tk)}</td>
                      ))}
                      <td className={`ttbl-actions${actionsSticky ? ' ttbl-actions--sticky' : ''}`}>
                        <div className="d-flex gap-1">
                          {(!canDo || canDo('TASK_EDIT')) && (
                            <button
                              className="btn btn-sm btn-icon btn-primary-transparent"
                              title={tc('actions.edit')}
                              onClick={() => openEditTask(tk)}
                            >
                              <i className="ri-pencil-line" />
                            </button>
                          )}
                          {(!canDo || canDo('TASK_COMMENT')) && (
                            <button
                              className="btn btn-sm btn-icon btn-secondary-transparent"
                              title={t('table.comments')}
                              onClick={() => setCommentTask({ publicId: tk.publicId, name: tk.text })}
                            >
                              <i className="ri-chat-3-line" />
                            </button>
                          )}
                          {(!canDo || canDo('TASK_DELETE')) && (
                            <button
                              className="btn btn-sm btn-icon btn-danger-transparent"
                              title={tc('actions.delete')}
                              onClick={() => { setDeletingTask(tk); setShowDeleteTask(true); }}
                            >
                              <i className="ri-delete-bin-line" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-end px-3 py-2">
                <nav aria-label="Page navigation" className="pagination-style-1">
                  <ul className="pagination mb-0 flex-wrap">
                    <li className={`page-item${safePage <= 1 ? ' disabled' : ''}`}>
                      <a
                        className="page-link"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (safePage > 1) setCurrentPage(safePage - 1);
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
                            onClick={(e) => { e.preventDefault(); setCurrentPage(p); }}
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
                          if (safePage < totalPages) setCurrentPage(safePage + 1);
                        }}
                      >
                        <i className="ri-arrow-right-s-line align-middle" />
                      </a>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
