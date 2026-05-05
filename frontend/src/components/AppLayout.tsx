import { useEffect, useRef, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePendingInvitations } from '../hooks/usePendingInvitations';
import { useNotifications } from '../hooks/useNotifications';
import PlatformConfigPanel from './PlatformConfigPanel';
import { useToast } from '../contexts/ToastContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { TimezoneProvider, useTimezone } from '../contexts/TimezoneContext';
import { relativeTimeInTimezone } from '../lib/dateFormatting';

// ─── Notification helpers ─────────────────────────────────────────────────────

function notifInitials(str: string) {
  return str
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  '#6c5ce7', '#00b894', '#e17055', '#0984e3',
  '#fd79a8', '#fdcb6e', '#55efc4', '#d63031',
];

function notifAvatarColor(str: string) {
  let hash = 0;
  for (const c of str) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// notifRelativeTime foi substituído por relativeTimeInTimezone (lib/dateFormatting.ts)
// — usa o tz do TimezoneContext em vez de assumir hora local.

// ─── LanguageSelector ─────────────────────────────────────────────────────────

interface ActiveLocale {
  code: string;
  name: string;
  flag: string | null;
}

function LanguageSelector() {
  const { i18n: i18nInstance } = useTranslation('common');
  const currentLocale = i18nInstance.language;
  const [locales, setLocales] = useState<ActiveLocale[]>([]);

  useEffect(() => {
    fetch('/api/i18n/locales/active')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLocales(data); })
      .catch(() => {});
  }, []);

  if (locales.length === 0) return null;

  return (
    <li className="header-element country-selector dropdown">
      <a
        href="#"
        className="header-link dropdown-toggle"
        data-bs-auto-close="outside"
        data-bs-toggle="dropdown"
        aria-expanded="false"
        onClick={(e) => e.preventDefault()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="header-link-icon" viewBox="0 0 256 256">
          <rect width="256" height="256" fill="none" />
          <polyline points="240 216 184 104 128 216" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
          <line x1="144" y1="184" x2="224" y2="184" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
          <line x1="96" y1="32" x2="96" y2="56" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
          <line x1="32" y1="56" x2="160" y2="56" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
          <path d="M128,56a96,96,0,0,1-96,96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
          <path d="M69.47,88A96,96,0,0,0,160,152" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
        </svg>
      </a>
      <ul className="main-header-dropdown dropdown-menu dropdown-menu-end">
        {locales.map((locale) => (
          <li key={locale.code}>
            <a
              className={`dropdown-item d-flex align-items-center gap-2${currentLocale === locale.code ? ' active' : ''}`}
              href="#"
              onClick={(e) => { e.preventDefault(); i18nInstance.changeLanguage(locale.code); }}
            >
              {locale.flag && (
                <span className="avatar avatar-rounded avatar-xs">
                  <img src={`/assets/images/flags/${locale.flag}`} alt={locale.name} />
                </span>
              )}
              <span>{locale.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </li>
  );
}

// Tracks whether the template scripts have already been loaded
let scriptsLoaded = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.body.appendChild(s);
  });
}

function AppLayoutInner() {
  const tz = useTimezone();
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const initialized = useRef(false);
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('common');

  const { notifications, unreadCount, markAsRead, markAllAsRead, refetch: refetchNotifications } = useNotifications();

  // After SweetAlert accept/decline, mark the corresponding INVITATION_RECEIVED notification as read
  usePendingInvitations((invitationPublicId: string) => {
    const notif = notifications.find(
      (n) => n.type === 'INVITATION_RECEIVED' && n.entityPublicId === invitationPublicId,
    );
    if (notif) {
      markAsRead([notif.publicId]).catch(() => {});
    }
    refetchNotifications().catch(() => {});
  });

  const [configOpen, setConfigOpen] = useState(false);
  const isPlatformAdmin = user?.profileCode === 'PLATFORM_ADMIN';
  const [inviteActionLoading, setInviteActionLoading] = useState<string | null>(null);

  async function handleInviteAction(
    notifPublicId: string,
    invitationPublicId: string,
    action: 'accept' | 'decline',
  ) {
    if (!token) return;
    setInviteActionLoading(notifPublicId);
    try {
      const res = await apiFetch(`${api}/invitations/${invitationPublicId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await markAsRead([notifPublicId]);
        await refetchNotifications();
        showToast(
          action === 'accept' ? 'success' : 'info',
          action === 'accept'
            ? t('invitations.accepted')
            : t('invitations.declined'),
        );
      } else {
        const body = await res.json().catch(() => ({}));
        const msg = Array.isArray(body.message) ? body.message.join(' · ') : (body.message ?? `Erro ${res.status}`);
        // If convite já foi respondido (e.g. via SweetAlert), just mark as read silently
        if (res.status === 403 && msg.toLowerCase().includes('respondido')) {
          await markAsRead([notifPublicId]);
          await refetchNotifications();
        } else {
          showToast('danger', msg);
        }
      }
    } catch {
      showToast('danger', t('invitations.network_error'));
    } finally {
      setInviteActionLoading(null);
    }
  }

  /** Clique numa notificação: marca como lida e navega para o destino relevante */
  async function handleNotifClick(notifPublicId: string, notifType: string, projectPublicId?: string, entityPublicId?: string) {
    if (notifPublicId) markAsRead([notifPublicId]).catch(() => {});
    // Close the Bootstrap dropdown programmatically
    document.querySelector('.notifications-dropdown .dropdown-toggle')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    if (projectPublicId && (notifType === 'TASK_ASSIGNED' || notifType === 'MENTION' || notifType === 'COMMENT_REACTION')) {
      if (entityPublicId) {
        navigate(`/projects/${projectPublicId}/planning/tasks/${entityPublicId}`);
      } else {
        navigate(`/projects/${projectPublicId}/planning`);
      }
    } else if (projectPublicId && (notifType === 'INVITATION_ACCEPTED' || notifType === 'INVITATION_DECLINED')) {
      navigate('/projects');
    }
  }

  // Load template JS once after sidebar/header DOM is ready
  useEffect(() => {
    // Always enforce full-width layout — prevent localStorage zynixboxed from
    // shrinking the page to 1400px (data-width=boxed set by main.js)
    document.documentElement.setAttribute('data-width', 'fullwidth');

    if (initialized.current || scriptsLoaded) return;
    initialized.current = true;
    scriptsLoaded = true;

    (async () => {
      await loadScript('/assets/libs/@popperjs/core/umd/popper.min.js');
      await loadScript('/assets/libs/bootstrap/js/bootstrap.bundle.min.js');
      await loadScript('/assets/js/defaultmenu.min.js');
      await loadScript('/assets/libs/node-waves/waves.min.js');
      await loadScript('/assets/js/sticky.js');
      await loadScript('/assets/libs/simplebar/simplebar.min.js');
      await loadScript('/assets/js/simplebar.js');
      await loadScript('/assets/js/custom-switcher.min.js');
      await loadScript('/assets/libs/flatpickr/flatpickr.min.js');
      await loadScript('/assets/js/custom.js');
      await loadScript('/assets/libs/choices.js/public/assets/scripts/choices.min.js');
      // FullCalendar v6.1.9 (MIT) — bundle global + locales + Zynix overrides
      await loadScript('/assets/libs/fullcalendar/index.global.min.js');
      if (!document.getElementById('calendar-zynix-css')) {
        const link = document.createElement('link');
        link.id = 'calendar-zynix-css'; link.rel = 'stylesheet';
        link.href = '/assets/css/calendar-zynix.css';
        document.head.appendChild(link);
      }
      // DHTMLX Gantt JS carregado dinamicamente na PlanningPage quando feature flag activa
    })();
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'SA';

  return (
    <div className="page">

      {/* Page Loader */}
      <div id="loader">
        <img src="/assets/images/media/loader.svg" alt="loading" />
      </div>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="app-header sticky" id="header">
        <div className="main-header-container container-fluid">

          {/* Left */}
          <div className="header-content-left">
            <div className="header-element">
              <div className="horizontal-logo">
                <NavLink to="/dashboard" className="header-logo">
                  <img src="/assets/images/brand-logos/desktop-logo.png" alt="logo" className="desktop-logo" />
                  <img src="/assets/images/brand-logos/toggle-logo.png" alt="logo" className="toggle-logo" />
                  <img src="/assets/images/brand-logos/desktop-dark.png" alt="logo" className="desktop-dark" />
                  <img src="/assets/images/brand-logos/toggle-dark.png" alt="logo" className="toggle-dark" />
                </NavLink>
              </div>
            </div>
            <div className="header-element">
              <a
                aria-label="Toggle Sidebar"
                className="sidemenu-toggle header-link"
                data-bs-toggle="sidebar"
                href="#"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="header-link-icon menu-btn" width="32" height="32" fill="#000" viewBox="0 0 256 256">
                  <path d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" className="header-link-icon menu-btn-close" width="32" height="32" fill="#000" viewBox="0 0 256 256">
                  <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Right */}
          <ul className="header-content-right">

            {/* Language selector */}
            <LanguageSelector />

            {/* Dark/Light mode toggle */}
            <li className="header-element header-theme-mode">
              <a href="#" className="header-link layout-setting">
                <span className="light-layout">
                  <svg xmlns="http://www.w3.org/2000/svg" className="header-link-icon" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none" />
                    <path d="M108.11,28.11A96.09,96.09,0,0,0,227.89,147.89,96,96,0,1,1,108.11,28.11Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  </svg>
                </span>
                <span className="dark-layout">
                  <svg xmlns="http://www.w3.org/2000/svg" className="header-link-icon" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none" />
                    <circle cx="128" cy="128" r="56" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <line x1="128" y1="40" x2="128" y2="24" stroke="currentColor" strokeLinecap="round" strokeWidth="16" />
                    <line x1="128" y1="232" x2="128" y2="216" stroke="currentColor" strokeLinecap="round" strokeWidth="16" />
                    <line x1="40" y1="128" x2="24" y2="128" stroke="currentColor" strokeLinecap="round" strokeWidth="16" />
                    <line x1="232" y1="128" x2="216" y2="128" stroke="currentColor" strokeLinecap="round" strokeWidth="16" />
                  </svg>
                </span>
              </a>
            </li>

            {/* Fullscreen */}
            <li className="header-element header-fullscreen">
              <a
                href="#"
                className="header-link"
                onClick={(e) => {
                  e.preventDefault();
                  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                  else document.exitFullscreen();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="header-link-icon full-screen-open" viewBox="0 0 256 256">
                  <rect width="256" height="256" fill="none" />
                  <polyline points="168 48 208 48 208 88" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  <polyline points="88 208 48 208 48 168" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  <polyline points="208 168 208 208 168 208" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  <polyline points="48 88 48 48 88 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" className="header-link-icon full-screen-close" viewBox="0 0 256 256" style={{ display: 'none' }}>
                  <rect width="256" height="256" fill="none" />
                  <polyline points="160 48 208 48 208 96" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  <polyline points="96 208 48 208 48 160" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  <polyline points="208 160 160 208" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  <polyline points="48 96 96 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                </svg>
              </a>
            </li>

            {/* ── Notification bell ──────────────────────────────────────── */}
            <li className="header-element notifications-dropdown dropdown">
              <button
                type="button"
                className="header-link dropdown-toggle"
                data-bs-toggle="dropdown"
                data-bs-auto-close="outside"
                aria-expanded="false"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                {/* Bell icon (Zynix animate-bell pattern) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="header-link-icon animate-bell"
                  viewBox="0 0 256 256"
                >
                  <rect width="256" height="256" fill="none" />
                  <path
                    d="M96,192a32,32,0,0,0,64,0"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                  <path
                    d="M56,104a72,72,0,0,1,144,0c0,35.82,8.3,60.42,14.18,72H41.82C47.7,164.42,56,139.82,56,104Z"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="16"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="header-icon-pulse bg-secondary rounded pulse pulse-secondary" />
                )}
              </button>

              <div className="main-header-dropdown dropdown-menu dropdown-menu-end" style={{ width: 340 }}>
                {/* Header */}
                <div className="p-3 border-bottom">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-2">
                      <p className="mb-0 fs-16 fw-semibold">{t('notifications.title')}</p>
                      <NavLink
                        to="/settings/notifications"
                        className="text-muted"
                        title={t('nav.notification_preferences')}
                        style={{ lineHeight: 1 }}
                      >
                        <i className="ri-settings-3-line fs-15" />
                      </NavLink>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="badge bg-secondary-transparent text-secondary fs-11"
                        style={{ border: 'none', cursor: 'pointer' }}
                        onClick={markAllAsRead}
                        title={t('notifications.mark_all_read')}
                      >
                        {unreadCount} {t('notifications.unread_suffix')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Notification list */}
                {notifications.length > 0 ? (
                  <>
                    <ul
                      className="list-unstyled mb-0"
                      style={{ maxHeight: 320, overflowY: 'auto' }}
                    >
                      {notifications.slice(0, 20).map((n) => {
                        const iconClass =
                          n.type === 'INVITATION_RECEIVED' ? 'ri-user-add-line text-primary' :
                          n.type === 'INVITATION_ACCEPTED' ? 'ri-check-line text-success' :
                          n.type === 'INVITATION_DECLINED' ? 'ri-close-circle-line text-danger' :
                          n.type === 'MENTION'             ? 'ri-at-line text-warning' :
                          n.type === 'TASK_ASSIGNED'       ? 'ri-task-line text-info' :
                          n.type === 'COMMENT_REACTION'    ? 'ri-emotion-line text-warning' :
                          'ri-notification-3-line text-muted';

                        const isInvite = n.type === 'INVITATION_RECEIVED' && n.entityPublicId;
                        const isActioning = inviteActionLoading === n.publicId;
                        const isClickable = (n.type === 'TASK_ASSIGNED' || n.type === 'MENTION' ||
                                             n.type === 'INVITATION_ACCEPTED' || n.type === 'INVITATION_DECLINED' ||
                                             n.type === 'COMMENT_REACTION')
                                           && !!n.projectPublicId;

                        return (
                          <li
                            key={n.publicId}
                            className="dropdown-item"
                            style={{
                              background: n.read ? 'transparent' : '#f8f6ff',
                              cursor: isClickable ? 'pointer' : 'default',
                            }}
                            onClick={isClickable ? () => handleNotifClick(n.publicId, n.type, n.projectPublicId ?? undefined, n.entityPublicId ?? undefined) : undefined}
                          >
                            <div className="d-flex align-items-start">
                              <div className="pe-2 lh-1 pt-1">
                                <span
                                  className="avatar avatar-md avatar-rounded"
                                  style={{
                                    background: notifAvatarColor(n.title),
                                    color: '#fff',
                                    width: 36, height: 36,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    flexShrink: 0,
                                  }}
                                >
                                  <i className={`${iconClass} fs-16`} style={{ color: '#fff' }} />
                                </span>
                              </div>
                              <div className="flex-grow-1">
                                <div className="d-flex align-items-start justify-content-between">
                                  <div style={{ maxWidth: 215 }}>
                                    <p className="mb-0 fw-semibold fs-13">
                                      {n.title}
                                      {isClickable && (
                                        <i className="ri-arrow-right-s-line fs-12 text-muted ms-1" />
                                      )}
                                    </p>
                                    <div
                                      className="fw-normal fs-12 header-notification-text text-muted"
                                      style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: 210,
                                      }}
                                    >
                                      {n.body}
                                    </div>
                                    <span className="text-muted fs-11">{relativeTimeInTimezone(n.createdAt, tz, t as never)}</span>
                                  </div>
                                  {!n.read && (
                                    <button
                                      type="button"
                                      className="min-w-fit-content text-muted dropdown-item-close1 ms-1"
                                      style={{ background: 'none', border: 'none', padding: 0, lineHeight: 1 }}
                                      title={t('notifications.mark_read')}
                                      onClick={(e) => { e.stopPropagation(); markAsRead([n.publicId]); }}
                                    >
                                      <i className="ri-close-line fs-5" />
                                    </button>
                                  )}
                                </div>
                                {/* Accept / Decline buttons for pending invitations */}
                                {isInvite && !n.read && (
                                  <div className="d-flex gap-1 mt-1">
                                    <button
                                      type="button"
                                      className="btn btn-success btn-xs py-0 px-2 fs-12"
                                      disabled={isActioning}
                                      onClick={() => handleInviteAction(n.publicId, n.entityPublicId!, 'accept')}
                                    >
                                      {isActioning ? <i className="ri-loader-4-line" /> : t('actions.accept')}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-xs py-0 px-2 fs-12"
                                      disabled={isActioning}
                                      onClick={() => handleInviteAction(n.publicId, n.entityPublicId!, 'decline')}
                                    >
                                      {isActioning ? <i className="ri-loader-4-line" /> : t('actions.decline')}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="p-3 border-top empty-header-item1">
                      <div className="d-grid">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={markAllAsRead}
                        >
                          {t('notifications.mark_all_read')}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-5 text-center empty-item1">
                    <i className="ri-notification-off-line fs-1 text-muted" />
                    <p className="text-muted mt-2 mb-0 fs-13">{t('notifications.empty')}</p>
                  </div>
                )}
              </div>
            </li>

            {/* Profile dropdown */}
            <li className="header-element dropdown">
              <a
                href="#"
                className="header-link dropdown-toggle"
                id="mainHeaderProfile"
                data-bs-toggle="dropdown"
                data-bs-auto-close="outside"
                aria-expanded="false"
              >
                <div className="d-flex align-items-center">
                  <div className="avatar avatar-sm avatar-rounded bg-primary text-white d-flex align-items-center justify-content-center fw-semibold" style={{ fontSize: '13px' }}>
                    {userInitials}
                  </div>
                  <div className="d-xl-block d-none lh-1 ms-2">
                    <span className="fw-medium lh-1">{user?.name}</span>
                    <span className="d-block fs-11 text-muted mt-1">
                      <i className="ri-shield-star-line me-1 text-primary"></i>
                      {user?.profileLabel ?? 'Admin'}
                    </span>
                  </div>
                </div>
              </a>
              <ul className="main-header-dropdown dropdown-menu pt-0 overflow-hidden header-profile-dropdown dropdown-menu-end">
                <li className="pt-3 pb-2 px-3 border-bottom">
                  <div className="d-flex align-items-center gap-2">
                    <div className="avatar avatar-md avatar-rounded bg-primary text-white d-flex align-items-center justify-content-center fw-bold">
                      {userInitials}
                    </div>
                    <div>
                      <p className="fw-semibold mb-0">{user?.name}</p>
                      <p className="text-muted mb-0 fs-12">{user?.email}</p>
                      <span className="badge bg-primary-transparent text-primary fs-10 mt-1">
                        <i className="ri-shield-star-line me-1"></i>{user?.profileLabel ?? 'Admin'}
                      </span>
                    </div>
                  </div>
                </li>
                <li>
                  <NavLink to="/dashboard" className="dropdown-item d-flex align-items-center gap-2 py-2">
                    <i className="ri-dashboard-line fs-16 text-muted"></i>
                    {t('nav.dashboard')}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/users" className="dropdown-item d-flex align-items-center gap-2 py-2">
                    <i className="ri-group-line fs-16 text-muted"></i>
                    {user?.profileCode === 'BASIC_USER' ? t('nav.people') : t('nav.users')}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/settings/sessions" className="dropdown-item d-flex align-items-center gap-2 py-2">
                    <i className="ri-computer-line fs-16 text-muted"></i>
                    {t('nav.sessions')}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/settings/notifications" className="dropdown-item d-flex align-items-center gap-2 py-2">
                    <i className="ri-notification-3-line fs-16 text-muted"></i>
                    {t('nav.notification_preferences')}
                  </NavLink>
                </li>
                <li className="border-top mt-1">
                  <button
                    className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                    onClick={handleLogout}
                  >
                    <i className="ri-logout-box-r-line fs-16"></i>
                    {t('nav.logout')}
                  </button>
                </li>
              </ul>
            </li>

            {/* Platform config (PLATFORM_ADMIN only) */}
            {isPlatformAdmin && (
              <li className="header-element">
                <a
                  href="#"
                  className="header-link switcher-icon"
                  title={t('platform_config.title')}
                  onClick={(e) => { e.preventDefault(); setConfigOpen(true); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="header-link-icon" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none" />
                    <circle cx="128" cy="128" r="40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <path d="M41.43,178.09A99.14,99.14,0,0,1,31.36,153.8l16.78-21a81.59,81.59,0,0,1,0-9.64l-16.77-21a99.43,99.43,0,0,1,10.05-24.3l26.71-3a81,81,0,0,1,6.81-6.81l3-26.7A99.14,99.14,0,0,1,102.2,31.36l21,16.78a81.59,81.59,0,0,1,9.64,0l21-16.77a99.43,99.43,0,0,1,24.3,10.05l3,26.71a81,81,0,0,1,6.81,6.81l26.7,3a99.14,99.14,0,0,1,10.07,24.29l-16.78,21a81.59,81.59,0,0,1,0,9.64l16.77,21a99.43,99.43,0,0,1-10,24.3l-26.71,3a81,81,0,0,1-6.81,6.81l-3,26.7a99.14,99.14,0,0,1-24.29,10.07l-21-16.78a81.59,81.59,0,0,1-9.64,0l-21,16.77a99.43,99.43,0,0,1-24.3-10l-3-26.71a81,81,0,0,1-6.81-6.81Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  </svg>
                </a>
              </li>
            )}

            {/* Theme switcher trigger */}
            <li className="header-element">
              <a
                href="#"
                className="header-link switcher-icon"
                data-bs-toggle="offcanvas"
                data-bs-target="#switcher-canvas"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="header-link-icon" viewBox="0 0 256 256">
                  <rect width="256" height="256" fill="none" />
                  <path d="M128,80a48,48,0,1,0,48,48A48,48,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z" />
                  <path d="M197.4,80a12,12,0,0,0,2.6-13.3,110.4,110.4,0,0,0-22.8-33.5,12,12,0,0,0-13.5-2.3L151.1,36a88.5,88.5,0,0,0-46.2,0L92.3,30.9A12,12,0,0,0,78.8,33.2,110.4,110.4,0,0,0,56,66.7,12,12,0,0,0,58.6,80l10.7,8.6a88.8,88.8,0,0,0,0,46.8L58.6,144A12,12,0,0,0,56,157.3a110.4,110.4,0,0,0,22.8,33.5,12,12,0,0,0,13.5,2.3l12.6-5.1a88.5,88.5,0,0,0,46.2,0l12.6,5.1a12,12,0,0,0,13.5-2.3,110.4,110.4,0,0,0,22.8-33.5,12,12,0,0,0-2.6-13.3l-10.7-8.6a88.8,88.8,0,0,0,0-46.8Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                </svg>
              </a>
            </li>

          </ul>
        </div>
      </header>
      {/* ── /Header ───────────────────────────────────────────────────── */}

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="app-sidebar sticky" id="sidebar">

        <div className="main-sidebar-header">
          <NavLink to="/dashboard" className="header-logo">
            <img src="/assets/images/brand-logos/desktop-logo.png" alt="logo" className="desktop-logo" />
            <img src="/assets/images/brand-logos/toggle-dark.png" alt="logo" className="toggle-dark" />
            <img src="/assets/images/brand-logos/desktop-dark.png" alt="logo" className="desktop-dark" />
            <img src="/assets/images/brand-logos/toggle-logo.png" alt="logo" className="toggle-logo" />
          </NavLink>
        </div>

        <div className="main-sidebar" id="sidebar-scroll">
          <nav className="main-menu-container nav nav-pills flex-column sub-open">
            <div className="slide-left" id="slide-left">
              <svg xmlns="http://www.w3.org/2000/svg" fill="#7b8191" width="24" height="24" viewBox="0 0 24 24">
                <path d="M13.293 6.293 7.586 12l5.707 5.707 1.414-1.414L10.414 12l4.293-4.293z" />
              </svg>
            </div>

            <ul className="main-menu">

              {/* ─ Main ─ */}
              <li className="slide__category"><span className="category-name">{t('nav.section.main')}</span></li>

              <li className="slide">
                <NavLink to="/dashboard" className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="side-menu__icon" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none" />
                    <rect x="16" y="16" width="88" height="88" rx="8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <rect x="152" y="16" width="88" height="88" rx="8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <rect x="16" y="152" width="88" height="88" rx="8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <rect x="152" y="152" width="88" height="88" rx="8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  </svg>
                  <span className="side-menu__label">{t('nav.dashboard')}</span>
                </NavLink>
              </li>

              {/* ─ Gestão ─ */}
              <li className="slide__category"><span className="category-name">{t('nav.section.management')}</span></li>

              <li className="slide">
                <NavLink to="/users" className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="side-menu__icon" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none" />
                    <circle cx="80" cy="96" r="64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <path d="M17.07,112C7.1,128.82,0,152.43,0,184a8,8,0,0,0,8,8H152a8,8,0,0,0,8-8c0-31.57-7.1-55.18-17.07-72" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <path d="M182,80.11a64,64,0,1,1-4.37,126.43" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <path d="M187.93,112c9.97,16.82,17.07,40.43,17.07,72a8,8,0,0,1-8,8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  </svg>
                  <span className="side-menu__label">
                    {user?.profileCode === 'BASIC_USER' ? t('nav.people') : t('nav.users')}
                  </span>
                </NavLink>
              </li>

              <li className="slide">
                <NavLink to="/teams" className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="side-menu__icon" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none" />
                    <circle cx="80" cy="80" r="48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <circle cx="176" cy="80" r="48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <path d="M8,188a80,80,0,0,1,144,0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <path d="M152,188a80,80,0,0,1,96,0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  </svg>
                  <span className="side-menu__label">{t('nav.teams')}</span>
                </NavLink>
              </li>

              <li className="slide">
                <NavLink to="/projects" className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="side-menu__icon" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none" />
                    <path d="M216,72H131.31L104,44.69A16,16,0,0,0,92.69,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  </svg>
                  <span className="side-menu__label">{t('nav.projects')}</span>
                </NavLink>
              </li>

              <li className="slide">
                <NavLink to="/holidays" className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="side-menu__icon" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none"/>
                    <rect x="40" y="40" width="176" height="176" rx="8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
                    <line x1="176" y1="24" x2="176" y2="56" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
                    <line x1="80" y1="24" x2="80" y2="56" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
                    <line x1="40" y1="96" x2="216" y2="96" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16"/>
                  </svg>
                  <span className="side-menu__label">{t('nav.holidays')}</span>
                </NavLink>
              </li>

              <li className="slide">
                <NavLink to="/timesheets" className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}>
                  <i className="side-menu__icon ri-time-line" />
                  <span className="side-menu__label">{t('nav.timesheets')}</span>
                </NavLink>
              </li>

              <li className="slide">
                <NavLink to="/user-types" className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="side-menu__icon" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none" />
                    <rect x="32" y="48" width="192" height="160" rx="8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <line x1="32" y1="96" x2="224" y2="96" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <line x1="96" y1="48" x2="96" y2="96" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  </svg>
                  <span className="side-menu__label">{t('nav.user_types')}</span>
                </NavLink>
              </li>

              {/* ─ Plataforma (PLATFORM_ADMIN only) ─ */}
              {isPlatformAdmin && (
                <>
                  <li className="slide__category"><span className="category-name">{t('nav.section.platform')}</span></li>
                  <li className="slide">
                    <NavLink to="/plans" className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="side-menu__icon" viewBox="0 0 256 256">
                        <rect width="256" height="256" fill="none" />
                        <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216ZM172,128a44,44,0,1,1-44-44A44.05,44.05,0,0,1,172,128Z" />
                      </svg>
                      <span className="side-menu__label">{t('nav.plans')}</span>
                    </NavLink>
                  </li>
                  <li className="slide">
                    <NavLink to="/translations" className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}>
                      <i className="ti ti-language side-menu__icon" />
                      <span className="side-menu__label">{t('nav.translations')}</span>
                    </NavLink>
                  </li>
                </>
              )}

              {/* ─ Configurações ─ */}
              <li className="slide__category"><span className="category-name">{t('nav.section.settings')}</span></li>
              <li className="slide has-sub">
                <a href="#" onClick={(e) => e.preventDefault()} className="side-menu__item">
                  <svg xmlns="http://www.w3.org/2000/svg" className="side-menu__icon" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none" />
                    <circle cx="128" cy="128" r="40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <path d="M130.05,28h-4.1A102.52,102.52,0,0,0,100,32.27l-2.06,1.19a102.43,102.43,0,0,0-21.26,15.47l-.74.74a102.52,102.52,0,0,0-15.53,21.33L59.23,73A102.52,102.52,0,0,0,55,98.95v4.1A102.52,102.52,0,0,0,59.23,129l1.19,2.06a102.43,102.43,0,0,0,15.47,21.26l.74.74a102.52,102.52,0,0,0,21.33,15.53L100,170a102.52,102.52,0,0,0,25.9,4.23h4.1A102.52,102.52,0,0,0,156,169.73l2.06-1.19a102.43,102.43,0,0,0,21.26-15.47l.74-.74a102.52,102.52,0,0,0,15.53-21.33L196.77,129A102.52,102.52,0,0,0,201,103.05v-4.1A102.52,102.52,0,0,0,196.77,73l-1.19-2.06a102.43,102.43,0,0,0-15.47-21.26l-.74-.74a102.52,102.52,0,0,0-21.33-15.53L156,32.27A102.52,102.52,0,0,0,130.05,28Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  </svg>
                  <span className="side-menu__label">{t('nav.section.settings')}</span>
                  <i className="ri-arrow-right-s-line side-menu__angle"></i>
                </a>
                <ul className="slide-menu child1">
                  <li className="slide side-menu__label1">
                    <a href="#" onClick={(e) => e.preventDefault()}>{t('nav.section.settings')}</a>
                  </li>
                  <li className="slide">
                    <NavLink
                      to="/settings/account"
                      className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}
                    >
                      {t('nav.account')}
                    </NavLink>
                  </li>
                  <li className="slide has-sub">
                    <a href="#" onClick={(e) => e.preventDefault()} className="side-menu__item">
                      {t('nav.section.components')}<i className="ri-arrow-right-s-line side-menu__angle"></i>
                    </a>
                    <ul className="slide-menu child2">
                      <li className="slide">
                        <NavLink
                          to="/settings/gantt"
                          className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}
                        >
                          {t('nav.gantt_settings')}
                        </NavLink>
                      </li>
                      <li className="slide">
                        <NavLink
                          to="/settings/calendar"
                          className={({ isActive }) => `side-menu__item${isActive ? ' active' : ''}`}
                        >
                          {t('nav.calendar_settings')}
                        </NavLink>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>

              {/* ─ Sistema ─ */}
              <li className="slide__category"><span className="category-name">{t('nav.section.system')}</span></li>

              <li className="slide">
                <a
                  href="#"
                  className="side-menu__item"
                  onClick={(e) => { e.preventDefault(); handleLogout(); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="side-menu__icon" viewBox="0 0 256 256">
                    <rect width="256" height="256" fill="none" />
                    <polyline points="112 40 48 40 48 216 112 216" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <polyline points="168 104 224 128 168 152" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                    <line x1="112" y1="128" x2="224" y2="128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="16" />
                  </svg>
                  <span className="side-menu__label">{t('nav.logout')}</span>
                </a>
              </li>

            </ul>

            <div className="slide-right" id="slide-right">
              <svg xmlns="http://www.w3.org/2000/svg" fill="#7b8191" width="24" height="24" viewBox="0 0 24 24">
                <path d="M10.707 17.707 16.414 12l-5.707-5.707-1.414 1.414L13.586 12l-4.293 4.293z" />
              </svg>
            </div>
          </nav>
        </div>
      </aside>
      {/* ── /Sidebar ──────────────────────────────────────────────────── */}

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="main-content app-content">
        <div className="container-fluid">
          <Outlet />
        </div>
      </div>
      {/* ── /Main Content ─────────────────────────────────────────────── */}

      {/* Footer */}
      <footer className="footer mt-auto py-3 bg-white text-center">
        <div className="container">
          <span className="text-muted">
            {t('footer.copyright')}
          </span>
        </div>
      </footer>

      {/* Mobile search modal */}
      <div className="modal fade" id="header-responsive-search" tabIndex={-1} aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-body">
              <div className="input-group">
                <input type="text" className="form-control border-end-0" placeholder={t('search.placeholder')} aria-label={t('search.placeholder')} />
                <button className="btn btn-primary" type="button"><i className="bi bi-search"></i></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Theme switcher offcanvas */}
      <div className="offcanvas offcanvas-end" tabIndex={-1} id="switcher-canvas" aria-labelledby="offcanvasRightLabel">
        <div className="offcanvas-header border-bottom d-block p-0">
          <div className="d-flex align-items-center justify-content-between p-3">
            <h5 className="offcanvas-title text-default" id="offcanvasRightLabel">{t('theme.title')}</h5>
            <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
          </div>
          <nav className="border-top border-block-start-dashed">
            <div className="nav nav-tabs nav-justified" id="switcher-main-tab" role="tablist">
              <button className="nav-link active" data-bs-toggle="tab" data-bs-target="#switcher-home" type="button" role="tab">{t('theme.styles')}</button>
              <button className="nav-link" data-bs-toggle="tab" data-bs-target="#switcher-profile" type="button" role="tab">{t('theme.colors')}</button>
            </div>
          </nav>
        </div>
        <div className="offcanvas-body">
          <div className="tab-content">
            <div className="tab-pane fade show active border-0" id="switcher-home" role="tabpanel">
              <p className="switcher-style-head">{t('theme.color_mode')}</p>
              <div className="row switcher-style gx-0">
                <div className="col-4">
                  <div className="form-check switch-select">
                    <label className="form-check-label" htmlFor="switcher-light-theme">{t('theme.light')}</label>
                    <input className="form-check-input" type="radio" name="theme-style" id="switcher-light-theme" defaultChecked />
                  </div>
                </div>
                <div className="col-4">
                  <div className="form-check switch-select">
                    <label className="form-check-label" htmlFor="switcher-dark-theme">{t('theme.dark')}</label>
                    <input className="form-check-input" type="radio" name="theme-style" id="switcher-dark-theme" />
                  </div>
                </div>
              </div>
            </div>
            <div className="tab-pane fade border-0" id="switcher-profile" role="tabpanel">
              <div className="theme-colors">
                <p className="switcher-style-head">{t('theme.primary_color')}</p>
                <div className="d-flex switcher-style pb-2">
                  <div className="form-check switch-select me-3">
                    <input className="form-check-input color-input color-primary-1" type="radio" name="theme-primary" id="switcher-primary" />
                  </div>
                  <div className="form-check switch-select me-3">
                    <input className="form-check-input color-input color-primary-2" type="radio" name="theme-primary" id="switcher-primary1" />
                  </div>
                  <div className="form-check switch-select me-3">
                    <input className="form-check-input color-input color-primary-3" type="radio" name="theme-primary" id="switcher-primary2" />
                  </div>
                  <div className="form-check switch-select me-3">
                    <input className="form-check-input color-input color-primary-4" type="radio" name="theme-primary" id="switcher-primary3" />
                  </div>
                  <div className="form-check switch-select me-3">
                    <input className="form-check-input color-input color-primary-5" type="radio" name="theme-primary" id="switcher-primary4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="d-block canvas-footer flex-wrap">
            <a href="#" id="reset-all" className="btn btn-danger m-1 w-100">{t('actions.refresh')}</a>
          </div>

          {/* Hidden stub elements required by custom-switcher.min.js to prevent null addEventListener crashes */}
          <div style={{ display: 'none' }} aria-hidden="true">
            <input type="radio" id="resetbtn" />
            <input type="radio" id="switcher-background" name="switcher-background" />
            <input type="radio" id="switcher-background1" name="switcher-background" />
            <input type="radio" id="switcher-background2" name="switcher-background" />
            <input type="radio" id="switcher-background3" name="switcher-background" />
            <input type="radio" id="switcher-background4" name="switcher-background" />
            <input type="radio" id="switcher-bg-img" name="switcher-bg-img" />
            <input type="radio" id="switcher-bg-img1" name="switcher-bg-img" />
            <input type="radio" id="switcher-bg-img2" name="switcher-bg-img" />
            <input type="radio" id="switcher-bg-img3" name="switcher-bg-img" />
            <input type="radio" id="switcher-bg-img4" name="switcher-bg-img" />
            <input type="radio" id="switcher-boxed" name="switcher-width" />
            <input type="radio" id="switcher-classic" name="switcher-nav-style" />
            <input type="radio" id="switcher-closed-menu" name="switcher-menu-type" />
            <input type="radio" id="switcher-default-menu" name="switcher-menu-type" />
            <input type="radio" id="switcher-default-width" name="switcher-width" />
            <input type="radio" id="switcher-detached" name="switcher-nav-style" />
            <input type="radio" id="switcher-double-menu" name="switcher-menu-type" />
            <input type="radio" id="switcher-full-width" name="switcher-width" />
            <input type="radio" id="switcher-header-dark" name="switcher-header" />
            <input type="radio" id="switcher-header-fixed" name="switcher-header-pos" />
            <input type="radio" id="switcher-header-gradient" name="switcher-header" />
            <input type="radio" id="switcher-header-light" name="switcher-header" />
            <input type="radio" id="switcher-header-primary" name="switcher-header" />
            <input type="radio" id="switcher-header-scroll" name="switcher-header-pos" />
            <input type="radio" id="switcher-header-transparent" name="switcher-header" />
            <input type="radio" id="switcher-horizontal" name="switcher-layout" />
            <input type="radio" id="switcher-icon-click" name="switcher-menu-click" />
            <input type="radio" id="switcher-icon-hover" name="switcher-menu-click" />
            <input type="radio" id="switcher-icon-overlay" name="switcher-menu-click" />
            <input type="radio" id="switcher-icontext-menu" name="switcher-menu-type" />
            <input type="radio" id="switcher-loader-disable" name="switcher-loader" />
            <input type="radio" id="switcher-loader-enable" name="switcher-loader" />
            <input type="radio" id="switcher-ltr" name="switcher-dir" />
            <input type="radio" id="switcher-menu-click" name="switcher-menu-trigger" />
            <input type="radio" id="switcher-menu-dark" name="switcher-menu" />
            <input type="radio" id="switcher-menu-fixed" name="switcher-menu-pos" />
            <input type="radio" id="switcher-menu-gradient" name="switcher-menu" />
            <input type="radio" id="switcher-menu-hover" name="switcher-menu-trigger" />
            <input type="radio" id="switcher-menu-light" name="switcher-menu" />
            <input type="radio" id="switcher-menu-primary" name="switcher-menu" />
            <input type="radio" id="switcher-menu-scroll" name="switcher-menu-pos" />
            <input type="radio" id="switcher-menu-transparent" name="switcher-menu" />
            <input type="radio" id="switcher-modern" name="switcher-nav-style" />
            <input type="radio" id="switcher-regular" name="switcher-nav-style" />
            <input type="radio" id="switcher-rtl" name="switcher-dir" />
            <input type="radio" id="switcher-vertical" name="switcher-layout" />
          </div>
        </div>
      </div>

      {/* Scroll to top */}
      <div className="scrollToTop">
        <span className="arrow lh-1"><i className="ti ti-arrow-big-up fs-16"></i></span>
      </div>

      <div id="responsive-overlay"></div>

      {/* Platform configuration panel — PLATFORM_ADMIN only */}
      {isPlatformAdmin && (
        <PlatformConfigPanel open={configOpen} onClose={() => setConfigOpen(false)} />
      )}
    </div>
  );
}

/**
 * Wrapper raiz — envolve a árvore com TimezoneProvider (cross-project, baseado
 * em user.timezone) e dispara a detecção do browser na primeira sessão se o
 * user ainda não tem timezone definida. Ver docs/claude/timezone.md.
 */
export default function AppLayout() {
  const { user, refreshUser } = useAuth();
  const detectAttempted = useRef(false);

  useEffect(() => {
    if (!user || user.timezone || detectAttempted.current) return;
    detectAttempted.current = true;
    let detected: string;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      return;
    }
    if (!detected) return;
    apiFetch(`${getApiBase()}/users/me/timezone`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timezone: detected }),
    })
      .then((r) => { if (r.ok) refreshUser().catch(() => {}); })
      .catch(() => {});
  }, [user, refreshUser]);

  return (
    <TimezoneProvider userTimezone={user?.timezone ?? null}>
      <AppLayoutInner />
    </TimezoneProvider>
  );
}
