import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { FeatureKey } from '../lib/entitlements';
import {
  EMPTY_FILTERS,
  useTimesheetApprovalAccess,
  useTimesheetGlobalApprovals,
  useTimesheetGlobalMy,
  type GlobalFilters,
} from '../features/timesheet/useTimesheetGlobal';
import { TimesheetGlobalFilters } from '../features/timesheet/components/TimesheetGlobalFilters';
import { TimesheetMyTable } from '../features/timesheet/components/TimesheetMyTable';
import { TimesheetApprovalsTable } from '../features/timesheet/components/TimesheetApprovalsTable';
import '../features/timesheet/timesheet.css';

/**
 * Página global /timesheets — duas tabs:
 *   1. "As minhas"     — próprias semanas em todos os projectos.
 *   2. "Para aprovar"  — fila de aprovação cross-project (gated por
 *                        TIMESHEET_APPROVE em ≥1 projecto).
 *
 * Filtros independentes por tab (estado local separado).
 * Aprovação na área global é apenas por SEMANA inteira (refinamento spec).
 */
export default function TimesheetsPage() {
  const { t } = useTranslation('timesheet');
  // PLATFORM_ADMIN bypass é tratado dentro do useFeatureFlag.
  const { enabled: allowed } = useFeatureFlag(FeatureKey.TIMESHEET_VIEW);

  const { hasAccess: hasApprovalAccess, loading: accessLoading } = useTimesheetApprovalAccess();

  const [activeTab, setActiveTab] = useState<'my' | 'approvals'>('my');
  const [myFilters, setMyFilters] = useState<GlobalFilters>(EMPTY_FILTERS);
  const [approvalsFilters, setApprovalsFilters] = useState<GlobalFilters>(EMPTY_FILTERS);

  const my        = useTimesheetGlobalMy(myFilters);
  const approvals = useTimesheetGlobalApprovals(approvalsFilters);

  if (!allowed) {
    return (
      <div className="container-xxl py-4">
        <div className="alert alert-warning">{t('global.feature_unavailable')}</div>
      </div>
    );
  }

  return (
    <div className="container-xxl py-4">
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb breadcrumb-style2 mb-0">
          <li className="breadcrumb-item"><i className="ri-home-line me-1" />{t('global.breadcrumb_home')}</li>
          <li className="breadcrumb-item active" aria-current="page">{t('global.page_title')}</li>
        </ol>
      </nav>

      <div className="ts-global-header">
        <h1>{t('global.page_title')}</h1>
        <div className="ts-global-tabs">
          <button
            type="button"
            className={activeTab === 'my' ? 'is-active' : ''}
            onClick={() => setActiveTab('my')}
          >
            {t('global.tab_mine')}
          </button>
          {!accessLoading && hasApprovalAccess && (
            <button
              type="button"
              className={activeTab === 'approvals' ? 'is-active' : ''}
              onClick={() => setActiveTab('approvals')}
            >
              {t('global.tab_approvals')}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'my' ? (
        <>
          <TimesheetGlobalFilters
            mode="my"
            filters={myFilters}
            onChange={setMyFilters}
            myRows={my.rows}
          />
          <TimesheetMyTable rows={my.rows} loading={my.loading} />
        </>
      ) : (
        <>
          <TimesheetGlobalFilters
            mode="approvals"
            filters={approvalsFilters}
            onChange={setApprovalsFilters}
            approvalRows={approvals.rows}
          />
          <TimesheetApprovalsTable
            rows={approvals.rows}
            loading={approvals.loading}
            onApprove={approvals.approveWeek}
            onReject={approvals.rejectWeek}
          />
        </>
      )}
    </div>
  );
}
