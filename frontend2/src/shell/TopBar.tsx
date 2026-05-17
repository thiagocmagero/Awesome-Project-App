import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { localeFlagUrl, type ActiveLocale } from '../lib/localeFlag';
import { T } from './tokens';

interface Props {
  onToggleSidebar: () => void;
  notifOpen: boolean;
  onToggleNotif: () => void;
  notifBtnRef: RefObject<HTMLButtonElement | null>;
  onToggleCreate: () => void;
  createBtnRef: RefObject<HTMLButtonElement | null>;
  onToggleLang: () => void;
  langBtnRef: RefObject<HTMLButtonElement | null>;
  currentLang: string;
  locales: readonly ActiveLocale[];
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

/** Port 1:1 de NewTemplate/app-dark.jsx:978-1037. */
export function TopBar({
  onToggleSidebar, notifOpen, onToggleNotif, notifBtnRef,
  onToggleCreate, createBtnRef,
  onToggleLang, langBtnRef, currentLang, locales,
  onToggleFullscreen, isFullscreen,
  theme, onToggleTheme,
}: Props) {
  const { t: tc } = useTranslation('common');
  const lang = locales.find((l) => l.code === currentLang) ?? locales[0];
  const langName = lang?.name ?? currentLang;
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onToggleSidebar} aria-label={tc('topbar.toggle_sidebar')}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="20" y1="20" x2="16.65" y2="16.65" />
        </svg>
        <input placeholder={tc('search.placeholder')} />
        <span className="kbd">⌘K</span>
      </div>
      <button ref={createBtnRef} className="create-btn" onClick={onToggleCreate}>
        <span className="plus">+</span>
        <span>{tc('actions.create')}</span>
      </button>
      <button
        className="icon-btn theme-btn"
        title={theme === 'dark' ? tc('theme.light') : tc('theme.dark')}
        onClick={onToggleTheme}
        aria-label={tc('theme.title')}
      >
        {theme === 'dark' ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
      <button
        className="icon-btn"
        title={isFullscreen ? tc('topbar.fullscreen_exit') : tc('topbar.fullscreen_enter')}
        onClick={onToggleFullscreen}
      >
        {isFullscreen ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v4a1 1 0 0 1-1 1H3M21 8h-4a1 1 0 0 1-1-1V3M3 16h4a1 1 0 0 1 1 1v4M16 21v-4a1 1 0 0 1 1-1h4" />
          </svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8V3h5M21 8V3h-5M3 16v5h5M21 16v5h-5" />
          </svg>
        )}
      </button>
      <button
        ref={langBtnRef}
        className="lang-flag-btn"
        title={tc('topbar.language_title', { name: langName })}
        onClick={onToggleLang}
      >
        {lang && <img src={localeFlagUrl(lang)} alt={langName} />}
      </button>
      <button
        ref={notifBtnRef}
        className={'icon-btn has-badge' + (notifOpen ? ' is-active' : '')}
        title={tc('notifications.title')}
        onClick={onToggleNotif}
        style={notifOpen ? { background: T.panel3, color: T.ink } : undefined}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span className="badge" />
      </button>
    </header>
  );
}
