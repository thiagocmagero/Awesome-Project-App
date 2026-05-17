import { useEffect, useMemo, useState, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DashIcon, FolderIcon, HomeIcon, InviteIcon, TaskIcon, TypeIcon,
  PeopleSubIcon, CalIcon,
} from './icons';
import type { AuthUser } from '../contexts/AuthContext';
import { avatarColorFor, avatarUrlOf, initialsOf } from '../lib/avatars';
import { useWorkspaces, useWorkspaceRoleLabel } from '../contexts/WorkspacesContext';
import { useWorkspaceProjects } from '../contexts/ProjectsContext';

// ============================================================
// Nested menu (port 1:1 de NewTemplate/app-dark.jsx:1063-1184)
// ============================================================

type MenuNodeKind = 'item' | 'group' | 'section' | 'divider';

export interface MenuNodeData {
  kind: MenuNodeKind;
  key: string;
  label?: string;
  icon?: ReactNode;
  dot?: string;
  count?: string | number;
  href?: string;
  active?: boolean;
  disabled?: boolean;
  addable?: boolean;
  onAdd?: () => void;
  onClick?: () => void;
  children?: MenuNodeData[];
  hasActiveChild?: boolean;
}

function annotateMenuActive(nodes: MenuNodeData[]): boolean {
  let containsActive = false;
  for (const node of nodes) {
    if (node.kind === 'group') {
      const inside = annotateMenuActive(node.children || []);
      node.hasActiveChild = inside;
      if (inside) containsActive = true;
    } else if (node.kind === 'item' && node.active) {
      containsActive = true;
    }
  }
  return containsActive;
}

function collectActiveAncestorKeys(nodes: MenuNodeData[], into: Set<string>) {
  for (const node of nodes) {
    if (node.kind === 'group') {
      const childKeys = new Set<string>();
      collectActiveAncestorKeys(node.children || [], childKeys);
      if (node.hasActiveChild) into.add(node.key);
      for (const k of childKeys) into.add(k);
    }
  }
}

function MenuNode({ node, openKeys, onToggle, depth }: {
  node: MenuNodeData; openKeys: Set<string>; onToggle: (key: string) => void; depth: number;
}) {
  if (node.kind === 'divider') return <li className="menu-divider" role="separator" />;
  if (node.kind === 'section') {
    return (
      <li className="menu-section">
        <span>{node.label}</span>
        {node.addable && <span className="add" onClick={node.onAdd}>+</span>}
      </li>
    );
  }
  if (node.kind === 'group') {
    const open = openKeys.has(node.key);
    const subId = 'submenu-' + node.key;
    return (
      <li className={'menu-item has-sub' + (open ? ' open' : '') + (node.hasActiveChild ? ' has-active-child' : '')}>
        <a
          className="menu-link"
          href="#"
          role="button"
          aria-expanded={open ? 'true' : 'false'}
          aria-controls={subId}
          onClick={(e) => { e.preventDefault(); onToggle(node.key); }}
        >
          {node.icon && <span className="menu-icon">{node.icon}</span>}
          {node.dot && <span className="menu-dot" style={{ background: node.dot }} />}
          <span className="menu-label">{node.label}</span>
          {node.count != null && <span className="menu-count">{node.count}</span>}
          <span className="menu-chevron">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </a>
        <div className="submenu-wrap">
          <ul id={subId} className="submenu">
            {(node.children || []).map((c) => (
              <MenuNode key={c.key} node={c} openKeys={openKeys} onToggle={onToggle} depth={depth + 1} />
            ))}
          </ul>
        </div>
      </li>
    );
  }
  // item
  return (
    <li className="menu-item">
      <a
        className={'menu-link' + (node.active ? ' active' : '') + (node.disabled ? ' disabled' : '')}
        href={node.href || '#'}
        aria-current={node.active ? 'page' : undefined}
        aria-disabled={node.disabled ? 'true' : undefined}
        onClick={(e) => {
          if (node.disabled) { e.preventDefault(); return; }
          if (!node.href) e.preventDefault();
          if (node.onClick) node.onClick();
        }}
      >
        {node.icon && <span className="menu-icon">{node.icon}</span>}
        {node.dot && <span className="menu-dot" style={{ background: node.dot }} />}
        <span className="menu-label">{node.label}</span>
        {node.count != null && <span className="menu-count">{node.count}</span>}
      </a>
    </li>
  );
}

