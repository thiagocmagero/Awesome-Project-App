import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GanttTask, ResourceNode } from '../types';
import type { ITaskState } from '../states-types';
import { formatDate } from '../../../lib/dateFormatting';
import { useResolvedDateFormat } from '../../../contexts/ProjectDateFormatContext';
import { TypeBadge } from './TypeBadge';
import { PriorityBadge } from './PriorityBadge';
import { StateBadge } from './StateBadge';
import { avatarColorFor, initialsOf as initials } from '../../../lib/avatars';

export interface TaskTableProps {
  filteredTasks: Array<GanttTask & { depth: number }>;
  boardColumns: ITaskState[];
  nodeMap: Map<number, ResourceNode>;
  /** True when the column filter is active (distinguishes "no tasks" from "filtered to empty"). */
  isFiltered: boolean;
  openEditTask: (task: GanttTask) => void;
  setCommentTask: (v: { publicId: string; name: string } | null) => void;
  setDeletingTask: (task: GanttTask | null) => void;
  setShowDeleteTask: (v: boolean) => void;
  /** Optional permission check — if provided, buttons are hidden when action is denied */
  canDo?: (action: string) => boolean;
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

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
  // start/end vêm como string DHTMLX 'DD-MM-YYYY HH:mm' — `formatDate` do helper
  // central já reconhece esse formato directamente, sem conversão prévia.
  const fmtCell = (s: string | undefined | null) => formatDate(s, dateFormat);

  const columnByPublicId = new Map(boardColumns.map((c) => [c.publicId, c]));

  // Estado pagination
  const [pageSize, setPageSize]       = useState<number>(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset para página 1 quando page-size muda ou quando o conteúdo filtrado muda
  // o suficiente para invalidar a página actual.
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const visibleTasks = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return filteredTasks.slice(start, start + pageSize);
  }, [filteredTasks, currentPage, pageSize, totalPages]);

  const pageList = buildPageList(Math.min(currentPage, totalPages), totalPages);

  return (
    <div role="tabpanel">

      {/* Table */}
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
            {/* Page-size selector — topo da tabela */}
            <div className="d-flex align-items-center gap-2 px-3 pt-3 pb-2">
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
            </div>

            <div className="table-responsive">
              <table className="table text-nowrap mb-0 align-middle">
                <thead>
                  <tr>
                    <th style={{ minWidth: 240 }}>{t('table.task')}</th>
                    <th>{t('table.type')}</th>
                    <th>{t('table.start_date')}</th>
                    <th>{t('table.end_date')}</th>
                    <th>{t('table.duration')}</th>
                    <th style={{ minWidth: 140 }}>{t('table.progress')}</th>
                    <th>{t('table.priority')}</th>
                    <th>{t('table.state')}</th>
                    <th>{t('table.owner')}</th>
                    <th>{tc('table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.map((tk) => {
                    const owners = (tk.owner_id ?? [])
                      .map((oid: string) => {
                        const node = nodeMap.get(Number(oid));
                        return node ? { name: node.text, publicId: String(node.id) } : null;
                      })
                      .filter(Boolean) as Array<{ name: string; publicId: string }>;
                    const visibleOwners = owners.slice(0, 3);
                    const overflow = owners.length - visibleOwners.length;
                    return (
                      <tr key={tk.id} className="task-list">
                        <td>
                          <div
                            className="d-flex align-items-center gap-2"
                            style={{ paddingLeft: tk.depth * 20 }}
                          >
                            {tk.type === 'milestone'
                              ? <i className="ri-flag-2-line text-warning" />
                              : tk.type === 'project'
                              ? <i className="ri-folder-line text-secondary" />
                              : <i className="ri-circle-line text-primary" />}
                            {(!canDo || canDo('TASK_EDIT')) ? (
                              <button
                                className="btn btn-link p-0 fw-medium text-start text-dark"
                                style={{ textDecoration: 'none', lineHeight: 'inherit' }}
                                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                                onClick={() => openEditTask(tk)}
                              >
                                {tk.text}
                              </button>
                            ) : (
                              <span className="fw-medium">{tk.text}</span>
                            )}
                          </div>
                        </td>
                        <td><TypeBadge type={tk.type} /></td>
                        <td className="fs-13">{fmtCell(tk.start_date)}</td>
                        <td className="fs-13">{fmtCell(tk.end_date)}</td>
                        <td className="fs-13">
                          {tk.type === 'milestone'
                            ? <span className="text-muted">—</span>
                            : `${tk.duration}d`}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="progress flex-grow-1" style={{ height: 6, minWidth: 80 }}>
                              <div
                                className="progress-bar"
                                style={{ width: `${Math.round(tk.progress * 100)}%` }}
                              />
                            </div>
                            <span className="fs-12 text-muted" style={{ minWidth: 32 }}>
                              {Math.round(tk.progress * 100)}%
                            </span>
                          </div>
                        </td>
                        <td><PriorityBadge priority={tk.priority} /></td>
                        <td><StateBadge column={tk.boardColumn ? columnByPublicId.get(tk.boardColumn) ?? null : null} /></td>
                        <td>
                          {owners.length === 0 ? (
                            <span className="text-muted fs-13">—</span>
                          ) : (
                            <div className="avatar-list-stacked">
                              {visibleOwners.map((m) => (
                                <span
                                  key={m.publicId}
                                  className="avatar avatar-sm avatar-rounded text-white fw-semibold"
                                  style={{ backgroundColor: avatarColorFor(m.publicId) }}
                                  title={m.name}
                                >
                                  {initials(m.name)}
                                </span>
                              ))}
                              {overflow > 0 && (
                                <span className="avatar avatar-sm avatar-rounded bg-dark text-white fs-11">
                                  +{overflow}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação Style-1 — fundo direito */}
            {totalPages > 1 && (
              <div className="d-flex justify-content-end px-3 py-2">
                <nav aria-label="Page navigation" className="pagination-style-1">
                  <ul className="pagination mb-0 flex-wrap">
                    <li className={`page-item${currentPage <= 1 ? ' disabled' : ''}`}>
                      <a
                        className="page-link"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
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
                      const active = p === Math.min(currentPage, totalPages);
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
                    <li className={`page-item${currentPage >= totalPages ? ' disabled' : ''}`}>
                      <a
                        className="page-link"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
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
