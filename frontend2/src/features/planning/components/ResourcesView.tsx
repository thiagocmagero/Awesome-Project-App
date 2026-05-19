// Sub-view "Resources" da Lista — 2 cards (`Team Members` + `External Resources`).
// Markup canónico `NewTemplate/app-dark.jsx:1608-1683`. Desvios sobre o
// canónico (listados no DIFF):
//   - Coluna "Acções" na tabela External Resources (canónico não tinha).
//   - Edit modal (canónico só tinha Create).
//   - ConfirmDialog antes de delete.
//   - Permissões reactivas via `can()`.
//   - Team Members usa membros reais do projecto (+ resolução de hoursPerDay
//     a partir de `IResourceNode.hoursPerDay` quando `userPublicId` match).

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '../../../shell/ConfirmDialog';
import { useToast } from '../../../contexts/ToastContext';
import { ProjectAction as PA } from '../../../hooks/useProjectPermissions';
import { useTableSort, type SortableColumn } from '../../../lib/useTableSort';
import { SortableTh } from '../../../components/SortableTh';
import type { IProjectMember, IResourceNode } from '../types';
import { usePlanningResources, type ApiTaskResource } from '../usePlanningResources';
import { ExternalResourceModal } from './ExternalResourceModal';
import { MemberHoursCell } from './MemberHoursCell';

interface EditTarget {
  publicId: string;
  name: string;
  userTypePublicId: string | null;
  hoursPerDay: number;
}

interface Props {
  members: IProjectMember[];
  resources: IResourceNode[];
  projectPublicId: string;
  refresh: () => Promise<void>;
  can: (action: PA) => boolean;
}

// ── SVG icons (port literal canónico) ───────────────────────────────────────

function IconTeam() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconUserPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ── View ────────────────────────────────────────────────────────────────────

