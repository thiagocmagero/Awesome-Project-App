import { useTranslation } from 'react-i18next';
import { useAuditLogs } from '../useAuditLogs';
import {
  AUDIT_STATUSES,
  HTTP_METHODS,
  type AuditFilters,
  type AuditLogEntry,
  type AuditLogStatus,
} from '../types';
import { formatMoment } from '../../../lib/dateFormatting';
import { useTimezone } from '../../../contexts/TimezoneContext';

interface AuditLogTableProps {
  /** Path absoluto sem o prefixo `/api/v1` (ex: `/audit-logs`). */
  endpoint: string;
  /** Opções do dropdown "por página". A 1ª opção é também o defaultLimit. */
  pageSizeOptions?: number[];
  /** Esconde o filtro "User ID" (ex: dentro do detalhe de cliente — já é fixo). */
  hideUserFilter?: boolean;
  /** Esconde o título "Filtros" (ex: tab dentro de modal). */
  hideFiltersTitle?: boolean;
}

const DEFAULT_PAGE_SIZES = [10, 20, 30, 50, 100];

export function AuditLogTable({
  endpoint,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  hideUserFilter = false,
  hideFiltersTitle = false,
}: AuditLogTableProps) {
  const { t } = useTranslation('audit');
  const tz = useTimezone();
  const defaultLimit = pageSizeOptions[0] ?? 10;

  const {
    data,
    meta,
    draftFilters,
    loading,
    error,
    setDraftFilter,
    applyFilters,
    clearFilters,
    setPage,
    setLimit,
  } = useAuditLogs({ endpoint, defaultLimit });

  const from = data.length === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = (meta.page - 1) * meta.limit + data.length;

  return (
    <div className="audit-log-table">
      <FiltersCard
        filters={draftFilters}
        onChange={setDraftFilter}
        onApply={applyFilters}
        onClear={clearFilters}
        hideUserFilter={hideUserFilter}
        hideTitle={hideFiltersTitle}
        t={t}
      />

      <div className="card custom-card mt-3">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover text-nowrap mb-0">
              <thead>
                <tr>
                  <th>{t('table.col.timestamp')}</th>
                  <th>{t('table.col.user')}</th>
                  <th>{t('table.col.method')}</th>
                  <th>{t('table.col.url')}</th>
                  <th>{t('table.col.action')}</th>
                  <th>{t('table.col.resource')}</th>
                  <th>{t('table.col.status')}</th>
                  <th>{t('table.col.status_code')}</th>
                  <th>{t('table.col.ip')}</th>
                  <th className="text-end">{t('table.col.duration')}</th>
                </tr>
              </thead>
              <tbody>
                {loading && data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-5 text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status" />
                      {t('table.loading')}
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={10} className="text-center py-5 text-danger">
                      {t('errors.load')}
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-5 text-muted">
                      {t('table.empty')}
                    </td>
                  </tr>
                ) : (
                  data.map((row) => (
                    <AuditRow key={row.publicId} row={row} tz={tz} t={t} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-footer d-flex flex-wrap align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2 text-muted fs-12">
            <span>{t('pagination.showing', { from, to, total: meta.total })}</span>
          </div>
          <div className="d-flex align-items-center gap-3">
            <label className="d-flex align-items-center gap-2 mb-0 fs-12 text-muted">
              {t('pagination.page_size')}
              <select
                className="form-select form-select-sm"
                style={{ width: 'auto' }}
                value={meta.limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <Pagination
              page={meta.page}
              totalPages={meta.totalPages}
              onChange={setPage}
              t={t}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

interface FiltersCardProps {
  filters: AuditFilters;
  onChange: <K extends keyof AuditFilters>(key: K, value: AuditFilters[K]) => void;
  onApply: () => void;
  onClear: () => void;
  hideUserFilter: boolean;
  hideTitle: boolean;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function FiltersCard({
  filters,
  onChange,
  onApply,
  onClear,
  hideUserFilter,
  hideTitle,
  t,
}: FiltersCardProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onApply();
  }

  function handleReset() {
    // `onClear` no hook reseta `draftFilters` E `filters` ao `EMPTY_FILTERS` +
    // volta à página 1 — não é preciso onChange manual por campo.
    onClear();
  }

  return (
    <form className="card custom-card" onSubmit={handleSubmit}>
      {!hideTitle && (
        <div className="card-header">
          <h6 className="card-title mb-0">{t('filters.title')}</h6>
        </div>
      )}
      <div className="card-body">
        <div className="row g-3">
          <div className="col-12 col-md-6 col-lg-4">
            <label className="form-label fs-12">{t('filters.url')}</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder={t('filters.placeholder.url')}
              value={filters.url ?? ''}
              onChange={(e) => onChange('url', e.target.value)}
            />
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label fs-12">{t('filters.method')}</label>
            <select
              className="form-select form-select-sm"
              value={filters.method ?? ''}
              onChange={(e) => onChange('method', e.target.value as AuditFilters['method'])}
            >
              <option value="">{t('filters.placeholder.any')}</option>
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label fs-12">{t('filters.status')}</label>
            <select
              className="form-select form-select-sm"
              value={filters.status ?? ''}
              onChange={(e) => onChange('status', e.target.value as AuditFilters['status'])}
            >
              <option value="">{t('filters.placeholder.any')}</option>
              {AUDIT_STATUSES.map((s) => (
                <option key={s} value={s}>{t(`status.${s.toLowerCase()}`)}</option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label fs-12">{t('filters.status_code')}</label>
            <input
              type="number"
              className="form-control form-control-sm"
              placeholder={t('filters.placeholder.status_code')}
              min={100}
              max={599}
              value={filters.statusCode ?? ''}
              onChange={(e) => onChange('statusCode', e.target.value)}
            />
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label fs-12">{t('filters.action')}</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder={t('filters.placeholder.action')}
              value={filters.action ?? ''}
              onChange={(e) => onChange('action', e.target.value)}
            />
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label fs-12">{t('filters.resource_type')}</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder={t('filters.placeholder.resource_type')}
              value={filters.resourceType ?? ''}
              onChange={(e) => onChange('resourceType', e.target.value)}
            />
          </div>

          {!hideUserFilter && (
            <div className="col-12 col-md-6 col-lg-3">
              <label className="form-label fs-12">{t('filters.user_id')}</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder={t('filters.placeholder.user_id')}
                value={filters.userId ?? ''}
                onChange={(e) => onChange('userId', e.target.value)}
              />
            </div>
          )}

          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label fs-12">{t('filters.ip')}</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder={t('filters.placeholder.ip')}
              value={filters.ip ?? ''}
              onChange={(e) => onChange('ip', e.target.value)}
            />
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label fs-12">{t('filters.start_date')}</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={filters.startDate ?? ''}
              onChange={(e) => onChange('startDate', e.target.value)}
            />
          </div>

          <div className="col-6 col-md-3 col-lg-2">
            <label className="form-label fs-12">{t('filters.end_date')}</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={filters.endDate ?? ''}
              onChange={(e) => onChange('endDate', e.target.value)}
            />
          </div>
        </div>

        <div className="d-flex gap-2 mt-3">
          <button type="submit" className="btn btn-primary btn-sm">
            <i className="ri-filter-3-line me-1" />
            {t('filters.apply')}
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleReset}>
            {t('filters.clear')}
          </button>
        </div>
      </div>
    </form>
  );
}

interface AuditRowProps {
  row: AuditLogEntry;
  tz: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function AuditRow({ row, tz, t }: AuditRowProps) {
  return (
    <tr>
      <td>
        <span className="fs-12 fw-medium">{formatMoment(row.createdAt, tz)}</span>
      </td>
      <td>
        {row.user ? (
          <div>
            <div className="fw-medium fs-12">{row.user.name}</div>
            <div className="text-muted fs-11">{row.user.email}</div>
          </div>
        ) : (
          <span className="text-muted fs-12">{t('table.user_anonymous')}</span>
        )}
      </td>
      <td><MethodBadge method={row.method} /></td>
      <td>
        <code className="fs-11" style={{ wordBreak: 'break-all', whiteSpace: 'normal' }}>
          {row.url}
        </code>
      </td>
      <td className="fs-12">{row.action ?? <span className="text-muted">—</span>}</td>
      <td className="fs-12">
        {row.resourceType ? (
          <div>
            <div>{row.resourceType}</div>
            {row.resourceId && (
              <div className="text-muted fs-11" title={row.resourceId}>
                {row.resourceId.slice(0, 8)}…
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td><StatusBadge status={row.status} t={t} /></td>
      <td className="fs-12 fw-medium">{row.statusCode}</td>
      <td className="fs-12 text-muted">{row.ip ?? '—'}</td>
      <td className="text-end fs-12 text-muted">{row.duration}</td>
    </tr>
  );
}

function MethodBadge({ method }: { method: string }) {
  const cls =
    method === 'GET' ? 'bg-info-transparent text-info'
    : method === 'POST' ? 'bg-success-transparent text-success'
    : method === 'PUT' || method === 'PATCH' ? 'bg-warning-transparent text-warning'
    : method === 'DELETE' ? 'bg-danger-transparent text-danger'
    : 'bg-light text-dark';
  return <span className={`badge ${cls} fs-11`}>{method}</span>;
}

function StatusBadge({ status, t }: { status: AuditLogStatus; t: (key: string) => string }) {
  const cls =
    status === 'SUCCESS' ? 'bg-success-transparent text-success'
    : status === 'FORBIDDEN' ? 'bg-warning-transparent text-warning'
    : 'bg-danger-transparent text-danger';
  return <span className={`badge ${cls} fs-11`}>{t(`status.${status.toLowerCase()}`)}</span>;
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

function Pagination({ page, totalPages, onChange, t }: PaginationProps) {
  return (
    <div className="d-flex align-items-center gap-2">
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label={t('pagination.prev')}
      >
        <i className="ri-arrow-left-s-line" />
      </button>
      <span className="fs-12 text-muted">
        {t('pagination.page_n', { page, pages: totalPages })}
      </span>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label={t('pagination.next')}
      >
        <i className="ri-arrow-right-s-line" />
      </button>
    </div>
  );
}
