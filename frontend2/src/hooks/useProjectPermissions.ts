// Port adaptado de `frontend/src/hooks/useProjectPermissions.ts` para
// frontend2. Diferenças: usa `apiGet` do frontend2 (cookies HttpOnly, sem
// `Authorization: Bearer`); usa `useAuth` apenas para sinalizar boot completo.

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiGet } from '../lib/api';

/** Mirrors backend `ProjectAction` enum — keep in sync. */
export enum ProjectAction {
  PROJECT_VIEW            = 'PROJECT_VIEW',
  PROJECT_UPDATE          = 'PROJECT_UPDATE',
  PROJECT_DELETE          = 'PROJECT_DELETE',
  MEMBER_INVITE           = 'MEMBER_INVITE',
  MEMBER_REMOVE           = 'MEMBER_REMOVE',
  MEMBER_CHANGE_ROLE      = 'MEMBER_CHANGE_ROLE',
  MEMBER_MANAGE_TEAMS     = 'MEMBER_MANAGE_TEAMS',
  PERMISSIONS_MANAGE      = 'PERMISSIONS_MANAGE',
  TASK_CREATE             = 'TASK_CREATE',
  TASK_EDIT               = 'TASK_EDIT',
  TASK_DELETE             = 'TASK_DELETE',
  LINK_MANAGE             = 'LINK_MANAGE',
  TASK_COMMENT            = 'TASK_COMMENT',
  RESOURCE_MANAGE         = 'RESOURCE_MANAGE',
  MEMBER_HOURS_MANAGE     = 'MEMBER_HOURS_MANAGE',
  HOLIDAY_MANAGE          = 'HOLIDAY_MANAGE',
  GANTT_CONFIG            = 'GANTT_CONFIG',
  DATA_EXPORT             = 'DATA_EXPORT',
  STATE_MANAGE            = 'STATE_MANAGE',
  BOARD_VIEW              = 'BOARD_VIEW',
  BOARD_CARD_MOVE         = 'BOARD_CARD_MOVE',
  BOARD_CARD_ASSIGN       = 'BOARD_CARD_ASSIGN',
  BOARD_CONFIG            = 'BOARD_CONFIG',
  CALENDAR_VIEW              = 'CALENDAR_VIEW',
  CALENDAR_EVENT_CREATE      = 'CALENDAR_EVENT_CREATE',
  CALENDAR_EVENT_EDIT        = 'CALENDAR_EVENT_EDIT',
  CALENDAR_EVENT_DELETE      = 'CALENDAR_EVENT_DELETE',
  CALENDAR_EVENT_TYPE_MANAGE = 'CALENDAR_EVENT_TYPE_MANAGE',
  CALENDAR_CONFIG            = 'CALENDAR_CONFIG',
  TIMESHEET_LOG     = 'TIMESHEET_LOG',
  TIMESHEET_APPROVE = 'TIMESHEET_APPROVE',
  FILE_VIEW         = 'FILE_VIEW',
  FILE_UPLOAD       = 'FILE_UPLOAD',
  FILE_RENAME       = 'FILE_RENAME',
  FILE_DELETE       = 'FILE_DELETE',
}

interface PermissionsData {
  role: string;
  permissions: Set<string>;
}

interface PermissionsResponse {
  role: string;
  permissions: string[];
}

const cache: Record<string, PermissionsData> = {};

export function useProjectPermissions(projectPublicId: string | undefined) {
  const { user } = useAuth();
  const [data, setData] = useState<PermissionsData | null>(
    projectPublicId && cache[projectPublicId] ? cache[projectPublicId] : null,
  );
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (!user || !projectPublicId) {
      setLoading(false);
      return;
    }
    if (cache[projectPublicId]) {
      setData(cache[projectPublicId]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    apiGet<PermissionsResponse>(`/projects/${projectPublicId}/my-permissions`)
      .then((result) => {
        if (cancelled || !result) return;
        const d: PermissionsData = {
          role: result.role,
          permissions: new Set(result.permissions),
        };
        cache[projectPublicId] = d;
        setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user, projectPublicId]);

  const can = useCallback(
    (action: ProjectAction) => data?.permissions.has(action) ?? false,
    [data],
  );

  const invalidate = useCallback(() => {
    if (projectPublicId && cache[projectPublicId]) {
      delete cache[projectPublicId];
    }
  }, [projectPublicId]);

  return {
    can,
    role: data?.role ?? null,
    isOwner: data?.role === 'OWNER' || data?.role === 'PLATFORM_ADMIN',
    loading,
    invalidate,
  };
}
