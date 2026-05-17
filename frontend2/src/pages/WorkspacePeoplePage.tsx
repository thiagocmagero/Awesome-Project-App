import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWorkspaceMembers, type WorkspaceMember } from '../hooks/useWorkspaceMembers';
import { useWorkspaces } from '../contexts/WorkspacesContext';
import { useWorkspaceProjects } from '../contexts/ProjectsContext';
import { avatarColorFor, initialsOf } from '../lib/avatars';
import { formatDate } from '../lib/dateFormatting';
import { ManagePersonPanel } from '../shell/ManagePersonPanel';
import '../styles/people.css';

interface AppShellOutletContext {
  openInviteModal: () => void;
}

type TabKey = 'all' | 'licensed' | 'basic' | 'pending';

/**
 * Port literal de `NewTemplate/views-people.jsx` (`PeopleView`).
 * Mantém classes `pp-*` para preservar layout idêntico ao mockup.
 * Dados reais vêm de `useWorkspaceMembers` (backend `/workspace-members`).
 */
export function WorkspacePeoplePage() {
  const { t: tw } = useTranslation('workspace_members');
  const { activeWorkspace } = useWorkspaces();
  const projects = useWorkspaceProjects(activeWorkspace?.publicId ?? null);
  const { members, seats, loading, updateMember, removeMember, refresh } = useWorkspaceMembers();
  const { openInviteModal } = useOutletContext<AppShellOutletContext>();

  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const counts = useMemo(() => ({
    all: members.length,
    licensed: members.filter((m) => m.memberType === 'LICENSED').length,
    basic: members.filter((m) => m.memberType === 'BASIC').length,
    pending: members.filter((m) => m.status === 'INVITED').length,
  }), [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (tab === 'licensed' && m.memberType !== 'LICENSED') return false;
      if (tab === 'basic' && m.memberType !== 'BASIC') return false;
      if (tab === 'pending' && m.status !== 'INVITED') return false;
      if (q) {
        const name = (m.user?.name ?? m.name ?? '').toLowerCase();
        const email = m.email.toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [members, tab, query]);

  const activeMember = useMemo(
    () => members.find((m) => m.publicId === activeId) ?? null,
    [members, activeId],
  );

  const seatsUsed = seats?.used ?? 0;
  const seatsTotal = seats?.total ?? 0;
  const seatsUnlimited = seatsTotal < 0;
  const seatsPct = seatsUnlimited || seatsTotal === 0 ? 0 : Math.min(100, (seatsUsed / seatsTotal) * 100);

  return (
    <div className="pp-page">
      {/* Header */}
      <div className="pp-head">
        <div>
          <div className="title">{tw('page.title')}</div>
          <div className="sub">{tw('page.subtitle')}</div>
        </div>
        <div className="right">
          <div className="pp-seats" title={tw('seats.title')}>
            <div className="lab">{tw('seats.title')}</div>
            <div className="val">
              {seatsUsed}
              <small>
                {' / '}{seatsUnlimited ? '∞' : seatsTotal}
                {seats?.plan && ` · ${seats.plan.name}`}
              </small>
            </div>
            <div className="meter">
              <div className="fill" style={{ width: `${seatsPct}%` }} />
            </div>
          </div>
          <button type="button" className="pp-btn-primary" onClick={openInviteModal}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            {tw('btn.add_user')}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="pp-toolbar">
        <div className="pp-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <line x1="20" y1="20" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder={tw('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="pp-tabs">
          {(['all', 'licensed', 'basic', 'pending'] as TabKey[]).map((k) => (
            <button
              key={k}
              type="button"
              className={'pp-tab' + (tab === k ? ' active' : '')}
              onClick={() => setTab(k)}
            >
              <span>{tw(`tabs.${k}`)}</span>
              <span className="ct">{counts[k]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="pp-list-wrap">
        <div className="pp-table">
          <div className="pp-row pp-head-row">
            <span>{tw('table.person')}</span>
            <span>{tw('table.access_level')}</span>
            <span>{tw('table.status')}</span>
            <span className="pp-cell-type">{tw('table.type')}</span>
            <span className="pp-cell-projects">{tw('table.projects')}</span>
            <span>{tw('table.joined_at')}</span>
            <span />
          </div>

          {loading && members.length === 0 ? (
            <div className="pp-empty">
              <div className="ic">⋯</div>
              <div className="sd">{tw('manage.section_title')}…</div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="pp-empty">
              <div className="ic">○</div>
              <div className="tt">{tw('empty')}</div>
              <div className="sd">{tw('search.placeholder')}</div>
            </div>
          ) : (
            filtered.map((m) => (
              <MemberRow
                key={m.publicId}
                m={m}
                projectColors={Object.fromEntries(projects.map((p) => [p.publicId, p.color ?? avatarColorFor(p.publicId)]))}
                onOpen={() => setActiveId(m.publicId)}
                tw={tw}
              />
            ))
          )}
        </div>
      </div>

      {/* Drawer */}
      {activeMember && (
        <ManagePersonPanel
          member={activeMember}
          onClose={() => setActiveId(null)}
          onUpdate={updateMember}
          onRemove={async (id) => { await removeMember(id); setActiveId(null); }}
          onAfterProjectsSave={refresh}
        />
      )}
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function MemberRow({ m, projectColors, onOpen, tw }: {
  m: WorkspaceMember;
  projectColors: Record<string, string>;
  onOpen: () => void;
  tw: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const displayName = m.user?.name ?? m.name ?? m.email;
  const color = avatarColorFor(m.user?.publicId ?? m.publicId);
  const isPending = m.status === 'INVITED';
  const levelKey = m.memberType === 'LICENSED' ? 'lvl-licenciado' : 'lvl-basico';
  const statusKey = isPending ? 'st-pending' : 'st-active';
  const count = m.projectCount ?? 0;

  return (
    <div className="pp-row pp-body-row" onClick={onOpen} role="button" tabIndex={0}
         onKeyDown={(e) => { if (e.key === 'Enter') onOpen(); }}>
      <div className="pp-cell-user pp-user">
        <div className="avatar" style={{ width: 34, height: 34, background: color, fontSize: 12.5 }}>
          {initialsOf(displayName)}
        </div>
        <div className="meta">
          <div className="nm">{displayName}</div>
          <div className="em">{m.email}</div>
        </div>
      </div>
      <div className="pp-cell-level">
        <span className={`pp-pill ${levelKey}`}>{tw(`access.${m.memberType.toLowerCase()}`)}</span>
      </div>
      <div className="pp-cell-status">
        <span className={`pp-pill ${statusKey}`}>
          <span className="dot" />
          {tw(`status.${m.status.toLowerCase()}`)}
        </span>
      </div>
      <div className="pp-cell-type">
        {m.userType ? (
          <span className="pp-type-chip" title={m.userType.label}>
            <span className="pp-type-dot" style={{ background: avatarColorFor(m.userType.code) }} />
            <span className="pp-type-code">{m.userType.code}</span>
          </span>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--mute)' }}>—</span>
        )}
      </div>
      <div className="pp-cell-projects">
        {count === 0 ? (
          <span className="pp-projects-cell" style={{ color: 'var(--mute)' }}>—</span>
        ) : (
          <span className="pp-projects-cell">
            <span className="swatches">
              {Object.values(projectColors).slice(0, Math.min(4, count)).map((c, i) => (
                <span key={i} className="sw" style={{ background: c }} />
              ))}
            </span>
            <span>
              {count === 1
                ? tw('stats.projects_count_one', { count })
                : tw('stats.projects_count_other', { count })}
            </span>
          </span>
        )}
      </div>
      <div className="pp-cell-joined pp-joined">{formatDate(m.createdAt)}</div>
      <div className="pp-cell-more">
        <button type="button" className="pp-more-btn" onClick={(e) => { e.stopPropagation(); onOpen(); }} aria-label={tw('btn.manage')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
