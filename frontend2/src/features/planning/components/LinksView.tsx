// Sub-view "Links" da Lista — toolbar + tabela de dependências.
// Markup canónico `NewTemplate/app-dark.jsx:1690-1732`. Desvios sobre o
// canónico (DIFF):
//   - ConfirmDialog antes de delete (canónico filtrava mock array sem prompt).
//   - Source/Target resolvidos para `task.text` via lookup table; canónico
//     mostrava o id raw quando o mock não tinha lookup.
//   - Lag renderiza `{n} d` ou `—` (canónico só mostrava `—` placeholder).
//   - Permissões reactivas via `can()`.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ConfirmDialog } from '../../../shell/ConfirmDialog';
import { useToast } from '../../../contexts/ToastContext';
import { ProjectAction as PA } from '../../../hooks/useProjectPermissions';
import { useTableSort, type SortableColumn } from '../../../lib/useTableSort';
import { SortableTh } from '../../../components/SortableTh';
import type { ITask, ITaskLink } from '../types';
import { usePlanningLinks, type CreateLinkDto, type UpdateLinkDto } from '../usePlanningLinks';
import { LinkModal } from './LinkModal';

interface EditLinkTarget {
  publicId: string;
  source: number;
  target: number;
  type: string;
  lag: number;
}

interface Props {
  links: ITaskLink[];
  tasks: ITask[];
  projectPublicId: string;
  refresh: () => Promise<void>;
  can: (action: PA) => boolean;
}

/** Wire DHTMLX → label curto. */
const TYPE_LABEL: Record<string, string> = {
  '0': 'FS',
  '1': 'SS',
  '2': 'FF',
  '3': 'SF',
};

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

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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

export function LinksView({ links, tasks, projectPublicId, refresh, can }: Props) {
  const { t } = useTranslation('planning');
  const { showToast } = useToast();

  const { createLink, updateLink, removeLink } = usePlanningLinks(projectPublicId, refresh);

  const [createOpen, setCreateOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<EditLinkTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ publicId: string; source: string; target: string } | null>(null);

  // Map<int, ITask> por task.id (numeric interno) — usado para resolver
  // link.source/target (que são ints) para `text`.
  const taskById = useMemo(() => {
    const m = new Map<number, ITask>();
    for (const tk of tasks) m.set(tk.id, tk);
    return m;
  }, [tasks]);

  const canManage = can(PA.LINK_MANAGE);
  const enoughTasks = tasks.length >= 2;

  // ── Sort: 4 colunas (source/target resolvidas via taskById; type alfabético
  //         pelo label curto FS/SS/FF/SF; lag numérico). ────────────────────
  type LnkCol = 'source' | 'target' | 'type' | 'lag';
  const lnkColumns = useMemo<SortableColumn<ITaskLink, LnkCol>[]>(() => [
    { key: 'source', getValue: (l) => taskById.get(l.source)?.text?.toLowerCase() ?? null },
    { key: 'target', getValue: (l) => taskById.get(l.target)?.text?.toLowerCase() ?? null },
    { key: 'type',   getValue: (l) => (TYPE_LABEL[String(l.type)] ?? String(l.type)).toLowerCase() },
    { key: 'lag',    getValue: (l) => l.lag ?? 0 },
  ], [taskById]);
  const lnkSort = useTableSort(links, lnkColumns);

  async function handleCreate(dto: CreateLinkDto) {
    await createLink(dto);
    showToast('success', t('dependencies.success.created'));
  }

  async function handleUpdate(publicId: string, dto: UpdateLinkDto) {
    await updateLink(publicId, dto);
    showToast('success', t('dependencies.success.updated'));
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    try {
      await removeLink(deleteTarget.publicId);
      showToast('success', t('dependencies.success.removed'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('danger', msg);
    } finally {
      setDeleteTarget(null);
    }
  }

  function resolveTaskText(numericId: number): string {
    return taskById.get(numericId)?.text ?? `#${numericId}`;
  }

  function renderLag(lag: number) {
    if (!lag || lag === 0) return <span style={{ color: 'var(--dim)' }}>—</span>;
    const key = Math.abs(lag) === 1 ? 'links.lag_days_one' : 'links.lag_days_other';
    return <>{t(key, { count: lag })}</>;
  }

  return (
    <div className="lnk-wrap">
      {canManage && (
        <div className="lnk-toolbar">
          <button
            type="button"
            className="lnk-create-btn"
            onClick={() => setCreateOpen(true)}
            disabled={!enoughTasks}
            title={!enoughTasks ? t('dependencies.create_need_tasks') : undefined}
          >
            {t('dependencies.btn.create')}
          </button>
        </div>
      )}

      {links.length === 0 ? (
        <div className="rv-empty" style={{ padding: 24 }}>
          <IconInfo />
          {t('dependencies.empty')}
        </div>
      ) : (
        /* Wrapper `.rv-table-scroll` permite navegação horizontal em mobile
           — partilha CSS com a vista Resources (mesma classe). */
        <div className="rv-table-scroll">
        <table className="lnk-table">
          <thead>
            <tr>
              <SortableTh colKey="source" label={t('dependencies.col.source')} sortBy={lnkSort.sortBy} onToggle={lnkSort.toggleSort} />
              <SortableTh colKey="target" label={t('dependencies.col.target')} sortBy={lnkSort.sortBy} onToggle={lnkSort.toggleSort} />
              <SortableTh colKey="type"   label={t('dependencies.col.type')}   sortBy={lnkSort.sortBy} onToggle={lnkSort.toggleSort} />
              <SortableTh colKey="lag"    label={t('dependencies.col.lag')}    sortBy={lnkSort.sortBy} onToggle={lnkSort.toggleSort} />
              {canManage && <th style={{ width: 90 }}>{t('dependencies.col.actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {lnkSort.sorted.map((l) => {
              const srcText = resolveTaskText(l.source);
              const tgtText = resolveTaskText(l.target);
              const typeKey = String(l.type);
              const typeLbl = TYPE_LABEL[typeKey] ?? typeKey;
              return (
                <tr key={l.publicId}>
                  <td className="lnk-source">{srcText}</td>
                  <td className="lnk-target">{tgtText}</td>
                  <td>
                    <span className={'lnk-type ' + typeLbl.toLowerCase()}>{typeLbl}</span>
                  </td>
                  <td>{renderLag(l.lag)}</td>
                  {canManage && (
                    <td>
                      <span className="rv-row-actions">
                        <button
                          type="button"
                          className="rv-row-action"
                          onClick={() => setEditTarget({
                            publicId: l.publicId,
                            source: l.source,
                            target: l.target,
                            type: String(l.type),
                            lag: l.lag,
                          })}
                          aria-label={t('dependencies.modal.edit.title')}
                        >
                          <IconEdit />
                        </button>
                        <button
                          type="button"
                          className="lnk-del-btn"
                          onClick={() => setDeleteTarget({ publicId: l.publicId, source: srcText, target: tgtText })}
                          aria-label={t('dependencies.confirm.delete.title')}
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

      {createOpen && (
        <LinkModal
          tasks={tasks}
          onClose={() => setCreateOpen(false)}
          onCreate={handleCreate}
        />
      )}
      {editTarget && (
        <LinkModal
          tasks={tasks}
          initialValue={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdate={handleUpdate}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          title={t('dependencies.confirm.delete.title')}
          message={t('dependencies.confirm.delete.message', {
            source: deleteTarget.source,
            target: deleteTarget.target,
          })}
          danger
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}
