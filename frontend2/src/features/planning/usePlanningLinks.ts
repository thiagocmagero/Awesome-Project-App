// Mutações para TaskLinks (dependências entre tarefas) dum projecto.
// Endpoints:
//   POST    /projects/:id/planning/links              (LINK_MANAGE)
//   DELETE  /projects/:id/planning/links/:linkId      (LINK_MANAGE)
//
// `source` e `target` são `Task.id` numérico interno (não publicId) — o
// canónico DHTMLX assume ints. Caller resolve publicId → id via lookup
// table sobre `tasks` do bundle.
//
// `type` segue wire DHTMLX: "0"=FS, "1"=SS, "2"=FF, "3"=SF.

import { useCallback } from 'react';
import { apiDelete, apiPost, apiPut } from '../../lib/api';
import type { ITaskLink } from './types';

export interface CreateLinkDto {
  source: number;
  target: number;
  type: '0' | '1' | '2' | '3';
  lag?: number;
}

export interface UpdateLinkDto {
  type?: '0' | '1' | '2' | '3';
  lag?: number;
}

export function usePlanningLinks(
  projectPublicId: string,
  onMutated: () => Promise<void>,
) {
  const createLink = useCallback(
    async (dto: CreateLinkDto): Promise<ITaskLink> => {
      const created = await apiPost<ITaskLink>(
        `/projects/${projectPublicId}/planning/links`,
        dto,
      );
      await onMutated();
      return created;
    },
    [projectPublicId, onMutated],
  );

  const updateLink = useCallback(
    async (linkPublicId: string, dto: UpdateLinkDto): Promise<ITaskLink> => {
      const updated = await apiPut<ITaskLink>(
        `/projects/${projectPublicId}/planning/links/${linkPublicId}`,
        dto,
      );
      await onMutated();
      return updated;
    },
    [projectPublicId, onMutated],
  );

  const removeLink = useCallback(
    async (linkPublicId: string): Promise<void> => {
      await apiDelete(`/projects/${projectPublicId}/planning/links/${linkPublicId}`);
      await onMutated();
    },
    [projectPublicId, onMutated],
  );

  return { createLink, updateLink, removeLink };
}
