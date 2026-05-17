import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover } from './Popover';

/** Port de NewTemplate/app-dark.jsx:1668-1698.
 *
 *  As notificações reais virão do backend (`useNotifications` em Fase 2.5);
 *  até lá mostramos o estado vazio sem dados mock — todas as strings i18n.
 */
export function NotificationPanel({ anchorRef, onClose }: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const { t: tc } = useTranslation('common');
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} panelClass="notif-panel" placement="below-end">
      <div className="notif-head">
        <div className="title">{tc('notifications.title')}</div>
        <div className="mark">{tc('notifications.mark_all_read')}</div>
      </div>
      <div className="notif-list" style={{ padding: '12px 16px 16px', color: 'var(--text-tertiary, #9ca3af)', fontSize: 12.5 }}>
        {tc('notifications.empty')}
      </div>
      <div className="notif-prefs">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
        <span>{tc('nav.notification_preferences')}</span>
      </div>
    </Popover>
  );
}