function MenuTree({ nodes }: { nodes: MenuNodeData[] }) {
  useMemo(() => { annotateMenuActive(nodes); }, [nodes]);

  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const s = new Set<string>();
    collectActiveAncestorKeys(nodes, s);
    return s;
  });

  useEffect(() => {
    const needed = new Set<string>();
    collectActiveAncestorKeys(nodes, needed);
    setOpenKeys((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const k of needed) if (!next.has(k)) { next.add(k); changed = true; }
      return changed ? next : prev;
    });
  }, [nodes]);

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <ul className="menu-root">
      {nodes.map((n) => <MenuNode key={n.key} node={n} openKeys={openKeys} onToggle={toggle} depth={0} />)}
    </ul>
  );
}

// ============================================================
// Sidebar (port 1:1 de NewTemplate/app-dark.jsx:1186-1283)
// ============================================================

export interface SidebarProps {
  /** Current page key derived from the URL by AppShell. */
  page: 'home' | 'workspace' | 'project' | 'people' | 'tipos' | 'holidays' | 'account' | 'other';
  activeProject: string | null;
  onGoHome: () => void;
  onOpenWorkspace: (id: string) => void;
  onOpenProject: (id: string) => void;
  onOpenPeople: (id: string) => void;
  onOpenTipos: (id: string) => void;
  onOpenHolidays: (id: string) => void;
  onOpenInvite: () => void;
  userMenuOpen: boolean;
  onToggleUserMenu: () => void;
  userBtnRef: RefObject<HTMLDivElement | null>;
  user: AuthUser | null;
}

