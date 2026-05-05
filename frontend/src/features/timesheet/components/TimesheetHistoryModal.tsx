import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiBase, apiFetch } from '../../../lib/api';
import { useTimezone } from '../../../contexts/TimezoneContext';
import { formatMoment } from '../../../lib/dateFormatting';
import type { ITimesheetLogRow, TimesheetLogAction } from '../types';

interface Props {
  open:           boolean;
  projectPublicId: string;
  /**
   * **Já não pré-filtra** por user — o modal mostra sempre histórico
   * projecto-wide e oferece filtros internos (user + acção). A prop fica
   * para back-compat se alguém quiser reabrir filtrado, mas o uso principal
   * é abrir sem filtro inicial.
   */
  userPublicId?:  string;
  onClose:        () => void;
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

/** Constrói lista de páginas (estilo "1 ... 4 5 6 ... 21") — espelha TaskTable. */
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

type SortKey = 'when' | 'actor' | 'target' | 'action' | 'scope' | 'scopeDate' | 'reason';
type SortDir = 'asc' | 'desc';

/**
 * Modal de histórico de aprovações/rejeições/submissões (REQ-M11, REQ-A04/A05).
 *
 * Comportamento (Abril 2026):
 *  - Abre **projecto-wide** (sem filtro de user no fetch). Oferece filtros
 *    internos: user + acção (`SUBMIT`/`RESUBMIT`/`APPROVE`/`REJECT`/`REVERT`).
 *  - Colunas com **sort ascendente/descendente** ao clicar no header.
 *    Ícone indica direcção; default é "when" desc (mais recente em cima).
 *  - Paginação client-side (5/10/25/50/100 por página) idêntica ao TaskTable
 *    do Planning.
 */
export function TimesheetHistoryModal({ open, projectPublicId, userPublicId, onClose }: Props) {
  const { t } = useTranslation('timesheet');
  const { t: tc } = useTranslation('common');
  const { t: tp } = useTranslation('planning');
  const { token } = useAuth();
  const tz = useTimezone();

  const [rows, setRows]       = useState<ITimesheetLogRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros internos
  const [filterUser, setFilterUser]     = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('when');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Pagination state — client-side (o backend devolve até 200 entries).
  const [pageSize, setPageSize]       = useState<number>(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open || !token) return;
    setLoading(true);
    setCurrentPage(1);
    setFilterUser('all');
    setFilterAction('all');
    setSortKey('when');
    setSortDir('desc');
    (async () => {
      try {
        const url = new URL(`${getApiBase()}/projects/${encodeURIComponent(projectPublicId)}/timesheets/log`, window.location.origin);
        if (userPublicId) url.searchParams.set('userId', userPublicId);
        const res = await apiFetch(url.pathname + url.search, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setRows((await res.json()) as ITimesheetLogRow[]);
      } catch (e) {
        console.error('[TimesheetHistoryModal] failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, token, projectPublicId, userPublicId]);

  // Lista única de utilizadores (target) que aparecem no histórico — usada
  // pelo dropdown de filtro. Inclui só users com pelo menos 1 entrada.
  const userOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of rows) map.set(r.target.publicId, r.target.name);
    return Array.from(map.entries())
      .map(([publicId, name]) => ({ publicId, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const ACTIONS: TimesheetLogAction[] = ['SUBMIT', 'RESUBMIT', 'APPROVE', 'REJECT', 'REVERT'];

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filterUser !== 'all' && r.target.publicId !== filterUser) return false;
      if (filterAction !== 'all' && r.action !== filterAction) return false;
      return true;
    });
  }, [rows, filterUser, filterAction]);

  const sortedRows = useMemo(() => {
    const arr = [...filteredRows];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let av: string; let bv: string;
      switch (sortKey) {
        case 'when':      av = a.createdAt;     bv = b.createdAt;     break;
        case 'actor':     av = a.actor.name;    bv = b.actor.name;    break;
        case 'target':    av = a.target.name;   bv = b.target.name;   break;
        case 'action':    av = a.action;        bv = b.action;        break;
        case 'scope':     av = a.scope;         bv = b.scope;         break;
        case 'scopeDate': av = a.scopeDate;     bv = b.scopeDate;     break;
        case 'reason':    av = a.reason ?? '';  bv = b.reason ?? '';  break;
      }
      const cmp = av.localeCompare(bv);
      return cmp * dir;
    });
    return arr;
  }, [filteredRows, sortKey, sortDir]);

  // Reset página quando filtros mudam
  useEffect(() => { setCurrentPage(1); }, [filterUser, filterAction, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const visibleRows = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize, totalPages]);

  const pageList = buildPageList(Math.min(currentPage, totalPages), totalPages);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(k);
      setSortDir(k === 'when' || k === 'scopeDate' ? 'desc' : 'asc');
    }
  }

  function sortIcon(k: SortKey): string {
    if (sortKey !== k) return 'ri-arrow-up-down-line text-muted';
    return sortDir === 'asc' ? 'ri-arrow-up-line' : 'ri-arrow-down-line';
  }

  if (!open) return null;

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{t('history.title')}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label={tc('actions.close')} />
            </div>
            <div className="modal-body p-0">
              {/* Filtros: user + acção. Sempre visíveis; vazios na 1ª render
                 quando rows ainda está vazio — useMemo trata disso. */}
              <div className="d-flex flex-wrap gap-2 px-3 pt-3 pb-2">
                <div className="d-flex align-items-center gap-2">
                  <label className="text-muted fs-13 mb-0" htmlFor="ts-history-user">
                    {t('history.filter.user')}
                  </label>
                  <select
                    id="ts-history-user"
                    className="form-select form-select-sm"
                    style={{ width: 'auto', minWidth: 160 }}
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                  >
                    <option value="all">{t('history.filter.user_all')}</option>
                    {userOptions.map((u) => (
                      <option key={u.publicId} value={u.publicId}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <label className="text-muted fs-13 mb-0" htmlFor="ts-history-action">
                    {t('history.filter.action')}
                  </label>
                  <select
                    id="ts-history-action"
                    className="form-select form-select-sm"
                    style={{ width: 'auto', minWidth: 140 }}
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                  >
                    <option value="all">{t('history.filter.action_all')}</option>
                    {ACTIONS.map((a) => (
                      <option key={a} value={a}>
                        {t(`history.action.${a.toLowerCase()}` as 'history.action.submit')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ms-auto d-flex align-items-center gap-2">
                  <label className="text-muted fs-13 mb-0" htmlFor="ts-history-page-size">
                    {tp('table.per_page')}
                  </label>
                  <select
                    id="ts-history-page-size"
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
              </div>

              {loading ? (
                <div className="text-center text-muted py-4">{tc('messages.loading')}</div>
              ) : sortedRows.length === 0 ? (
                <div className="text-center text-muted py-4">{t('history.empty')}</div>
              ) : (
                <>
                  <div className="table-responsive px-3" style={{ maxHeight: 400, overflowY: 'auto' }}>
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <SortableHeader k="when"      label={t('history.col.when')}      sortKey={sortKey} sortDir={sortDir} icon={sortIcon('when')}      toggle={toggleSort} />
                          <SortableHeader k="actor"     label={t('history.col.actor')}     sortKey={sortKey} sortDir={sortDir} icon={sortIcon('actor')}     toggle={toggleSort} />
                          <SortableHeader k="target"    label={t('history.col.target')}    sortKey={sortKey} sortDir={sortDir} icon={sortIcon('target')}    toggle={toggleSort} />
                          <SortableHeader k="action"    label={t('history.col.action')}    sortKey={sortKey} sortDir={sortDir} icon={sortIcon('action')}    toggle={toggleSort} />
                          <SortableHeader k="scope"     label={t('history.col.scope')}     sortKey={sortKey} sortDir={sortDir} icon={sortIcon('scope')}     toggle={toggleSort} />
                          <SortableHeader k="scopeDate" label={t('history.col.scope_date')} sortKey={sortKey} sortDir={sortDir} icon={sortIcon('scopeDate')} toggle={toggleSort} />
                          <SortableHeader k="reason"    label={t('history.col.reason')}    sortKey={sortKey} sortDir={sortDir} icon={sortIcon('reason')}    toggle={toggleSort} />
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map((r) => (
                          <tr key={r.publicId}>
                            <td className="small text-muted">{formatMoment(r.createdAt, tz)}</td>
                            <td>{r.actor.name}</td>
                            <td>{r.target.name}</td>
                            <td>{t(`history.action.${r.action.toLowerCase()}` as 'history.action.submit')}</td>
                            <td>{t(`history.scope.${r.scope.toLowerCase()}` as 'history.scope.day')}</td>
                            <td className="small text-muted">{r.scopeDate}</td>
                            <td className="small">{r.reason ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination — mesma estrutura do TaskTable em /planning */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-end px-3 py-2">
                      <nav aria-label="Page navigation" className="pagination-style-1">
                        <ul className="pagination mb-0 flex-wrap">
                          <li className={`page-item${currentPage <= 1 ? ' disabled' : ''}`}>
                            <a className="page-link" href="#" onClick={(e) => {
                              e.preventDefault();
                              if (currentPage > 1) setCurrentPage(currentPage - 1);
                            }}>
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
                                <a className="page-link" href="#" onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(p);
                                }}>
                                  {p}
                                </a>
                              </li>
                            );
                          })}
                          <li className={`page-item${currentPage >= totalPages ? ' disabled' : ''}`}>
                            <a className="page-link" href="#" onClick={(e) => {
                              e.preventDefault();
                              if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                            }}>
                              <i className="ri-arrow-right-s-line align-middle" />
                            </a>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>{tc('actions.close')}</button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show"></div>
    </>
  );
}

interface SortableHeaderProps {
  k:        SortKey;
  label:    string;
  sortKey:  SortKey;
  sortDir:  SortDir;
  icon:     string;
  toggle:   (k: SortKey) => void;
}

function SortableHeader({ k, label, sortKey, icon, toggle }: SortableHeaderProps) {
  const active = sortKey === k;
  return (
    <th
      role="button"
      onClick={() => toggle(k)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
      className={active ? 'text-primary' : ''}
    >
      <span>{label}</span>
      <i className={`${icon} ms-1`} style={{ fontSize: 12 }} />
    </th>
  );
}
