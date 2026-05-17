import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Sidebar, type SidebarProps } from './Sidebar';
import { NotificationPanel } from './NotificationPanel';
import { UserMenu } from './UserMenu';
import { CreateMenu } from './CreateMenu';
import { LanguageMenu } from './LanguageMenu';
import { NewWorkspaceModal } from './NewWorkspaceModal';
import { InvitePersonModal } from './InvitePersonModal';
import { useCollapsedSidebar } from './useCollapsedSidebar';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { WorkspacesProvider, useWorkspaces } from '../contexts/WorkspacesContext';
import { ProjectsProvider } from '../contexts/ProjectsContext';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

function derivePage(pathname: string): SidebarProps['page'] {
  // O segmento `:locale` é stripado pelo `LocaleGuard` antes do React Router
  // resolver os filhos, pelo que o pathname aqui já não inclui o locale.
  if (pathname === '/' || pathname === '/home') return 'home';
  if (pathname === '/account') return 'account';
  // Workspace-scoped: primeiro segmento é o publicId (sem prefixo `/w/`),
  // segundo segmento é a secção. Alinhado com `frontend/src/App.tsx`.
  const m = pathname.match(/^\/[^/]+(?:\/([^/]+))?/);
  if (!m) return 'other';
  const seg = m[1];
  if (!seg) return 'workspace';
  if (seg === 'dashboard') return 'workspace';
  if (seg === 'users') return 'people';
  if (seg === 'user-types') return 'tipos';
  if (seg === 'holidays') return 'holidays';
  if (seg === 'projects') return 'project';
  return 'other';
}

export function AppShell() {
  return (
    <WorkspacesProvider>
      <ProjectsProvider>
        <AppShellInner />
      </ProjectsProvider>
    </WorkspacesProvider>
  );
}

/** Top-level layout — TopBar + collapsible Sidebar + routed content.
 *  Replaces the `page`-state-based router of NewTemplate/app-dark.jsx
 *  with react-router; keeps the same TopBar/Sidebar/Popover composition. */
function AppShellInner() {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { workspaceId: paramWsId, projectId: paramProjId } = useParams();

  const { theme, chrome, setChrome, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { locale: currentLang, activeLocales, setLocale } = useLocale();
  const { activeWorkspace, create: createWorkspace } = useWorkspaces();
  const { collapsed, toggle: toggleSidebar, closeIfNarrow, setCollapsed } = useCollapsedSidebar();

  // Active context — paramWsId vence; depois fallback para activeWorkspace
  // do contexto (que resolve por URL → user.workspacePublicId → primeiro da lista).
  const activeProject = paramProjId ?? null;
  const wsIdForUrls = paramWsId ?? activeWorkspace?.publicId ?? '';
  const page = derivePage(location.pathname);

  // Topbar popover state.
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const userBtnRef = useRef<HTMLDivElement>(null);
  const createBtnRef = useRef<HTMLButtonElement>(null);
  const langBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onFs() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  // Navigation handlers — wire the Sidebar callbacks to router pushes.
  // URLs alinhadas com `frontend/src/App.tsx` (memória `feedback_url_paths_match_legacy`).
  const go = (path: string) => { navigate(path); closeIfNarrow(); };
  const onGoHome           = () => go('/home');
  const onOpenWorkspace    = (id: string) => go(`/${id}/dashboard`);
  const onOpenProject      = (id: string) => go(`/${wsIdForUrls}/projects/${id}/planning`);
  const onOpenPeople       = (id: string) => go(`/${id}/users`);
  const onOpenTipos        = (id: string) => go(`/${id}/user-types`);
  const onOpenHolidays     = (id: string) => go(`/${id}/holidays`);
  const onOpenAccount      = (_tab: string) => go('/account');

  // Placeholder global modal triggers (real modals land in later phases).
  const onOpenInvite       = () => setInviteOpen(true);
  const onOpenTaskCreate   = () => { /* TODO Fase 2.8.1 — TaskModal */ };
  const onOpenProjectCreate = () => { /* TODO Fase 2.7 — NewProjectModal */ };

  async function handleCreateWorkspace(name: string): Promise<void> {
    const ws = await createWorkspace(name);
    setNewWorkspaceOpen(false);
    navigate(`/w/${ws.publicId}`);
  }

  return (
    <div className="app">
      <TopBar
        onToggleSidebar={toggleSidebar}
        notifOpen={notifOpen}
        onToggleNotif={() => setNotifOpen((o) => !o)}
        notifBtnRef={notifBtnRef}
        onToggleCreate={() => setCreateOpen((o) => !o)}
        createBtnRef={createBtnRef}
        onToggleLang={() => setLangOpen((o) => !o)}
        langBtnRef={langBtnRef}
        currentLang={currentLang}
        locales={activeLocales}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className={'body' + (collapsed ? ' collapsed' : '')}>
        <Sidebar
          page={page}
          activeProject={activeProject}
          onGoHome={onGoHome}
          onOpenWorkspace={onOpenWorkspace}
          onOpenProject={onOpenProject}
          onOpenPeople={onOpenPeople}
          onOpenTipos={onOpenTipos}
          onOpenHolidays={onOpenHolidays}
          onOpenInvite={onOpenInvite}
          userMenuOpen={userMenuOpen}
          onToggleUserMenu={() => setUserMenuOpen((o) => !o)}
          userBtnRef={userBtnRef}
          user={user}
        />
        {!collapsed && <div className="sidebar-backdrop" onClick={() => setCollapsed(true)} />}
        <div className="main">
          <Outlet context={{ openInviteModal: () => setInviteOpen(true) }} />
        </div>
      </div>

      {notifOpen && <NotificationPanel anchorRef={notifBtnRef} onClose={() => setNotifOpen(false)} />}
      {userMenuOpen && (
        <UserMenu
          anchorRef={userBtnRef}
          onClose={() => setUserMenuOpen(false)}
          theme={theme}
          onToggleTheme={toggleTheme}
          chrome={chrome}
          setChrome={setChrome}
          onOpenAccount={(tab) => { setUserMenuOpen(false); onOpenAccount(tab); }}
          onOpenNewWorkspace={() => { setUserMenuOpen(false); setNewWorkspaceOpen(true); }}
          onSwitchWorkspace={(id) => { setUserMenuOpen(false); onOpenWorkspace(id); }}
          onLogout={async () => { await logout(); navigate('/login', { replace: true }); }}
          user={user}
        />
      )}
      {createOpen && (
        <CreateMenu
          anchorRef={createBtnRef}
          onClose={() => setCreateOpen(false)}
          onOpenTask={onOpenTaskCreate}
          onOpenProject={onOpenProjectCreate}
          onOpenWorkspace={() => setNewWorkspaceOpen(true)}
          onOpenInvite={onOpenInvite}
        />
      )}
      {langOpen && (
        <LanguageMenu
          anchorRef={langBtnRef}
          onClose={() => setLangOpen(false)}
          currentLang={currentLang}
          locales={activeLocales}
          onPick={setLocale}
        />
      )}
      {newWorkspaceOpen && (
        <NewWorkspaceModal
          onClose={() => setNewWorkspaceOpen(false)}
          onCreate={handleCreateWorkspace}
        />
      )}
      {inviteOpen && (
        <InvitePersonModal onClose={() => setInviteOpen(false)} />
      )}
    </div>
  );
}
