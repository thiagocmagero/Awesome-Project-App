import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { getApiBase, apiFetch } from '../../../lib/api';
import { useTimezone } from '../../../contexts/TimezoneContext';
import type { GlobalFilters } from '../useTimesheetGlobal';
import type { ITimesheetApprovalRow, ITimesheetMyRow } from '../types';
import { addDaysISO, currentWeekStart, formatWeekRange } from '../dateUtils';

interface Props {
  mode:    'my' | 'approvals';
  filters: GlobalFilters;
  onChange: (filters: GlobalFilters) => void;
  /** Para o filtro "Utilizador" (apenas modo 'approvals'), passar lista de pessoas extraída da response. */
  approvalRows?: ITimesheetApprovalRow[];
  /** Para o filtro "Projecto", passar lista visível extraída da response. */
  myRows?:       ITimesheetMyRow[];
}

interface ProjectOption {
  publicId: string;
  name:     string;
}

/**
 * Filtros globais (3 dropdowns) + 1 extra de utilizador no modo approvals.
 * As listas de projectos / utilizadores são derivadas das próprias rows
 * actuais (sem chamada extra).
 */
export function TimesheetGlobalFilters({ mode, filters, onChange, approvalRows, myRows }: Props) {
  const { token } = useAuth();
  const { t } = useTranslation('timesheet');
  const tz = useTimezone();

  // Lista de projectos a que o user tem acesso — fetch só uma vez.
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await apiFetch(`${getApiBase()}/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = (await res.json()) as Array<{ publicId: string; name: string }>;
          setProjects(json.map((p) => ({ publicId: p.publicId, name: p.name })));
        }
      } catch (e) {
        console.error('[TimesheetGlobalFilters] projects fetch failed:', e);
      }
    })();
  }, [token]);

  const today = currentWeekStart(tz);
  const weekOptions: string[] = [];
  for (let i = -16; i <= 4; i++) weekOptions.push(addDaysISO(today, i * 7));

  // Lista de utilizadores derivada das rows
  const userOptions = approvalRows
    ? Array.from(new Map(approvalRows.map((r) => [r.user.publicId, r.user])).values())
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return (
    <div className="ts-global-filters">
      <select
        className="form-select"
        value={filters.projectPublicId ?? ''}
        onChange={(e) => onChange({ ...filters, projectPublicId: e.target.value || null })}
      >
        <option value="">{t('global.filter.project_all')}</option>
        {projects.map((p) => (
          <option key={p.publicId} value={p.publicId}>{p.name}</option>
        ))}
      </select>
      <select
        className="form-select"
        value={filters.weekStart ?? ''}
        onChange={(e) => onChange({ ...filters, weekStart: e.target.value || null })}
      >
        <option value="">{t('global.filter.week_all')}</option>
        {weekOptions.map((w) => (
          <option key={w} value={w}>{formatWeekRange(w)}</option>
        ))}
      </select>
      <select
        className="form-select"
        value={filters.status ?? ''}
        onChange={(e) => onChange({ ...filters, status: (e.target.value || null) as GlobalFilters['status'] })}
      >
        <option value="">{t('global.filter.status_all')}</option>
        <option value="DRAFT">{t('status.draft')}</option>
        <option value="SUBMITTED">{t('status.submitted')}</option>
        <option value="PARTIAL">{t('status.partial')}</option>
        <option value="APPROVED">{t('status.approved')}</option>
        <option value="REJECTED">{t('status.rejected')}</option>
      </select>
      {mode === 'approvals' && (
        <select
          className="form-select"
          value={filters.userPublicId ?? ''}
          onChange={(e) => onChange({ ...filters, userPublicId: e.target.value || null })}
        >
          <option value="">{t('global.filter.user_all')}</option>
          {userOptions.map((u) => (
            <option key={u.publicId} value={u.publicId}>{u.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
