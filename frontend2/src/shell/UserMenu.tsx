import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover } from './Popover';
import type { Chrome, Theme } from '../contexts/ThemeContext';
import type { AuthUser } from '../contexts/AuthContext';
import { avatarColorFor, avatarUrlOf, initialsOf } from '../lib/avatars';
import { useWorkspaces } from '../contexts/WorkspacesContext';

interface Props {
  anchorRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  chrome: Chrome;
  setChrome: (c: Chrome) => void;
  onOpenAccount: (tab: string) => void;
  onOpenNewWorkspace: () => void;
  onSwitchWorkspace: (id: string) => void;
  onLogout: () => void;
  user: AuthUser | null;
}

/** Port de NewTemplate/app-dark.jsx:1700-1794 — workspaces vindos do
 *  `WorkspacesContext` (real backend); glyph + cor derivados via
 *  `initialsOf` / `avatarColorFor`. */
export function UserMenu({
  anchorRef, onClose, theme, onToggleTheme, chrome, setChrome,
  onOpenAccount, onOpenNewWorkspace, onSwitchWorkspace, onLogout, user,
}: Props) {
  const { t: tc } = useTranslation('common');
  const { workspaces, activeWorkspace } = useWorkspaces();
  const activePublicId = activeWorkspace?.publicId ?? null;
  const avatarUrl = user ? avatarUrlOf(user) : null;
  const switchTo = (id: string) => {
    if (id !== activePublicId) onSwitchWorkspace(id);
    onClose();
  };
  return (
    <Popover anchorRef={anchorRef} onClose={onClose} panelClass="user-menu" placement="right-bottom" offset={10}>
      {/* Left: workspaces */}
      <div className="ws-pane">
        <div className="ws-pane-head">{tc('nav.account')}</div>
        {workspaces.map((w) => {
          const isActive = w.publicId === activePublicId;
          return (
            <div
              key={w.publicId}
              className={'ws-row' + (isActive ? ' active' : '')}
              onClick={() => switchTo(w.publicId)}
            >
              <div className="glyph" style={{ background: avatarColorFor(w.publicId) }}>{initialsOf(w.name)}</div>
              <span className="name">{w.name}</span>
              {isActive && <span className="check">✓</span>}
            </div>
          );
        })}
        <div className="ws-add" onClick={() => { onClose(); onOpenNewWorkspace(); }}>
          <span className="ico">+</span>
          <span>{tc('workspaces.new')}</span>
        </div>
        <div className="ws-pane-spacer" />
        <div className="ws-logout">
          <div className="menu-item" onClick={() => { onClose(); onLogout(); }}>
            <span className="ico">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </span>
            {tc('nav.logout')}
          </div>
        </div>
      </div>

      {/* Right: account actions */}
      <div className="acc-pane">
        <div className="acc-trial">
          <span>{tc('trial.days_remaining', { count: 5 })}</span>
          <a href="#" onClick={(e) => e.preventDefault()}>{tc('trial.learn_more')}</a>
        </div>

        <div className="acc-profile">
          {avatarUrl ? (
            <img
              className="avatar lg"
              src={avatarUrl}
              alt={user!.name}
              title={user!.name}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div
              className="avatar lg"
              title={user?.name ?? ''}
              style={{ background: user ? avatarColorFor(user.publicId) : '#888' }}
            >
              {user ? initialsOf(user.name) : '?'}
            </div>
          )}
          <div className="info">
            <span className="name">{user?.name ?? '—'}</span>
            <span className="email">{user?.email ?? ''}</span>
          </div>
        </div>

        <div className="menu-divider" />

        <div className="menu-item" onClick={() => onOpenAccount('account')}>
          <span className="ico">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          {tc('nav.account_settings')}
        </div>
        <div className="menu-item" onClick={() => onOpenAccount('notif')}>
          <span className="ico">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          {tc('notifications.title')}
        </div>
        <div className="menu-item" onClick={() => onOpenAccount('security')}>
          <span className="ico">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          {tc('nav.security')}
        </div>
        <div className="menu-item">
          <span className="ico">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="20" x2="21" y2="20" />
              <line x1="6" y1="20" x2="6" y2="12" />
              <line x1="12" y1="20" x2="12" y2="6" />
              <line x1="18" y1="20" x2="18" y2="14" />
            </svg>
          </span>
          {tc('nav.plan_usage')}
        </div>

        <div className="menu-divider" />

        <div className="menu-item">
          <span className="ico">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          {tc('nav.documentation')}
        </div>
        <div className="menu-item">
          <span className="ico">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
          {tc('nav.support')}
        </div>

        <div className="menu-divider" />

        <div className="menu-item" onClick={onToggleTheme}>
          <span className="ico">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </span>
          {theme === 'light' ? tc('theme.light_mode') : tc('theme.dark_mode')}
          <span className={'switch' + (theme === 'dark' ? ' on' : '')} />
        </div>
        {theme === 'light' && (
          <div
            className="menu-item"
            onClick={(e) => { e.stopPropagation(); setChrome(chrome === 'super-light' ? 'default' : 'super-light'); }}
          >
            <span className="ico">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M16.95 16.95l1.42 1.42M5.6 18.4l1.4-1.4M16.95 7.05l1.42-1.42" />
              </svg>
            </span>
            {tc('theme.super_light')}
            <span className={'switch' + (chrome === 'super-light' ? ' on' : '')} />
          </div>
        )}
      </div>
    </Popover>
  );
}