export function Sidebar({
  page, activeProject,
  onGoHome, onOpenWorkspace, onOpenProject, onOpenPeople, onOpenTipos, onOpenHolidays,
  onOpenInvite,
  userMenuOpen, onToggleUserMenu, userBtnRef,
  user,
}: SidebarProps) {
  const { t: tc } = useTranslation('common');
  const { activeWorkspace } = useWorkspaces();
  const roleLabelOf = useWorkspaceRoleLabel();
  // Projectos reais filtrados pelo workspace activo (V2 multi-workspace).
  // O `workspace.publicId` é incluído em cada projecto pelo backend
  // (`PROJECT_INCLUDE.workspace` em `backend/src/projects/projects.service.ts`).
  const wsProjects = useWorkspaceProjects(activeWorkspace?.publicId ?? null);
  const [demoOpen, setDemoOpen] = useState(false);

  // Workspace activo pode ainda não ter carregado (boot). Mostrar dados neutros.
  const wsName = activeWorkspace?.name ?? '—';
  const wsGlyph = activeWorkspace ? initialsOf(activeWorkspace.name) : '·';
  const wsColor = activeWorkspace ? avatarColorFor(activeWorkspace.publicId) : 'var(--mute)';
  const wsRoleLabel = activeWorkspace ? roleLabelOf(activeWorkspace.role) : '';
  const wsId = activeWorkspace?.publicId ?? '';

  const menuNodes: MenuNodeData[] = [
    { kind: 'item', key: 'home',  icon: <HomeIcon />, label: tc('nav.home'),       active: page === 'home', onClick: onGoHome },
    { kind: 'item', key: 'tasks', icon: <TaskIcon />, label: tc('nav.my_tasks'),   count: '12' },

    { kind: 'section', key: 's-ws', label: wsName },
    { kind: 'item', key: 'ws-ov',   icon: <DashIcon />,      label: tc('nav.overview'),     active: page === 'workspace', onClick: () => wsId && onOpenWorkspace(wsId) },
    { kind: 'item', key: 'ws-ppl',  icon: <PeopleSubIcon />, label: tc('nav.people'),       active: page === 'people',    onClick: () => wsId && onOpenPeople(wsId) },
    { kind: 'item', key: 'ws-tipo', icon: <TypeIcon />,      label: tc('nav.member_types'), active: page === 'tipos',     onClick: () => wsId && onOpenTipos(wsId) },
    { kind: 'item', key: 'ws-cal',  icon: <CalIcon />,       label: tc('nav.calendars'),    active: page === 'holidays',  onClick: () => wsId && onOpenHolidays(wsId) },

    { kind: 'section', key: 's-proj', label: tc('nav.projects'), addable: true },
    ...wsProjects.map<MenuNodeData>((p) => ({
      kind: 'item', key: 'proj-' + p.publicId,
      dot: p.color ?? avatarColorFor(p.publicId),
      label: p.name,
      active: page === 'project' && p.publicId === activeProject,
      onClick: () => onOpenProject(p.publicId),
    })),
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-inner">
        <div className="sidebar-ws-card" onClick={() => wsId && onOpenWorkspace(wsId)}>
          <div className="glyph" style={{ background: wsColor }}>{wsGlyph}</div>
          <div className="meta">
            <span className="name">{wsName}</span>
            <span className="role">{wsRoleLabel}</span>
          </div>
        </div>

        <div style={{ height: 4 }} />

        <MenuTree nodes={menuNodes} />

        {/* Demo: expandable item with subitems */}
        <ul className="menu-root" style={{ marginTop: 2 }}>
          <li className={'menu-item has-sub' + (demoOpen ? ' open' : '')}>
            <a
              className="menu-link"
              href="#"
              role="button"
              aria-expanded={demoOpen ? 'true' : 'false'}
              aria-controls="submenu-recursos"
              onClick={(e) => { e.preventDefault(); setDemoOpen((o) => !o); }}
            >
              <span className="menu-icon"><FolderIcon /></span>
              {/* Excepção autorizada: o item "Recursos" e os seus sub-itens
                  ("Modelos" / "Arquivo") ficam hardcoded por enquanto. */}
              <span className="menu-label">Recursos</span>
              <span className="menu-chevron">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </span>
            </a>
            <div className="submenu-wrap">
              <ul id="submenu-recursos" className="submenu">
                <li className="menu-item">
                  <a className="menu-link" href="#" onClick={(e) => e.preventDefault()}>
                    <span className="menu-icon"><TypeIcon /></span>
                    <span className="menu-label">Modelos</span>
                  </a>
                </li>
                <li className="menu-item">
                  <a className="menu-link" href="#" onClick={(e) => e.preventDefault()}>
                    <span className="menu-icon"><FolderIcon /></span>
                    <span className="menu-label">Arquivo</span>
                  </a>
                </li>
              </ul>
            </div>
          </li>
        </ul>

        <div style={{ height: 10 }} />
        <div className="side-item invite" onClick={onOpenInvite} style={{ cursor: 'pointer' }}>
          <span className="ico"><InviteIcon /></span>
          <span className="label">{tc('nav.invite_person')}</span>
        </div>
      </div>

      <div className="side-bottom">
        <div
          ref={userBtnRef}
          className={'user-card' + (userMenuOpen ? ' open' : '')}
          onClick={onToggleUserMenu}
        >
          {user && avatarUrlOf(user) ? (
            <img
              className="avatar lg"
              src={avatarUrlOf(user)!}
              alt={user.name}
              title={user.name}
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
          <div className="meta">
            <span className="name">{user?.name ?? '—'}</span>
            <span className="plan">{user?.planName ?? user?.planCode ?? 'Free'}</span>
          </div>
          <span className="kebab">⋯</span>
        </div>
      </div>
    </aside>
  );
}
