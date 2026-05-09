import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspaceLink } from '../hooks/useWorkspaceLink';
import { getApiBase, apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjectBrief {
  id: number;
  name: string;
}

interface Task {
  id: number;
  text: string;
  type: string;
  start_date: string;
  end_date?: string;
  duration: number;
  progress: number;
  owner_id: string[];
  parent: number;
  priority?: number;
  constraint_type?: string;
  constraint_date?: string;
}

interface TaskLink {
  id: string;
  source: number;
  target: number;
  type: string;
  lag: number;
}

interface TaskResource {
  id: number;
  text: string;
  parent: number;
  userId?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CONSTRAINT_NEEDS_DATE = new Set(['snet', 'snlt', 'fnet', 'fnlt', 'mso', 'mfo']);

const EMPTY_TASK_FORM = {
  text: '',
  type: 'task',
  start_date: '',
  duration: '1',
  progress: '0',
  parent: '0',
  priority: '',
  constraint_type: '',
  constraint_date: '',
};

const EMPTY_RESOURCE_FORM = { text: '', parentId: '' };
const EMPTY_LINK_FORM = { source: '', target: '', type: '0', lag: '0' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Converte "DD-MM-YYYY HH:mm" → "YYYY-MM-DDTHH:mm" (para datetime-local input) */
function ganttToInput(d: string): string {
  if (!d) return '';
  const [datePart, timePart] = d.split(' ');
  const [dd, mm, yyyy] = datePart.split('-');
  return `${yyyy}-${mm}-${dd}T${timePart ?? '00:00'}`;
}

/** Converte "YYYY-MM-DDTHH:mm" → "DD-MM-YYYY HH:mm" (para API) */
function inputToGantt(d: string): string {
  if (!d) return '';
  const [datePart, timePart] = d.split('T');
  const [yyyy, mm, dd] = datePart.split('-');
  return `${dd}-${mm}-${yyyy} ${timePart ?? '00:00'}`;
}

/** Formata "DD-MM-YYYY HH:mm" → "DD/MM/YYYY" para exibição */
function displayDate(d: string): string {
  if (!d) return '—';
  const [datePart] = d.split(' ');
  const [dd, mm, yyyy] = datePart.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

/** Devolve a lista de tarefas em tree order (pais antes dos filhos) */
function flattenTree(tasks: Task[]): Array<Task & { depth: number }> {
  const byParent = new Map<number, Task[]>();
  for (const t of tasks) {
    const p = t.parent ?? 0;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(t);
  }
  const result: Array<Task & { depth: number }> = [];
  function walk(parentId: number, depth: number) {
    for (const t of byParent.get(parentId) ?? []) {
      result.push({ ...t, depth });
      walk(t.id, depth + 1);
    }
  }
  walk(0, 0);
  // Adicionar tarefas que não entraram na árvore (referências a pais inexistentes)
  const inTree = new Set(result.map((t) => t.id));
  for (const t of tasks) {
    if (!inTree.has(t.id)) result.push({ ...t, depth: 0 });
  }
  return result;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const { t } = useTranslation('planning');
  if (type === 'project')
    return <span className="badge bg-purple-transparent text-purple fs-11">{t('task.type.project')}</span>;
  if (type === 'milestone')
    return <span className="badge bg-warning-transparent text-warning fs-11">{t('task.type.milestone')}</span>;
  return <span className="badge bg-primary-transparent text-primary fs-11">{t('task.type.task')}</span>;
}

function PriorityBadge({ priority }: { priority?: number }) {
  const { t } = useTranslation('planning');
  if (priority === 1) return <span className="badge bg-danger-transparent text-danger">{t('task.priority.high')}</span>;
  if (priority === 2) return <span className="badge bg-warning-transparent text-warning">{t('task.priority.medium')}</span>;
  if (priority === 3) return <span className="badge bg-success-transparent text-success">{t('task.priority.low')}</span>;
  return <span className="text-muted fs-13">—</span>;
}

function LinkTypeLabel({ type }: { type: string }) {
  const map: Record<string, string> = { '0': 'FS', '1': 'SS', '2': 'FF', '3': 'SF' };
  return <>{map[type] ?? type}</>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GanttPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { token } = useAuth();
  const navigate = useNavigate();
  const wsLink = useWorkspaceLink();
  const api = getApiBase();
  const { showToast } = useToast();
  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');

  // Derived option arrays (use t() inside component)
  const TASK_TYPES = [
    { value: 'task', label: t('task.type.task') },
    { value: 'project', label: t('task.type.project') },
    { value: 'milestone', label: t('task.type.milestone') },
  ];

  const PRIORITY_OPTIONS = [
    { value: '', label: t('task.priority.none') },
    { value: '1', label: t('task.priority.high') },
    { value: '2', label: t('task.priority.medium') },
    { value: '3', label: t('task.priority.low') },
  ];

  const CONSTRAINT_OPTIONS = [
    { value: '', label: t('constraint.none') },
    { value: 'asap', label: t('constraint.asap') },
    { value: 'alap', label: t('constraint.alap') },
    { value: 'snet', label: t('constraint.snet') },
    { value: 'snlt', label: t('constraint.snlt') },
    { value: 'fnet', label: t('constraint.fnet') },
    { value: 'fnlt', label: t('constraint.fnlt') },
    { value: 'mso', label: t('constraint.mso') },
    { value: 'mfo', label: t('constraint.mfo') },
  ];

  const LINK_TYPES = [
    { value: '0', label: 'FS — Fim → Início' },
    { value: '1', label: 'SS — Início → Início' },
    { value: '2', label: 'FF — Fim → Fim' },
    { value: '3', label: 'SF — Início → Fim' },
  ];

  // Data
  const [project, setProject] = useState<ProjectBrief | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [resources, setResources] = useState<TaskResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Active tab
  const [activeTab, setActiveTab] = useState<'tasks' | 'resources' | 'links'>('tasks');

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({ ...EMPTY_TASK_FORM });
  const [taskFormError, setTaskFormError] = useState('');
  const [taskFormLoading, setTaskFormLoading] = useState(false);

  // Delete task modal
  const [showDeleteTask, setShowDeleteTask] = useState(false);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [deleteTaskLoading, setDeleteTaskLoading] = useState(false);

  // Resource modal
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [editingResource, setEditingResource] = useState<TaskResource | null>(null);
  const [resourceForm, setResourceForm] = useState({ ...EMPTY_RESOURCE_FORM });
  const [resourceFormError, setResourceFormError] = useState('');
  const [resourceFormLoading, setResourceFormLoading] = useState(false);

  // Delete resource
  const [deleteResourceLoading, setDeleteResourceLoading] = useState<number | null>(null);

  // Link modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkForm, setLinkForm] = useState({ ...EMPTY_LINK_FORM });
  const [linkFormError, setLinkFormError] = useState('');
  const [linkFormLoading, setLinkFormLoading] = useState(false);

  // Delete link
  const [deleteLinkLoading, setDeleteLinkLoading] = useState<string | null>(null);

  // ── Auth header ──────────────────────────────────────────────────────────────

  function h() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }

  // ── Load data ────────────────────────────────────────────────────────────────

  async function loadAll() {
    setLoading(true);
    setPageError('');
    try {
      const [projRes, ganttRes, resourcesRes] = await Promise.all([
        apiFetch(`${api}/projects/${projectId}`, { headers: h() }),
        apiFetch(`${api}/projects/${projectId}/gantt`, { headers: h() }),
        apiFetch(`${api}/projects/${projectId}/gantt/resources`, { headers: h() }),
      ]);
      if (!projRes.ok) throw new Error(t('page.error_project'));
      if (!ganttRes.ok) throw new Error(t('page.error_gantt_data'));
      if (!resourcesRes.ok) throw new Error(t('page.error_resources'));

      const proj = await projRes.json();
      const gantt = await ganttRes.json();
      const res = await resourcesRes.json();

      setProject({ id: proj.id, name: proj.name });
      setTasks(gantt.data ?? []);
      setLinks(gantt.links ?? []);
      setResources(res ?? []);
    } catch (e: unknown) {
      setPageError(e instanceof Error ? e.message : t('page.error_load'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [projectId]);

  // ── Body overflow ────────────────────────────────────────────────────────────

  const anyModalOpen = showTaskModal || showDeleteTask || showResourceModal || showLinkModal;
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [anyModalOpen]);

  // ── Task handlers ────────────────────────────────────────────────────────────

  function openCreateTask() {
    setEditingTask(null);
    setTaskForm({ ...EMPTY_TASK_FORM });
    setTaskFormError('');
    setShowTaskModal(true);
  }

  function openEditTask(t: Task) {
    setEditingTask(t);
    setTaskForm({
      text: t.text,
      type: t.type,
      start_date: ganttToInput(t.start_date),
      duration: String(t.duration),
      progress: String(Math.round(t.progress * 100)),
      parent: String(t.parent ?? 0),
      priority: t.priority ? String(t.priority) : '',
      constraint_type: t.constraint_type ?? '',
      constraint_date: t.constraint_date ? ganttToInput(t.constraint_date) : '',
    });
    setTaskFormError('');
    setShowTaskModal(true);
  }

  async function handleTaskSubmit(e: FormEvent) {
    e.preventDefault();
    setTaskFormError('');
    setTaskFormLoading(true);
    try {
      const body: Record<string, unknown> = {
        text: taskForm.text.trim(),
        type: taskForm.type,
        start_date: inputToGantt(taskForm.start_date),
        duration: Number(taskForm.duration),
        progress: Number(taskForm.progress) / 100,
        parent: Number(taskForm.parent),
      };
      if (taskForm.priority) body.priority = Number(taskForm.priority);
      if (taskForm.constraint_type) body.constraint_type = taskForm.constraint_type;
      if (taskForm.constraint_date && CONSTRAINT_NEEDS_DATE.has(taskForm.constraint_type))
        body.constraint_date = inputToGantt(taskForm.constraint_date);

      const url = editingTask
        ? `${api}/projects/${projectId}/gantt/tasks/${editingTask.id}`
        : `${api}/projects/${projectId}/gantt/tasks`;
      const method = editingTask ? 'PUT' : 'POST';

      const res = await apiFetch(url, { method, headers: h(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' · ') : data.message;
        throw new Error(msg || t('task.error_save'));
      }
      setShowTaskModal(false);
      showToast('success', editingTask ? t('task.success_updated') : t('task.success_created'));
      await loadAll();
    } catch (e: unknown) {
      setTaskFormError(e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setTaskFormLoading(false);
    }
  }

  async function handleDeleteTask() {
    if (!deletingTask) return;
    setDeleteTaskLoading(true);
    try {
      const res = await apiFetch(
        `${api}/projects/${projectId}/gantt/tasks/${deletingTask.id}`,
        { method: 'DELETE', headers: h() },
      );
      if (!res.ok) throw new Error(t('task.error_delete'));
      setShowDeleteTask(false);
      setDeletingTask(null);
      showToast('success', t('task.success_deleted'));
      await loadAll();
    } catch (e: unknown) {
      showToast('danger', e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setDeleteTaskLoading(false);
    }
  }

  // ── Resource handlers ────────────────────────────────────────────────────────

  function openCreateResource() {
    setEditingResource(null);
    setResourceForm({ ...EMPTY_RESOURCE_FORM });
    setResourceFormError('');
    setShowResourceModal(true);
  }

  function openEditResource(r: TaskResource) {
    setEditingResource(r);
    setResourceForm({ text: r.text, parentId: r.parent ? String(r.parent) : '' });
    setResourceFormError('');
    setShowResourceModal(true);
  }

  async function handleResourceSubmit(e: FormEvent) {
    e.preventDefault();
    setResourceFormError('');
    setResourceFormLoading(true);
    try {
      const body: Record<string, unknown> = { text: resourceForm.text.trim() };
      if (resourceForm.parentId) body.parentId = Number(resourceForm.parentId);

      const url = editingResource
        ? `${api}/projects/${projectId}/gantt/resources/${editingResource.id}`
        : `${api}/projects/${projectId}/gantt/resources`;
      const method = editingResource ? 'PUT' : 'POST';

      const res = await apiFetch(url, { method, headers: h(), body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' · ') : data.message;
        throw new Error(msg || t('resource.error_save'));
      }
      setShowResourceModal(false);
      showToast('success', editingResource ? t('resource.success_updated') : t('resource.success_created'));
      await loadAll();
    } catch (e: unknown) {
      setResourceFormError(e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setResourceFormLoading(false);
    }
  }

  async function handleDeleteResource(r: TaskResource) {
    if (!confirm(t('resource.confirm_delete', { name: r.text }))) return;
    setDeleteResourceLoading(r.id);
    try {
      const res = await apiFetch(
        `${api}/projects/${projectId}/gantt/resources/${r.id}`,
        { method: 'DELETE', headers: h() },
      );
      if (!res.ok) throw new Error(t('resource.error_delete'));
      showToast('success', t('resource.success_deleted'));
      await loadAll();
    } catch (e: unknown) {
      showToast('danger', e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setDeleteResourceLoading(null);
    }
  }

  // ── Link handlers ────────────────────────────────────────────────────────────

  function openCreateLink() {
    setLinkForm({ ...EMPTY_LINK_FORM });
    setLinkFormError('');
    setShowLinkModal(true);
  }

  async function handleLinkSubmit(e: FormEvent) {
    e.preventDefault();
    setLinkFormError('');
    setLinkFormLoading(true);
    try {
      const body = {
        source: Number(linkForm.source),
        target: Number(linkForm.target),
        type: linkForm.type,
        lag: Number(linkForm.lag),
      };
      const res = await apiFetch(`${api}/projects/${projectId}/gantt/links`, {
        method: 'POST',
        headers: h(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(' · ') : data.message;
        throw new Error(msg || t('link.error_create'));
      }
      setShowLinkModal(false);
      showToast('success', t('link.success_created'));
      await loadAll();
    } catch (e: unknown) {
      setLinkFormError(e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setLinkFormLoading(false);
    }
  }

  async function handleDeleteLink(link: TaskLink) {
    const srcTask = tasks.find((t) => t.id === link.source);
    const tgtTask = tasks.find((t) => t.id === link.target);
    if (!confirm(t('link.confirm_delete', { src: srcTask?.text ?? String(link.source), tgt: tgtTask?.text ?? String(link.target) }))) return;
    setDeleteLinkLoading(link.id);
    try {
      const res = await apiFetch(
        `${api}/projects/${projectId}/gantt/links/${link.id}`,
        { method: 'DELETE', headers: h() },
      );
      if (!res.ok) throw new Error(t('link.error_delete'));
      showToast('success', t('link.success_deleted'));
      await loadAll();
    } catch (e: unknown) {
      showToast('danger', e instanceof Error ? e.message : tc('errors.generic'));
    } finally {
      setDeleteLinkLoading(null);
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  const flatTasks = flattenTree(tasks);
  const resourceById = new Map(resources.map((r) => [r.id, r]));

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="container-xl py-4 text-center">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="container-xl py-4">
        <div className="alert alert-danger">{pageError}</div>
        <button className="btn btn-secondary" onClick={() => navigate(wsLink('/projects'))}>
          {t('page.back_btn')}
        </button>
      </div>
    );
  }

  return (
    <div className="container-xl">

      {/* Breadcrumb */}
      <div className="d-flex align-items-center justify-content-between my-3 flex-wrap gap-2">
        <div>
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <a href="#" onClick={(e) => { e.preventDefault(); navigate(wsLink('/projects')); }}>
                  {t('nav.projects')}
                </a>
              </li>
              <li className="breadcrumb-item active">{project?.name ?? '—'}</li>
              <li className="breadcrumb-item active">{t('page.gantt_title')}</li>
            </ol>
          </nav>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={() => navigate(wsLink('/projects'))}>
          <i className="ri-arrow-left-line me-1" />{t('nav.projects')}
        </button>
      </div>

      {/* Page header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0 fw-semibold">
          <i className="ri-bar-chart-grouped-line me-2 text-primary" />
          {project?.name} — {t('page.gantt_title')}
        </h4>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs" role="tablist">
            <li className="nav-item">
              <button
                className={`nav-link${activeTab === 'tasks' ? ' active' : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                <i className="ri-task-line me-1" />
                {t('tab.tasks')}
                <span className="badge bg-primary-transparent text-primary ms-2">{tasks.length}</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link${activeTab === 'resources' ? ' active' : ''}`}
                onClick={() => setActiveTab('resources')}
              >
                <i className="ri-group-line me-1" />
                {t('tab.resources')}
                <span className="badge bg-primary-transparent text-primary ms-2">{resources.length}</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link${activeTab === 'links' ? ' active' : ''}`}
                onClick={() => setActiveTab('links')}
              >
                <i className="ri-links-line me-1" />
                {t('tab.links')}
                <span className="badge bg-primary-transparent text-primary ms-2">{links.length}</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-0">

          {/* ── Tab Tarefas ────────────────────────────────────────────────── */}
          {activeTab === 'tasks' && (
            <>
              <div className="d-flex justify-content-end p-3 border-bottom">
                <button className="btn btn-primary btn-sm" onClick={openCreateTask}>
                  <i className="ri-add-line me-1" />{t('task.btn_add')}
                </button>
              </div>
              {tasks.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="ri-task-line fs-1 d-block mb-2" />
                  {t('task.empty')}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th style={{ minWidth: 220 }}>{t('table.task')}</th>
                        <th>{t('table.type')}</th>
                        <th>{t('table.start_date')}</th>
                        <th>{t('table.duration')}</th>
                        <th style={{ minWidth: 120 }}>{t('table.progress')}</th>
                        <th>{t('table.priority')}</th>
                        <th className="text-end">{tc('table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {flatTasks.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <div
                              className="d-flex align-items-center gap-2"
                              style={{ paddingLeft: t.depth * 20 }}
                            >
                              {t.type === 'milestone' ? (
                                <i className="ri-flag-2-line text-warning" />
                              ) : t.type === 'project' ? (
                                <i className="ri-folder-line text-purple" />
                              ) : (
                                <i className="ri-checkbox-blank-circle-line text-primary" />
                              )}
                              <span className="fw-medium fs-13">{t.text}</span>
                            </div>
                          </td>
                          <td><TypeBadge type={t.type} /></td>
                          <td className="fs-13">{displayDate(t.start_date)}</td>
                          <td className="fs-13">
                            {t.type === 'milestone' ? <span className="text-muted">—</span> : `${t.duration}d`}
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="progress flex-grow-1" style={{ height: 6 }}>
                                <div
                                  className="progress-bar"
                                  style={{ width: `${Math.round(t.progress * 100)}%` }}
                                />
                              </div>
                              <span className="fs-12 text-muted" style={{ minWidth: 32 }}>
                                {Math.round(t.progress * 100)}%
                              </span>
                            </div>
                          </td>
                          <td><PriorityBadge priority={t.priority} /></td>
                          <td className="text-end">
                            <button
                              className="btn btn-sm btn-icon btn-primary-transparent me-1"
                              title={tc('actions.edit')}
                              onClick={() => openEditTask(t)}
                            >
                              <i className="ri-pencil-line" />
                            </button>
                            <button
                              className="btn btn-sm btn-icon btn-danger-transparent"
                              title={tc('actions.delete')}
                              onClick={() => { setDeletingTask(t); setShowDeleteTask(true); }}
                            >
                              <i className="ri-delete-bin-line" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Tab Recursos ───────────────────────────────────────────────── */}
          {activeTab === 'resources' && (
            <>
              <div className="d-flex justify-content-end p-3 border-bottom">
                <button className="btn btn-primary btn-sm" onClick={openCreateResource}>
                  <i className="ri-add-line me-1" />{t('resource.btn_add')}
                </button>
              </div>
              {resources.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="ri-group-line fs-1 d-block mb-2" />
                  {t('resource.empty')}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>{tc('table.name')}</th>
                        <th>{t('table.parent_dept')}</th>
                        <th className="text-end">{tc('table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resources.map((r) => {
                        const parentRes = r.parent ? resourceById.get(r.parent) : null;
                        return (
                          <tr key={r.id}>
                            <td className="fw-medium fs-13">{r.text}</td>
                            <td className="fs-13 text-muted">
                              {parentRes ? parentRes.text : <span className="fst-italic">{t('resource.root')}</span>}
                            </td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-icon btn-primary-transparent me-1"
                                title={tc('actions.edit')}
                                onClick={() => openEditResource(r)}
                              >
                                <i className="ri-pencil-line" />
                              </button>
                              <button
                                className="btn btn-sm btn-icon btn-danger-transparent"
                                title={tc('actions.delete')}
                                disabled={deleteResourceLoading === r.id}
                                onClick={() => handleDeleteResource(r)}
                              >
                                {deleteResourceLoading === r.id
                                  ? <span className="spinner-border spinner-border-sm" />
                                  : <i className="ri-delete-bin-line" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ── Tab Dependências ───────────────────────────────────────────── */}
          {activeTab === 'links' && (
            <>
              <div className="d-flex justify-content-end p-3 border-bottom">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={openCreateLink}
                  disabled={tasks.length < 2}
                  title={tasks.length < 2 ? t('link.need_tasks_hint') : undefined}
                >
                  <i className="ri-add-line me-1" />{t('link.btn_add')}
                </button>
              </div>
              {links.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <i className="ri-links-line fs-1 d-block mb-2" />
                  {t('link.empty')}
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>{t('table.source')}</th>
                        <th>{t('table.target')}</th>
                        <th>{t('table.type')}</th>
                        <th>{t('table.lag')}</th>
                        <th className="text-end">{tc('table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {links.map((l) => {
                        const srcTask = tasks.find((t) => t.id === l.source);
                        const tgtTask = tasks.find((t) => t.id === l.target);
                        return (
                          <tr key={l.id}>
                            <td className="fs-13 fw-medium">{srcTask?.text ?? `#${l.source}`}</td>
                            <td className="fs-13 fw-medium">{tgtTask?.text ?? `#${l.target}`}</td>
                            <td>
                              <span className="badge bg-secondary-transparent text-secondary">
                                <LinkTypeLabel type={l.type} />
                              </span>
                            </td>
                            <td className="fs-13 text-muted">
                              {l.lag !== 0 ? `${l.lag} ${t('link.lag_suffix')}` : '—'}
                            </td>
                            <td className="text-end">
                              <button
                                className="btn btn-sm btn-icon btn-danger-transparent"
                                title={tc('actions.delete')}
                                disabled={deleteLinkLoading === l.id}
                                onClick={() => handleDeleteLink(l)}
                              >
                                {deleteLinkLoading === l.id
                                  ? <span className="spinner-border spinner-border-sm" />
                                  : <i className="ri-delete-bin-line" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

        </div>
      </div>

      {/* ── Modal: Criar / Editar Tarefa ──────────────────────────────────────── */}
      {showTaskModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingTask ? t('task.modal_edit_title') : t('task.modal_create_title')}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowTaskModal(false)}
                  />
                </div>
                <form onSubmit={handleTaskSubmit}>
                  <div className="modal-body">
                    {taskFormError && (
                      <div className="alert alert-danger py-2">{taskFormError}</div>
                    )}

                    <div className="row g-3">
                      {/* Texto */}
                      <div className="col-12">
                        <label className="form-label">{t('task.form.text')} <span className="text-danger">*</span></label>
                        <input
                          className="form-control"
                          value={taskForm.text}
                          onChange={(e) => setTaskForm({ ...taskForm, text: e.target.value })}
                          required
                        />
                      </div>

                      {/* Tipo + Data de início */}
                      <div className="col-md-4">
                        <label className="form-label">{t('table.type')}</label>
                        <select
                          className="form-select"
                          value={taskForm.type}
                          onChange={(e) => {
                            const type = e.target.value;
                            setTaskForm({
                              ...taskForm,
                              type,
                              duration: type === 'milestone' ? '0' : (taskForm.duration === '0' ? '1' : taskForm.duration),
                            });
                          }}
                        >
                          {TASK_TYPES.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">{t('task.form.start_date')} <span className="text-danger">*</span></label>
                        <input
                          type="datetime-local"
                          className="form-control"
                          value={taskForm.start_date}
                          onChange={(e) => setTaskForm({ ...taskForm, start_date: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">{t('task.form.duration')}</label>
                        <input
                          type="number"
                          min={0}
                          className="form-control"
                          value={taskForm.duration}
                          disabled={taskForm.type === 'milestone'}
                          onChange={(e) => setTaskForm({ ...taskForm, duration: e.target.value })}
                        />
                        {taskForm.type === 'milestone' && (
                          <div className="form-text">{t('task.form.milestone_hint')}</div>
                        )}
                      </div>

                      {/* Progresso + Pai */}
                      <div className="col-md-4">
                        <label className="form-label">{t('task.form.progress')}</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="form-control"
                          value={taskForm.progress}
                          onChange={(e) => setTaskForm({ ...taskForm, progress: e.target.value })}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">{t('task.form.parent')}</label>
                        <select
                          className="form-select"
                          value={taskForm.parent}
                          onChange={(e) => setTaskForm({ ...taskForm, parent: e.target.value })}
                        >
                          <option value="0">{t('task.form.no_parent')}</option>
                          {tasks
                            .filter((t) => !editingTask || t.id !== editingTask.id)
                            .map((t) => (
                              <option key={t.id} value={String(t.id)}>{t.text}</option>
                            ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">{t('task.form.priority')}</label>
                        <select
                          className="form-select"
                          value={taskForm.priority}
                          onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                        >
                          {PRIORITY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Restrição */}
                      <div className="col-md-6">
                        <label className="form-label">{t('task.form.constraint_type')}</label>
                        <select
                          className="form-select"
                          value={taskForm.constraint_type}
                          onChange={(e) =>
                            setTaskForm({ ...taskForm, constraint_type: e.target.value, constraint_date: '' })
                          }
                        >
                          {CONSTRAINT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      {CONSTRAINT_NEEDS_DATE.has(taskForm.constraint_type) && (
                        <div className="col-md-6">
                          <label className="form-label">{t('task.form.constraint_date')} <span className="text-danger">*</span></label>
                          <input
                            type="datetime-local"
                            className="form-control"
                            value={taskForm.constraint_date}
                            onChange={(e) => setTaskForm({ ...taskForm, constraint_date: e.target.value })}
                            required
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowTaskModal(false)}
                    >
                      {tc('actions.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={taskFormLoading}
                    >
                      {taskFormLoading
                        ? <><span className="spinner-border spinner-border-sm me-2" />{tc('actions.saving')}</>
                        : editingTask ? t('task.form.save_btn') : t('task.form.create_btn')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {/* ── Modal: Confirmar eliminação de tarefa ─────────────────────────────── */}
      {showDeleteTask && deletingTask && (
        <>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title text-danger">{t('task.modal_delete_title')}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeleteTask(false)}
                  />
                </div>
                <div className="modal-body">
                  <p>
                    {t('task.modal_delete_body', { name: deletingTask.text })}
                  </p>
                  <div className="alert alert-warning py-2 mb-0">
                    <i className="ri-alert-line me-1" />
                    {t('task.modal_delete_warning')}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowDeleteTask(false)}
                  >
                    {tc('actions.cancel')}
                  </button>
                  <button
                    className="btn btn-danger"
                    disabled={deleteTaskLoading}
                    onClick={handleDeleteTask}
                  >
                    {deleteTaskLoading
                      ? <><span className="spinner-border spinner-border-sm me-2" />{tc('actions.saving')}</>
                      : tc('actions.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {/* ── Modal: Criar / Editar Recurso ─────────────────────────────────────── */}
      {showResourceModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {editingResource ? t('resource.modal_edit_title') : t('resource.modal_create_title')}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowResourceModal(false)}
                  />
                </div>
                <form onSubmit={handleResourceSubmit}>
                  <div className="modal-body">
                    {resourceFormError && (
                      <div className="alert alert-danger py-2">{resourceFormError}</div>
                    )}
                    <div className="mb-3">
                      <label className="form-label">{t('resource.form.name')} <span className="text-danger">*</span></label>
                      <input
                        className="form-control"
                        value={resourceForm.text}
                        onChange={(e) => setResourceForm({ ...resourceForm, text: e.target.value })}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">{t('resource.form.parent_dept')}</label>
                      <select
                        className="form-select"
                        value={resourceForm.parentId}
                        onChange={(e) => setResourceForm({ ...resourceForm, parentId: e.target.value })}
                      >
                        <option value="">{t('resource.form.no_parent')}</option>
                        {resources
                          .filter((r) => !editingResource || r.id !== editingResource.id)
                          .map((r) => (
                            <option key={r.id} value={String(r.id)}>{r.text}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowResourceModal(false)}
                    >
                      {tc('actions.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={resourceFormLoading}
                    >
                      {resourceFormLoading
                        ? <><span className="spinner-border spinner-border-sm me-2" />{tc('actions.saving')}</>
                        : editingResource ? t('resource.form.save_btn') : t('resource.form.create_btn')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {/* ── Modal: Nova Dependência ───────────────────────────────────────────── */}
      {showLinkModal && (
        <>
          <div className="modal fade show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t('link.modal_create_title')}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowLinkModal(false)}
                  />
                </div>
                <form onSubmit={handleLinkSubmit}>
                  <div className="modal-body">
                    {linkFormError && (
                      <div className="alert alert-danger py-2">{linkFormError}</div>
                    )}
                    <div className="mb-3">
                      <label className="form-label">{t('link.form.source')} <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={linkForm.source}
                        required
                        onChange={(e) => setLinkForm({ ...linkForm, source: e.target.value, target: linkForm.target === e.target.value ? '' : linkForm.target })}
                      >
                        <option value="">{tc('form.select')}</option>
                        {tasks.map((t) => (
                          <option key={t.id} value={String(t.id)}>{t.text}</option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">{t('link.form.target')} <span className="text-danger">*</span></label>
                      <select
                        className="form-select"
                        value={linkForm.target}
                        required
                        onChange={(e) => setLinkForm({ ...linkForm, target: e.target.value })}
                      >
                        <option value="">{tc('form.select')}</option>
                        {tasks
                          .filter((t) => String(t.id) !== linkForm.source)
                          .map((t) => (
                            <option key={t.id} value={String(t.id)}>{t.text}</option>
                          ))}
                      </select>
                    </div>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">{t('table.type')}</label>
                        <select
                          className="form-select"
                          value={linkForm.type}
                          onChange={(e) => setLinkForm({ ...linkForm, type: e.target.value })}
                        >
                          {LINK_TYPES.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">{t('link.form.lag')}</label>
                        <input
                          type="number"
                          className="form-control"
                          value={linkForm.lag}
                          onChange={(e) => setLinkForm({ ...linkForm, lag: e.target.value })}
                        />
                        <div className="form-text">{t('link.form.lag_hint')}</div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowLinkModal(false)}
                    >
                      {tc('actions.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={linkFormLoading}
                    >
                      {linkFormLoading
                        ? <><span className="spinner-border spinner-border-sm me-2" />{t('link.creating')}</>
                        : t('link.btn_create')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

    </div>
  );
}
