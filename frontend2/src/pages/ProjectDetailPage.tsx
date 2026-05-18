// Orquestrador da rota `/:locale/:workspaceId/projects/:projectId/planning`.
// Compõe 5 hooks em paralelo (project, planning bundle, permissions, members,
// states). Gere activeTab state aqui — passa <TabsNav> como children do
// <ProjectHeader> (estrutura canónica: tabs DENTRO de .proj-header). O
// conteúdo de cada tab vive abaixo, em `.proj-tab-content` separado.

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { ProjectHeader } from '../features/planning/components/ProjectHeader';
import { TabsNav, type ProjectTabKey } from '../features/planning/components/ProjectTabs';
import { ProjectListView } from '../features/planning/components/ProjectListView';
import { ComingSoonTab } from '../features/planning/components/tabs/ComingSoonTab';

import { useProject } from '../features/planning/useProject';
import { useProjectMembers } from '../features/planning/useProjectMembers';
import { usePlanningBundle } from '../features/planning/usePlanningBundle';
import { usePlanningStates } from '../features/planning/usePlanningStates';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import type { IProjectDetail, IProjectMember, IResourceNode } from '../features/planning/types';

import '../styles/project-list.css';

/** Converte owner/manager (shape do Project) em IProjectMember para o header. */
function personToMember(
  p: NonNullable<IProjectDetail['owner']>,
  role: IProjectMember['role'] = 'OWNER',
): IProjectMember {
  return {
    publicId: p.publicId,
    name: p.name,
    email: p.email,
    avatarUrl: p.avatarUrl ?? null,
    avatarUpdatedAt: p.avatarUpdatedAt ?? null,
    role,
    userType: null,
  };
}

/** Converte um `IResourceNode` externo (sem userPublicId) em pseudo-member
 *  para aparecer no stack de avatares do header. Recursos com `userPublicId`
 *  ficam fora (são users → já vêm via `useProjectMembers` ou owner/manager). */
function externalResourceToMember(r: IResourceNode): IProjectMember {
  return {
    publicId: r.id, // TaskResourceNode.publicId (UUID distinto de User.publicId)
    name: r.text,
    email: '',
    avatarUrl: r.avatarUrl, // null por design (externos não têm foto)
    avatarUpdatedAt: null,
    role: 'CONTRIBUTOR',
    userType: null,
  };
}

/** Dedup por `member.publicId` (= user.publicId após normalize). */
function dedupMembers(list: IProjectMember[]): IProjectMember[] {
  const seen = new Set<string>();
  const out: IProjectMember[] = [];
  for (const m of list) {
    if (m.publicId && !seen.has(m.publicId)) {
      seen.add(m.publicId);
      out.push(m);
    }
  }
  return out;
}

export default function ProjectDetailPage() {
  const { t } = useTranslation('planning');
  const { projectId } = useParams<{ projectId: string }>();

  const { project, loading: projectLoading, error: projectError } = useProject(projectId);
  const { members } = useProjectMembers(projectId);
  const { tasks, links, resources, loading: planningLoading, refresh } = usePlanningBundle(projectId);
  const {
    states, loading: statesLoading,
    createState, updateState, deleteState, reorderStates,
  } = usePlanningStates(projectId);
  const { can, loading: permsLoading } = useProjectPermissions(projectId);

  // State da tab activa — externalizado aqui (ProjectHeader é wrapper visual).
  const [activeTab, setActiveTab] = useState<ProjectTabKey>('list');

  // IMPORTANTE: todos os hooks (incl. useMemo) devem ser chamados ANTES de
  // qualquer early return (Rules of Hooks).

  /** Stack de avatares do header — combina:
   *   1. Owner + manager (do project)
   *   2. Project members aceites
   *   3. Recursos externos (TaskResource sem userPublicId — contractors)
   *  Dedup por publicId; externals têm publicId distinto (TaskResourceNode)
   *  pelo que nunca colidem com members (User.publicId). */
  const allMembers = useMemo<IProjectMember[]>(() => {
    if (!project) return [];
    const list: IProjectMember[] = [];
    if (project.owner) list.push(personToMember(project.owner, 'OWNER'));
    if (project.manager) list.push(personToMember(project.manager, 'OWNER'));
    list.push(...members);
    const externals = resources.filter((r) => !r.isGroup && !r.userPublicId);
    list.push(...externals.map(externalResourceToMember));
    return dedupMembers(list);
  }, [project, members, resources]);

  /** Map indexado por `TaskResourceNode.publicId` para resolver `task.owner_id[]`.
   *  Combina nós-folha de `resources`. Quando o node está ligado a um user
   *  (`userPublicId !== null`), prefere `avatarUrl + avatarUpdatedAt` do
   *  member correspondente (member tem `avatarUpdatedAt` para cache busting;
   *  ResourceNode não). */
  const assigneesByPublicId = useMemo<Map<string, IProjectMember>>(() => {
    const m = new Map<string, IProjectMember>();
    const memberByUserPid = new Map(members.map((mem) => [mem.publicId, mem]));
    for (const r of resources) {
      if (r.isGroup) continue;
      if (r.userPublicId) {
        const mem = memberByUserPid.get(r.userPublicId);
        m.set(r.id, mem
          ? { ...mem, publicId: r.id /* indexed por node.publicId */ }
          : externalResourceToMember(r));
      } else {
        m.set(r.id, externalResourceToMember(r));
      }
    }
    return m;
  }, [members, resources]);

  if (projectLoading || permsLoading) {
    return (
      <div className="proj-shell">
        <div className="proj-state">
          <div className="msg">…</div>
        </div>
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="proj-shell">
        <div className="proj-state">
          <div className="msg">
            <h3>{t('task.error_load', { defaultValue: 'Não foi possível carregar o projeto.' })}</h3>
            <p>{projectError ?? ''}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="proj-shell">
      <ProjectHeader project={project} members={allMembers}>
        <TabsNav activeTab={activeTab} onChange={setActiveTab} />
      </ProjectHeader>

      <div className="proj-tab-content">
        {activeTab === 'list' ? (
          <ProjectListView
            tasks={tasks}
            links={links}
            resources={resources}
            members={members}
            refresh={refresh}
            states={states}
            membersByPublicId={assigneesByPublicId}
            dateFormat={project.dateFormat}
            loading={planningLoading || statesLoading}
            can={can}
            projectPublicId={project.publicId}
            states_create={createState}
            states_update={updateState}
            states_delete={deleteState}
            states_reorder={reorderStates}
          />
        ) : (
          <ComingSoonTab tabKey={activeTab} />
        )}
      </div>
    </div>
  );
}
