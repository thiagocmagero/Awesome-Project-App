// Hook: gestão do estado de dados do projecto + loadAll
import { useState, useEffect, type MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiBase, apiFetch } from '../../lib/api';
import type {
  ProjectDetail, GanttTask, GanttLink, ExternalResource,
  ResourceNode, UserTypeLookup,
} from './types';

export interface UsePlanningDataProps {
  projectId: string | undefined;
  token: string | null;
  nonWorkingDaysRef: MutableRefObject<string[]>;
  isFirstLoad: MutableRefObject<boolean>;
}

export interface UsePlanningDataReturn {
  project: ProjectDetail | null;
  tasks: GanttTask[];
  links: GanttLink[];
  externalResources: ExternalResource[];
  resourceNodes: ResourceNode[];
  userTypes: UserTypeLookup[];
  memberHours: Record<string, number>;
  nonWorkingDays: string[];
  loading: boolean;
  pageError: string;
  loadAll: () => Promise<void>;
  setTasks: React.Dispatch<React.SetStateAction<GanttTask[]>>;
  setLinks: React.Dispatch<React.SetStateAction<GanttLink[]>>;
  setMemberHours: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export function usePlanningData({
  projectId, token, nonWorkingDaysRef, isFirstLoad,
}: UsePlanningDataProps): UsePlanningDataReturn {
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const api = getApiBase();

  const [project, setProject]                   = useState<ProjectDetail | null>(null);
  const [tasks, setTasks]                       = useState<GanttTask[]>([]);
  const [links, setLinks]                       = useState<GanttLink[]>([]);
  const [externalResources, setExternalResources] = useState<ExternalResource[]>([]);
  const [resourceNodes, setResourceNodes]       = useState<ResourceNode[]>([]);
  const [userTypes, setUserTypes]               = useState<UserTypeLookup[]>([]);
  const [memberHours, setMemberHours]           = useState<Record<string, number>>({});
  const [nonWorkingDays, setNonWorkingDays]     = useState<string[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [pageError, setPageError]               = useState('');

  function h() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  async function loadAll() {
    setLoading(true);
    setPageError('');
    try {
      const [projRes, ganttRes, hoursRes, resourcesRes, userTypesRes] = await Promise.all([
        apiFetch(`${api}/projects/${projectId}`, { headers: h() }),
        apiFetch(`${api}/projects/${projectId}/planning`, { headers: h() }),
        apiFetch(`${api}/projects/${projectId}/planning/member-hours`, { headers: h() }),
        apiFetch(`${api}/projects/${projectId}/planning/resources`, { headers: h() }),
        apiFetch(`${api}/user-types`, { headers: h() }),
      ]);
      if (!projRes.ok) throw new Error(t('page.error_project'));
      if (!ganttRes.ok) throw new Error(t('page.error_load'));

      const proj = await projRes.json();
      const ganttData = await ganttRes.json();
      const hours: Array<{ userPublicId: string; hoursPerDay: number }> = hoursRes.ok ? await hoursRes.json() : [];
      const rawResources: Array<{
        id: number; publicId: string; text: string;
        hoursPerDay: number; userId?: number;
        userType?: { publicId: string; code: string; label: string };
      }> = resourcesRes.ok ? await resourcesRes.json() : [];
      const rawUserTypes: UserTypeLookup[] = userTypesRes.ok ? await userTypesRes.json() : [];

      setProject(proj);
      // Deep-clone defensivo: o widget DHTMLX por vezes muta in-place os
      // objects que recebe via parse (especialmente `task.duration` quando
      // recompute baseado em start/end + duration_unit global). Sem isto,
      // o React state `tasks` pode ficar com valores recomputados pelo
      // widget, e o TaskModal carrega valor errado → save grava errado.
      // Reproduzido com tasks HOUR vistas em modo DAY view (4h → 16h → 64h).
      setTasks(JSON.parse(JSON.stringify(ganttData.data ?? [])));
      setLinks(JSON.parse(JSON.stringify(ganttData.links ?? [])));
      setResourceNodes(ganttData.resources ?? []);
      const nwd: string[] = ganttData.nonWorkingDays ?? [];
      setNonWorkingDays(nwd);
      nonWorkingDaysRef.current = nwd;
      setMemberHours(Object.fromEntries(hours.map((h) => [h.userPublicId, h.hoursPerDay])));
      setUserTypes(rawUserTypes.filter((ut) => ut));
      setExternalResources(
        rawResources
          .filter((r) => (r.userId === undefined || r.userId === null) && r.userType)
          .map((r) => ({
            id: r.id,
            publicId: r.publicId,
            text: r.text,
            hoursPerDay: r.hoursPerDay,
            userType: r.userType!,
          })),
      );
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setLoading(false);
      isFirstLoad.current = false; // subsequent loadAll() calls won't trigger full-page spinner
    }
  }

  useEffect(() => { loadAll(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    project, tasks, links, externalResources, resourceNodes, userTypes,
    memberHours, nonWorkingDays, loading, pageError,
    loadAll, setTasks, setLinks, setMemberHours,
  };
}
