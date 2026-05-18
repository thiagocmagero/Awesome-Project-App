// Mutações para External Resources e Member Hours dum projecto.
// Endpoints:
//   GET     /projects/:id/planning/resources           (PROJECT_VIEW)   ← lista TaskResource[]
//   POST    /projects/:id/planning/resources           (RESOURCE_MANAGE)
//   PUT     /projects/:id/planning/resources/:resId    (RESOURCE_MANAGE)
//   DELETE  /projects/:id/planning/resources/:resId    (RESOURCE_MANAGE)
//   PUT     /projects/:id/planning/member-hours/:uid   (MEMBER_HOURS_MANAGE)
//
// IMPORTANTE: o `publicId` dos `TaskResource` (necessário para
// update/delete) NÃO coincide com o `IResourceNode.id` exposto em
// `GET /planning` (esse é `TaskResourceNode.publicId`, derivado). Por
// isso o hook expõe `externals` separadamente — lista de `TaskResource`
// crua, carregada via `GET /resources` e refrescada após cada mutação.

import { useCallback, useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../../lib/api';

export interface CreateExternalResourceDto {
  text: string;
  userTypeId: string;
  hoursPerDay?: number;
}

export interface UpdateExternalResourceDto {
  text?: string;
  userTypeId?: string;
  hoursPerDay?: number;
}

/** Shape devolvido por `GET/POST/PUT /planning/resources`. */
export interface ApiTaskResource {
  id: number;
  publicId: string;
  text: string;
  parent: number;
  /** `User.id` interno quando o resource representa um member; ausente para externals. */
  userId?: number;
  hoursPerDay: number;
  userType?: { publicId: string; code: string; label: string };
}

export function usePlanningResources(
  projectPublicId: string,
  onMutated: () => Promise<void>,
) {
  const [externals, setExternals] = useState<ApiTaskResource[]>([]);
  const [externalsLoading, setExternalsLoading] = useState(true);

  const refreshExternals = useCallback(async () => {
    try {
      const all = await apiGet<ApiTaskResource[]>(
        `/projects/${projectPublicId}/planning/resources`,
      );
      // External resource = `TaskResource` sem `userId` (contractor).
      setExternals(all.filter((r) => r.userId === undefined || r.userId === null));
    } finally {
      setExternalsLoading(false);
    }
  }, [projectPublicId]);

  useEffect(() => {
    void refreshExternals();
  }, [refreshExternals]);

  /** Refresca lista local de externals + bundle do projecto em paralelo. */
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshExternals(), onMutated()]);
  }, [refreshExternals, onMutated]);

  const createExternal = useCallback(
    async (dto: CreateExternalResourceDto): Promise<ApiTaskResource> => {
      const created = await apiPost<ApiTaskResource>(
        `/projects/${projectPublicId}/planning/resources`,
        dto,
      );
      await refreshAll();
      return created;
    },
    [projectPublicId, refreshAll],
  );

  const updateExternal = useCallback(
    async (resPublicId: string, dto: UpdateExternalResourceDto): Promise<ApiTaskResource> => {
      const updated = await apiPut<ApiTaskResource>(
        `/projects/${projectPublicId}/planning/resources/${resPublicId}`,
        dto,
      );
      await refreshAll();
      return updated;
    },
    [projectPublicId, refreshAll],
  );

  const removeExternal = useCallback(
    async (resPublicId: string): Promise<void> => {
      await apiDelete(`/projects/${projectPublicId}/planning/resources/${resPublicId}`);
      await refreshAll();
    },
    [projectPublicId, refreshAll],
  );

  const updateMemberHours = useCallback(
    async (userPublicId: string, hoursPerDay: number): Promise<void> => {
      await apiPut(
        `/projects/${projectPublicId}/planning/member-hours/${userPublicId}`,
        { hoursPerDay },
      );
      await onMutated();
    },
    [projectPublicId, onMutated],
  );

  return {
    externals,
    externalsLoading,
    createExternal,
    updateExternal,
    removeExternal,
    updateMemberHours,
  };
}
