import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiBase, apiFetch } from '../lib/api';

/** Mirrors backend ProjectAction enum — keep in sync */
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
  // Estados / Board (Quadro Kanban)
  STATE_MANAGE            = 'STATE_MANAGE',
  BOARD_VIEW              = 'BOARD_VIEW',
  BOARD_CARD_MOVE         = 'BOARD_CARD_MOVE',
  BOARD_CARD_ASSIGN       = 'BOARD_CARD_ASSIGN',
  BOARD_CONFIG            = 'BOARD_CONFIG',
  // Calendário
  CALENDAR_VIEW              = 'CALENDAR_VIEW',
  CALENDAR_EVENT_CREATE      = 'CALENDAR_EVENT_CREATE',
  CALENDAR_EVENT_EDIT        = 'CALENDAR_EVENT_EDIT',
  CALENDAR_EVENT_DELETE      = 'CALENDAR_EVENT_DELETE',
  CALENDAR_EVENT_TYPE_MANAGE = 'CALENDAR_EVENT_TYPE_MANAGE',
  CALENDAR_CONFIG            = 'CALENDAR_CONFIG',
  // Timesheet
  TIMESHEET_LOG     = 'TIMESHEET_LOG',
  TIMESHEET_APPROVE = 'TIMESHEET_APPROVE',
  // Files
  FILE_VIEW         = 'FILE_VIEW',
  FILE_UPLOAD       = 'FILE_UPLOAD',
  FILE_RENAME       = 'FILE_RENAME',
  FILE_DELETE       = 'FILE_DELETE',
}

interface PermissionsData {
  role: string;
  permissions: Set<string>;
}

const cache: Record<string, PermissionsData> = {};

export function useProjectPermissions(projectId: string | undefined) {
  const { token } = useAuth();
  const [data, setData] = useState<PermissionsData | null>(
    projectId && cache[projectId] ? cache[projectId] : null,
  );
  const [loading, setLoading] = useState(!data);

  useEffect(() => {
    if (!token || !projectId) return;
    if (cache[projectId]) {
      setData(cache[projectId]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const api = getApiBase();
    apiFetch(`${api}/projects/${projectId}/my-permissions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (result) {
          const d: PermissionsData = {
            role: result.role,
            permissions: new Set(result.permissions),
          };
          cache[projectId] = d;
          setData(d);
        }
      })
      .finally(() => setLoading(false));
  }, [token, projectId]);

  const can = useCallback(
    (action: ProjectAction) => data?.permissions.has(action) ?? false,
    [data],
  );

  const invalidate = useCallback(() => {
    if (projectId && cache[projectId]) {
      delete cache[projectId];
    }
  }, [projectId]);

  return {
    can,
    role: data?.role ?? null,
    isOwner: data?.role === 'OWNER' || data?.role === 'PLATFORM_ADMIN',
    loading,
    /** Clear cache for this project — use after permission changes */
    invalidate,
  };
}