export function ResourcesView({ members, resources, projectPublicId, refresh, can }: Props) {
  const { t } = useTranslation('planning');
  const { showToast } = useToast();

  const {
    externals,
    createExternal, updateExternal, removeExternal, updateMemberHours,
  } = usePlanningResources(projectPublicId, refresh);

  // Modal state.
  const [createOpen, setCreateOpen]     = useState(false);
  const [editingExt, setEditingExt]     = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ publicId: string; name: string } | null>(null);

  // Map publicId → hoursPerDay (de resources do bundle com userPublicId).
  const hoursByUserPublicId = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of resources) if (!r.isGroup && r.userPublicId) m.set(r.userPublicId, r.hoursPerDay);
    return m;
  }, [resources]);

  const canManage = can(PA.RESOURCE_MANAGE);
  const canEditHours = can(PA.MEMBER_HOURS_MANAGE);

  // ── Sort: Team Members (5 colunas) ──────────────────────────────────────
  type TeamCol = 'name' | 'email' | 'team' | 'status' | 'hours';
  const teamColumns = useMemo<SortableColumn<IProjectMember, TeamCol>[]>(() => [
    { key: 'name',   getValue: (m) => m.name?.toLowerCase() ?? null },
    { key: 'email',  getValue: (m) => m.email?.toLowerCase() ?? null },
    { key: 'team',   getValue: (m) => m.userType?.label?.toLowerCase() ?? null },
    { key: 'status', getValue: () => 0 /* todos ACTIVE — placeholder estável */ },
    { key: 'hours',  getValue: (m) => hoursByUserPublicId.get(m.publicId) ?? null },
  ], [hoursByUserPublicId]);
  const teamSort = useTableSort(members, teamColumns);

  // ── Sort: External Resources (3 colunas; Actions não-sortable) ──────────
  type ExtCol = 'name' | 'type' | 'hours';
  const extColumns = useMemo<SortableColumn<ApiTaskResource, ExtCol>[]>(() => [
    { key: 'name',  getValue: (r) => r.text?.toLowerCase() ?? null },
    { key: 'type',  getValue: (r) => r.userType?.label?.toLowerCase() ?? null },
    { key: 'hours', getValue: (r) => r.hoursPerDay },
  ], []);
  const extSort = useTableSort(externals, extColumns);

  async function handleCreate(dto: { text: string; userTypeId: string; hoursPerDay?: number }) {
    await createExternal(dto);
    showToast('success', t('resources.success.created'));
  }

  async function handleUpdate(publicId: string, dto: { text?: string; userTypeId?: string; hoursPerDay?: number }) {
    await updateExternal(publicId, dto);
    showToast('success', t('resources.success.updated'));
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await removeExternal(deleteTarget.publicId);
      showToast('success', t('resources.success.removed'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('danger', msg);
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="rv-wrap">
      {/* ── Team Members ─────────────────────────────────────────────── */}
      <div className="rv-section">
        <div className="rv-sec-head">
          <IconTeam />
          {t('resources.section.team_members')}
          <span className={'rv-badge' + (members.length === 0 ? ' zero' : '')}>{members.length}</span>
        </div>

        {members.length === 0 ? (
          <div className="rv-empty">
            <IconInfo />
            {t('resources.team.empty')}
          </div>
        ) : (
          /* Wrapper `.rv-table-scroll` activa scroll horizontal quando a
             tabela excede a largura visível (mobile). `.rv-section` mantém
             `overflow: hidden` (preserva border-radius dos cantos) e o
             header da section fica fixo enquanto a tabela scrolla. */
          <div className="rv-table-scroll">
            <table className="rv-table">
              <thead>
                <tr>
                  <SortableTh colKey="name"   label={t('resources.col.name')}          sortBy={teamSort.sortBy} onToggle={teamSort.toggleSort} />
                  <SortableTh colKey="email"  label={t('resources.col.email')}         sortBy={teamSort.sortBy} onToggle={teamSort.toggleSort} />
                  <SortableTh colKey="team"   label={t('resources.col.team')}          sortBy={teamSort.sortBy} onToggle={teamSort.toggleSort} />
                  <SortableTh colKey="status" label={t('resources.col.status')}        sortBy={teamSort.sortBy} onToggle={teamSort.toggleSort} sortable={false} />
                  <SortableTh colKey="hours"  label={t('resources.col.hours_per_day')} sortBy={teamSort.sortBy} onToggle={teamSort.toggleSort} />
                </tr>
              </thead>
              <tbody>
                {teamSort.sorted.map((m) => {
                  const hpd = hoursByUserPublicId.get(m.publicId) ?? 8;
                  return (
                    <tr key={m.publicId}>
                      <td>{m.name}</td>
                      <td className="muted">{m.email || '—'}</td>
                      <td>{m.userType?.label ?? '—'}</td>
                      <td>
                        <span className="rv-status-pill">{t('resources.status.active')}</span>
                      </td>
                      <td>
                        <MemberHoursCell
                          userPublicId={m.publicId}
                          initial={hpd}
                          canEdit={canEditHours}
                          onSave={updateMemberHours}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── External Resources ──────────────────────────────────────── */}
      <div className="rv-section">
        <div className="rv-sec-head">
          <IconUserPlus />
          {t('resources.section.external')}
          <span className={'rv-badge' + (externals.length === 0 ? ' zero' : '')}>{externals.length}</span>
          {canManage && (
            <button type="button" className="rv-add-btn" onClick={() => setCreateOpen(true)}>
              {t('resources.btn.add_external')}
            </button>
          )}
        </div>

        {externals.length === 0 ? (
          <div className="rv-empty">
            <IconInfo />
            {t('resources.external.empty')}
          </div>
        ) : (
          <div className="rv-table-scroll">
            <table className="rv-table">
              <thead>
                <tr>
                  <SortableTh colKey="name"  label={t('resources.col.name')}          sortBy={extSort.sortBy} onToggle={extSort.toggleSort} />
                  <SortableTh colKey="type"  label={t('resources.col.type')}          sortBy={extSort.sortBy} onToggle={extSort.toggleSort} />
                  <SortableTh colKey="hours" label={t('resources.col.hours_per_day')} sortBy={extSort.sortBy} onToggle={extSort.toggleSort} />
                  {canManage && <th style={{ width: 90 }}>{t('resources.col.actions')}</th>}
                </tr>
              </thead>
              <tbody>
                {extSort.sorted.map((r) => {
                  const typeLabel = r.userType?.label ?? '—';
                  return (
                    <tr key={r.publicId}>
                      <td>{r.text}</td>
                      <td>{typeLabel}</td>
                      <td>{r.hoursPerDay} h</td>
                      {canManage && (
                        <td>
                          <span className="rv-row-actions">
                            <button
                              type="button"
                              className="rv-row-action"
                              onClick={() => setEditingExt({
                                publicId: r.publicId,
                                name: r.text,
                                userTypePublicId: r.userType?.publicId ?? null,
                                hoursPerDay: r.hoursPerDay,
                              })}
                              aria-label={t('resources.modal.edit.title')}
                            >
                              <IconEdit />
                            </button>
                            <button
                              type="button"
                              className="rv-row-action danger"
                              onClick={() => setDeleteTarget({ publicId: r.publicId, name: r.text })}
                              aria-label={t('resources.confirm.delete.title')}
                            >
                              <IconTrash />
                            </button>
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      {createOpen && (
        <ExternalResourceModal
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
      )}
      {editingExt && (
        <ExternalResourceModal
          initialValue={editingExt}
          onClose={() => setEditingExt(null)}
          onUpdate={handleUpdate}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title={t('resources.confirm.delete.title')}
          message={t('resources.confirm.delete.message', { name: deleteTarget.name })}
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
