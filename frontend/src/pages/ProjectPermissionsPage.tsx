import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getApiBase, apiFetch } from '../lib/api';
import { useProjectPermissions } from '../hooks/useProjectPermissions';
import { useWorkspaceLink } from '../hooks/useWorkspaceLink';

// ── Types (shared) ───────────────────────────────────────────────────────────

interface Member {
  publicId: string | null; // null for team-only members (no direct ProjectMember record)
  role: string;
  user: { publicId: string; name: string; email: string } | null;
  teamName?: string | null;
}

interface Grant {
  publicId: string;
  action: string;
  grantedToRole: string | null;
  grantedToUser: { publicId: string; name: string; email: string } | null;
  grantedBy: { publicId: string; name: string } | null;
  createdAt: string;
}

interface ActionGroupDef {
  key: string;
  labelKey: string;
  actions: string[];
}

interface ProjectInfo {
  publicId: string;
  name: string;
  owner: { publicId: string; name: string; email: string } | null;
}

interface PermissionsData {
  project: ProjectInfo | null;
  members: Member[];
  grants: Grant[];
  actionGroups: ActionGroupDef[];
  delegatableActions: string[];
  defaultPermissions: Record<string, string[]>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['bg-primary', 'bg-secondary', 'bg-info', 'bg-success', 'bg-warning', 'bg-danger'];
const ROLES = ['CONTRIBUTOR', 'READER'] as const;

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

// ══════════════════════════════════════════════════════════════════════════════
// PermissionsPanel — reusable content (used by page route AND modal)
// ══════════════════════════════════════════════════════════════════════════════

export interface PermissionsPanelProps {
  projectId: string;
}

export function PermissionsPanel({ projectId }: PermissionsPanelProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('permissions');
  const { t: tc } = useTranslation('common');

  const [data, setData] = useState<PermissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState<Record<string, boolean>>({});

  const api = getApiBase();
  const h = useCallback(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async (silent = false) => {
    if (!projectId || !token) return;
    if (!silent) setLoading(true);
    try {
      const res = await apiFetch(`${api}/projects/${projectId}/permissions`, { headers: h() });
      if (res.ok) setData(await res.json());
      else if (!silent) showToast('danger', t('error.load'));
    } catch { if (!silent) showToast('danger', t('error.load')); }
    finally { if (!silent) setLoading(false); }
  }, [projectId, token, api, h, showToast, t]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleChangeRole(memberPublicId: string, newRole: string) {
    setSavingRole((prev) => ({ ...prev, [memberPublicId]: true }));
    try {
      const res = await apiFetch(`${api}/projects/${projectId}/permissions/members/${memberPublicId}/role`, {
        method: 'PATCH', headers: h(), body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        // Optimistic update — change the role locally without full reload
        setData((prev) => prev ? {
          ...prev,
          members: prev.members.map((m) => m.publicId === memberPublicId ? { ...m, role: newRole } : m),
        } : prev);
        showToast('success', t('success.role_updated'));
        // Silent refresh to sync grants that may have changed
        loadData(true);
      } else showToast('danger', t('error.save'));
    } catch { showToast('danger', t('error.save')); }
    finally { setSavingRole((prev) => ({ ...prev, [memberPublicId]: false })); }
  }

  async function handleToggleGrant(action: string, target: { role?: string; userPublicId?: string }, currentlyGranted: boolean, grantPublicId?: string) {
    try {
      if (currentlyGranted && grantPublicId) {
        const res = await apiFetch(`${api}/projects/${projectId}/permissions/grants/${grantPublicId}`, {
          method: 'DELETE', headers: h(),
        });
        if (res.ok) {
          // Optimistic update — remove the grant locally
          setData((prev) => prev ? {
            ...prev,
            grants: prev.grants.filter((g) => g.publicId !== grantPublicId),
          } : prev);
          showToast('success', t('success.grant_revoked'));
        } else showToast('danger', t('error.save'));
      } else {
        const body: Record<string, string> = { action };
        if (target.role) body.grantedToRole = target.role;
        if (target.userPublicId) body.grantedToUserPublicId = target.userPublicId;
        const res = await apiFetch(`${api}/projects/${projectId}/permissions/grants`, {
          method: 'POST', headers: h(), body: JSON.stringify(body),
        });
        if (res.ok) {
          const created = await res.json();
          // Optimistic update — add the new grant locally
          setData((prev) => prev ? {
            ...prev,
            grants: [...prev.grants, {
              publicId: created.publicId,
              action,
              grantedToRole: target.role ?? null,
              grantedToUser: target.userPublicId ? { publicId: target.userPublicId, name: '', email: '' } : null,
              grantedBy: null,
              createdAt: new Date().toISOString(),
            }],
          } : prev);
          showToast('success', t('success.grant_created'));
        } else showToast('danger', t('error.save'));
      }
    } catch { showToast('danger', t('error.save')); }
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div className="spinner-border text-primary" role="status" />
    </div>
  );

  if (!data) return (
    <div className="text-center py-4 text-muted">{t('error.forbidden')}</div>
  );

  const { project, members, grants, actionGroups, delegatableActions, defaultPermissions } = data;
  const delegatable = new Set(delegatableActions);

  function roleHasAction(role: string, action: string) {
    const defaults = defaultPermissions[role] ?? [];
    const isDefault = defaults.includes(action);
    const grant = grants.find((g) => g.action === action && g.grantedToRole === role);
    return { has: isDefault || !!grant, isDefault, isGranted: !!grant, grantPublicId: grant?.publicId };
  }

  function userHasGrant(userPublicId: string, action: string) {
    const grant = grants.find((g) => g.action === action && g.grantedToUser?.publicId === userPublicId);
    return { isGranted: !!grant, grantPublicId: grant?.publicId };
  }

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Justified Nav Tabs — Zynix nav-style-1 */}
      <ul className="nav nav-tabs mb-3 nav-justified nav-style-1 d-sm-flex d-block" role="tablist">
        <li className="nav-item">
          <a className="nav-link active" data-bs-toggle="tab" role="tab" href={`#perm-tab-members-${projectId}`} aria-selected="true">
            <i className="ri-group-line me-1" />{t('tab.members')}
            <span className="badge bg-primary-transparent text-primary ms-2">{members.length + (project?.owner ? 1 : 0)}</span>
          </a>
        </li>
        <li className="nav-item">
          <a className="nav-link" data-bs-toggle="tab" role="tab" href={`#perm-tab-perms-${projectId}`} aria-selected="false">
            <i className="ri-shield-keyhole-line me-1" />{t('tab.permissions')}
          </a>
        </li>
      </ul>

      <div className="tab-content">

        {/* ══ Members Tab ══════════════════════════════════════════════ */}
        <div className="tab-pane show active text-muted" id={`perm-tab-members-${projectId}`} role="tabpanel">
          {members.length === 0 && !project?.owner ? (
            <div className="text-center py-4 text-muted">{t('empty.no_members')}</div>
          ) : (
            <div className="accordion" id={`members-accordion-${projectId}`}>

              {/* Owner — fixed row, no expand */}
              {project?.owner && (
                <div className="accordion-item">
                  <h2 className="accordion-header">
                    <div className="d-flex align-items-center px-3 py-2">
                      <span className={`avatar avatar-xs avatar-rounded ${AVATAR_COLORS[0]} me-2`}>
                        {initials(project.owner.name)}
                      </span>
                      <div className="flex-fill">
                        <span className="fw-medium">{project.owner.name}</span>
                        <span className="text-muted fs-12 ms-2">{project.owner.email}</span>
                      </div>
                      <span className="badge bg-warning-transparent text-warning">
                        <i className="ri-vip-crown-line me-1" />{t('role.owner')}
                      </span>
                    </div>
                  </h2>
                </div>
              )}

              {/* Member rows — accordion expands to individual permissions */}
              {members.map((m, i) => {
                const memberKey = m.publicId ?? m.user?.publicId ?? `idx-${i}`;
                const memberId = `member-${memberKey}`;
                const memberName = m.user?.name ?? '?';
                const isTeamOnly = !m.publicId; // no ProjectMember record — comes from team
                return (
                  <div className="accordion-item" key={memberKey}>
                    <h2 className="accordion-header" id={`heading-${memberId}`}>
                      <button
                        className="accordion-button collapsed"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse-${memberId}`}
                        aria-expanded="false"
                        aria-controls={`collapse-${memberId}`}
                      >
                        <span className="d-flex align-items-center flex-fill gap-2">
                          <span className={`avatar avatar-xs avatar-rounded ${AVATAR_COLORS[(i + 1) % AVATAR_COLORS.length]}`}>
                            {initials(memberName)}
                          </span>
                          <span>
                            <span className="fw-medium">{memberName}</span>
                            <span className="text-muted fs-12 ms-2">{m.user?.email ?? '—'}</span>
                            {m.teamName && (
                              <span className="badge bg-light text-default fs-10 ms-2">{m.teamName}</span>
                            )}
                          </span>
                        </span>
                        <span className="me-3" onClick={(e) => e.stopPropagation()}>
                          {isTeamOnly ? (
                            /* Team-only members — show role as badge (no ProjectMember to change) */
                            <span className="badge bg-info-transparent text-info">{t('role.reader')}</span>
                          ) : (
                            <select
                              className="form-select form-select-sm"
                              style={{ width: 140 }}
                              value={m.role}
                              disabled={savingRole[m.publicId!]}
                              onChange={(e) => { e.stopPropagation(); handleChangeRole(m.publicId!, e.target.value); }}
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>{t(`role.${r.toLowerCase()}`)}</option>
                              ))}
                            </select>
                          )}
                        </span>
                      </button>
                    </h2>
                    <div
                      id={`collapse-${memberId}`}
                      className="accordion-collapse collapse"
                      aria-labelledby={`heading-${memberId}`}
                      data-bs-parent={`#members-accordion-${projectId}`}
                    >
                      <div className="accordion-body p-0">
                        {/* Inner accordion — permissions grouped by functional area */}
                        <div className="accordion accordion-flush" id={`inner-accordion-${memberId}`}>
                          {actionGroups.map((group, gi) => (
                            <div className="accordion-item" key={group.key}>
                              <h2 className="accordion-header" id={`inner-heading-${memberId}-${group.key}`}>
                                <button
                                  className="accordion-button collapsed py-2 ps-4 fs-13 fw-semibold"
                                  type="button"
                                  data-bs-toggle="collapse"
                                  data-bs-target={`#inner-collapse-${memberId}-${group.key}`}
                                  aria-expanded="false"
                                  aria-controls={`inner-collapse-${memberId}-${group.key}`}
                                >
                                  {t(group.labelKey)}
                                </button>
                              </h2>
                              <div
                                id={`inner-collapse-${memberId}-${group.key}`}
                                className="accordion-collapse collapse"
                                aria-labelledby={`inner-heading-${memberId}-${group.key}`}
                              >
                                <div className="accordion-body p-0">
                                  <table className="table table-sm table-hover mb-0">
                                    <thead className="table-light">
                                      <tr>
                                        <th className="ps-4 fs-12">{t('table.action')}</th>
                                        <th className="text-center fs-12" style={{ width: 80 }}>Role</th>
                                        <th className="text-center fs-12" style={{ width: 80 }}>Individual</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.actions.map((action) => {
                                        const roleInfo = roleHasAction(m.role, action);
                                        const userInfo = m.user ? userHasGrant(m.user.publicId, action) : { isGranted: false, grantPublicId: undefined };
                                        const isDelegatable = delegatable.has(action);
                                        return (
                                          <tr key={action}>
                                            <td className="ps-4 fs-13">{t(`action.${action}`)}</td>
                                            <td className="text-center">
                                              {roleInfo.has ? (
                                                <i className="ri-check-line text-success" />
                                              ) : (
                                                <i className="ri-close-line text-muted opacity-25" />
                                              )}
                                            </td>
                                            <td className="text-center">
                                              {isDelegatable && m.user ? (
                                                <div className="form-check form-switch d-inline-block mb-0">
                                                  <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={userInfo.isGranted}
                                                    onChange={() => handleToggleGrant(
                                                      action,
                                                      { userPublicId: m.user!.publicId },
                                                      userInfo.isGranted,
                                                      userInfo.grantPublicId,
                                                    )}
                                                  />
                                                </div>
                                              ) : (
                                                <span className="text-muted opacity-25"><i className="ri-lock-line" /></span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══ Permissions Tab (per-role) ══════════════════════════════ */}
        <div className="tab-pane text-muted" id={`perm-tab-perms-${projectId}`} role="tabpanel">
          <div className="accordion" id={`perms-accordion-${projectId}`}>
            {actionGroups.map((group, gi) => (
              <div className="accordion-item" key={group.key}>
                <h2 className="accordion-header" id={`perm-heading-${projectId}-${group.key}`}>
                  <button
                    className={`accordion-button${gi > 0 ? ' collapsed' : ''}`}
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#perm-collapse-${projectId}-${group.key}`}
                    aria-expanded={gi === 0 ? 'true' : 'false'}
                    aria-controls={`perm-collapse-${projectId}-${group.key}`}
                  >
                    {t(group.labelKey)}
                  </button>
                </h2>
                <div
                  id={`perm-collapse-${projectId}-${group.key}`}
                  className={`accordion-collapse collapse${gi === 0 ? ' show' : ''}`}
                  aria-labelledby={`perm-heading-${projectId}-${group.key}`}
                  data-bs-parent={`#perms-accordion-${projectId}`}
                >
                  <div className="accordion-body p-0">
                    <table className="table table-sm mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="ps-3">{t('table.action')}</th>
                          <th className="text-center" style={{ width: 140 }}>{t('table.contributor')}</th>
                          <th className="text-center" style={{ width: 140 }}>{t('table.reader')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.actions.map((action) => (
                          <tr key={action}>
                            <td className="ps-3 fs-13">{t(`action.${action}`)}</td>
                            {ROLES.map((role) => {
                              const info = roleHasAction(role, action);
                              const isDelegatable = delegatable.has(action);
                              return (
                                <td key={role} className="text-center">
                                  {info.isDefault ? (
                                    <span className="badge bg-success-transparent text-success fs-10">
                                      <i className="ri-check-line me-1" />{t('badge.default')}
                                    </span>
                                  ) : isDelegatable ? (
                                    <div className="form-check form-switch d-inline-block mb-0">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        checked={info.isGranted}
                                        onChange={() => handleToggleGrant(action, { role }, info.isGranted, info.grantPublicId)}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-muted fs-11"><i className="ri-lock-line" /></span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PermissionsModal — used by ProjectsPage context menu
// ══════════════════════════════════════════════════════════════════════════════

export interface PermissionsModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function PermissionsModal({ projectId, projectName, onClose }: PermissionsModalProps) {
  const { t } = useTranslation('permissions');
  const { t: tc } = useTranslation('common');

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <div>
                <h5 className="modal-title fw-semibold mb-0">
                  <i className="ri-shield-keyhole-line me-2 text-primary" />
                  {t('page.title')}
                </h5>
                <small className="text-muted">{projectName}</small>
              </div>
              <button type="button" className="btn-close" onClick={onClose} aria-label={tc('actions.close')} />
            </div>
            <div className="modal-body">
              <PermissionsPanel projectId={projectId} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-light" onClick={onClose}>{tc('actions.close')}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Page wrapper (standalone route /projects/:id/permissions)
// ══════════════════════════════════════════════════════════════════════════════

export default function ProjectPermissionsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const wsLink = useWorkspaceLink();
  const { t } = useTranslation('permissions');
  const { t: tc } = useTranslation('common');
  const { loading: permLoading } = useProjectPermissions(projectId);

  if (permLoading || !projectId) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
      <div className="spinner-border text-primary" role="status" />
    </div>
  );

  return (
    <div>
      {/* Page header — matches PlanningPage pattern */}
      <div className="d-flex align-items-center justify-content-between my-3 flex-wrap gap-2">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb breadcrumb-style2 mb-0">
            <li className="breadcrumb-item">
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
                <i className="ti ti-home-2 me-1 fs-15 d-inline-block" />{tc('nav.dashboard')}
              </a>
            </li>
            <li className="breadcrumb-item">
              <a href="#" onClick={(e) => { e.preventDefault(); navigate(wsLink('/projects')); }}>
                <i className="ti ti-folder me-1 fs-15 d-inline-block" />{tc('nav.projects')}
              </a>
            </li>
            <li className="breadcrumb-item active" aria-current="page">{t('page.title')}</li>
          </ol>
        </nav>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate(wsLink(`/projects/${projectId}/planning`))}>
          <i className="ri-arrow-left-line me-1" />{tc('actions.back')}
        </button>
      </div>

      <div className="d-flex align-items-center mb-3">
        <h5 className="fw-semibold mb-0">
          <i className="ri-shield-keyhole-line me-2 text-primary" />{t('page.title')}
        </h5>
      </div>

      <div className="card custom-card">
        <div className="card-body">
          <PermissionsPanel projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
