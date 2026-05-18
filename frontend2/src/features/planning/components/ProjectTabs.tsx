// Tabs navigation — canónico NewTemplate/app-dark.jsx:1453-1467.
// Renderiza `<div class="tabs">` com `<div class="tab">` children.
// State activeTab é EXTERNALIZADO (passado pelo pai) — para que a tab
// content possa viver fora deste componente.

import { useTranslation } from 'react-i18next';

export type ProjectTabKey = 'overview' | 'list' | 'board' | 'timeline' | 'calendar' | 'files';

const TABS: Array<{ key: ProjectTabKey; i18nKey: string }> = [
  { key: 'overview', i18nKey: 'tabs.overview' },
  { key: 'list',     i18nKey: 'tabs.list' },
  { key: 'board',    i18nKey: 'tabs.board' },
  { key: 'timeline', i18nKey: 'tabs.timeline' },
  { key: 'calendar', i18nKey: 'tabs.calendar' },
  { key: 'files',    i18nKey: 'tabs.files' },
];

interface Props {
  activeTab: ProjectTabKey;
  onChange: (next: ProjectTabKey) => void;
}

export function TabsNav({ activeTab, onChange }: Props) {
  const { t } = useTranslation('planning');
  return (
    <div className="tabs">
      {TABS.map((tab) => (
        <div
          key={tab.key}
          role="tab"
          tabIndex={0}
          aria-selected={activeTab === tab.key}
          className={`tab${activeTab === tab.key ? ' active' : ''}`}
          onClick={() => onChange(tab.key)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onChange(tab.key);
            }
          }}
        >
          {t(tab.i18nKey)}
        </div>
      ))}
      <div
        className="tab"
        style={{ color: 'var(--mute)' }}
        aria-disabled="true"
        title={t('actions.coming_soon_tip')}
      >+</div>
    </div>
  );
}
