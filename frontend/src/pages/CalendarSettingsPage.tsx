import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { CALENDAR_CONFIG_DEFAULTS, type CalendarConfigData, type CalendarView } from '../features/calendar/types';

type Tab = 'global' | 'user';

const VIEW_OPTIONS: Array<{ value: CalendarView; labelKey: string }> = [
  { value: 'dayGridMonth', labelKey: 'view.month' },
  { value: 'timeGridWeek', labelKey: 'view.week' },
  { value: 'timeGridDay',  labelKey: 'view.day' },
  { value: 'listWeek',     labelKey: 'view.list' },
];

interface ConfigPanelProps {
  scope: 'global' | 'user';
  config: CalendarConfigData;
  onChange: (c: CalendarConfigData) => void;
}

function ConfigPanel({ scope, config, onChange }: ConfigPanelProps) {
  const { t: tCal } = useTranslation('calendar');

  const view     = config.view     ?? CALENDAR_CONFIG_DEFAULTS.view;
  const firstDay = config.firstDay ?? CALENDAR_CONFIG_DEFAULTS.firstDay;

  return (
    <div className="card custom-card">
      <div className="card-body">
        <p className="text-muted fs-13 mb-4">
          {scope === 'global' ? tCal('settings.global_hint') : tCal('settings.user_hint')}
        </p>

        <div className="mb-4">
          <label className="form-label fw-semibold fs-13">{tCal('settings.section.view')}</label>
          <select
            className="form-select form-select-sm"
            value={view}
            onChange={(e) => onChange({ ...config, view: e.target.value as CalendarView })}
          >
            {VIEW_OPTIONS.map((v) => (
              <option key={v.value} value={v.value}>
                {tCal(v.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="form-label fw-semibold fs-13">{tCal('settings.section.first_day')}</label>
          <select
            className="form-select form-select-sm"
            value={String(firstDay)}
            onChange={(e) => onChange({ ...config, firstDay: Number(e.target.value) as 0 | 1 })}
          >
            <option value="0">{tCal('settings.first_day.sunday')}</option>
            <option value="1">{tCal('settings.first_day.monday')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default function CalendarSettingsPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const { t: tCal } = useTranslation('calendar');
  const { t: tc }   = useTranslation('common');
  const isAdmin = user?.profileCode === 'PLATFORM_ADMIN';

  const [tab, setTab] = useState<Tab>(isAdmin ? 'global' : 'user');
  const [globalConfig, setGlobalConfig] = useState<CalendarConfigData>({});
  const [userConfig,   setUserConfig]   = useState<CalendarConfigData>({});

  useEffect(() => {
    if (!token) return;
    const api = getApiBase();
    if (isAdmin) {
      apiFetch(`${api}/calendar-config/global`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((rec) => { if (rec?.config) setGlobalConfig(rec.config); })
        .catch(() => {});
    }
    apiFetch(`${api}/calendar-config/user`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((rec) => { if (rec?.config) setUserConfig(rec.config); })
      .catch(() => {});
  }, [token, isAdmin]);

  async function persist(scope: 'global' | 'user', payload: CalendarConfigData) {
    if (!token) return;
    const api = getApiBase();
    const url = scope === 'global' ? `${api}/calendar-config/global` : `${api}/calendar-config/user`;
    try {
      const r = await apiFetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        showToast('danger', tCal('errors.save_failed'));
      }
    } catch {
      showToast('danger', tCal('errors.save_failed'));
    }
  }

  return (
    <div>
      <div className="my-3">
        <h5 className="fw-semibold mb-1">
          <i className="ri-calendar-line me-2 text-primary" />
          {tCal('page.title')}
        </h5>
      </div>

      {isAdmin && (
        <ul className="nav nav-tabs mb-3">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link${tab === 'global' ? ' active' : ''}`}
              onClick={() => setTab('global')}
            >
              <i className="ti ti-world me-1" />
              {tCal('settings.tab.global')}
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link${tab === 'user' ? ' active' : ''}`}
              onClick={() => setTab('user')}
            >
              <i className="ti ti-user me-1" />
              {tCal('settings.tab.user')}
            </button>
          </li>
        </ul>
      )}

      {tab === 'global' && isAdmin && (
        <ConfigPanel
          scope="global"
          config={globalConfig}
          onChange={(c) => { setGlobalConfig(c); persist('global', c); }}
        />
      )}

      {tab === 'user' && (
        <ConfigPanel
          scope="user"
          config={userConfig}
          onChange={(c) => { setUserConfig(c); persist('user', c); }}
        />
      )}

      <div className="text-muted fs-12 mt-3">
        <i className="ri-information-line me-1" />
        {tc('messages.success_updated')}
      </div>
    </div>
  );
}
