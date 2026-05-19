// TaskModal — port do canónico `NewTemplate/views-task-modal.jsx`.
//
// DIFF EXAUSTIVO vs canónico (categorias A-E definidas em MIGRATION.md):
//
// (A) Estrutura HTML — sem desvios. Markup `.tm-chrome` / `.tm-title-row` /
//     `.tm-meta-row` / `.tm-props` / `.tm-tabs` / `.tm-body` / `.tm-footer`
//     é literal. Tabs Details/Discussion/Links/Files preservadas na mesma ordem.
//
// (B) Classes renomeadas — nenhuma classe `.tm-*` foi renomeada. Adições
//     em task-modal.css: `.tm-tag.is-new`, `.tm-tags`, `.tm-tags-dropdown`,
//     `.tm-scan-badge`, `.tm-btn-send`, `.tm-mention`, `.tm-recent-row`,
//     `.tm-more-menu`, `.tm-reaction-picker`, `.tm-rule-errors`.
//
// (C) Estilos com valores divergentes — sem desvios. CSS portado linha-a-linha.
//
// (D) Elementos / classes em falta:
//     - Botão "Follow" do template mantido visualmente mas é local-only
//       (backend não tem mecanismo de followers). DIFF E intencional.
//     - "Updated 16h ago by ..." usa `task.updatedAt` real + `updatedBy.name`.
//     - Stats "followers" hardcoded a 0 (mesma razão do Follow).
//     - System sidecard tem 4 rows reais — sem `toggle-collapse` funcional.
//
// (E) Funcionalidade incompleta intencional:
//     - Title é `<input>` em vez de `<h2 contentEditable>` — facilita validação
//       e placeholder consistente; UX mantém-se editável inline.
//     - Start Date é `<input>` simples em vez de FlatPickr — picker global
//       diferido a sub-fase 2.0 (decisão registada em plano).
//     - Recent files mostra últimos 3 da task (canónico mostra "—" mock).
//     - System sidecard com createdBy/At + updatedBy/At reais (canónico mock).
//     - Tab Discussion: portar CommentsPanel — sub-tarefa F (in progress).
//     - Tab Links: usa usePlanningLinks real + LinkModal já existente.
//     - Tab Files: usa useFiles real + ScanStatusBadge + FileUploadButton.
//     - Subtasks: lista real (tasks com `parent === editingTask.id`) + toggle done
//       via PATCH state (system DONE/TODO) + "Add subtask" → openCreateTask.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../../contexts/AuthContext';
import { useTimezone } from '../../../contexts/TimezoneContext';
import { useToast } from '../../../contexts/ToastContext';
import { ProjectAction, type useProjectPermissions } from '../../../hooks/useProjectPermissions';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { avatarColorFor, avatarUrlOf, initialsOf } from '../../../lib/avatars';
import { formatMoment, relativeTimeInTimezone } from '../../../lib/dateFormatting';
import { useClosingState } from '../../../lib/useClosingState';
import { DatePicker } from '../../../lib/DatePicker';

import { TagsField, EMPTY_TAGS_VALUE, type TagsFieldValue } from '../../tags/components/TagsField';
import { useWorkspaceTags } from '../../tags/useWorkspaceTags';
import { CommentsPanel } from '../../comments/components/CommentsPanel';
import { FilesPanel } from '../../files/components/FilesPanel';
import { useFiles, useUploadsAvailability } from '../../files/useFiles';

import { useTaskForm, type TaskModalTab, CONSTRAINT_NEEDS_DATE } from '../useTaskForm';
import { usePlanningLinks } from '../usePlanningLinks';
import type { IProjectMember, ITask, ITaskLink, ITaskState } from '../types';

import { LinkModal } from './LinkModal';
import { ConfirmDialog } from '../../../shell/ConfirmDialog';
import { TMSelect } from './TMSelect';
import {
  SvgAt, SvgBell, SvgCal, SvgChat, SvgCheck, SvgClock, SvgDB, SvgEmoji, SvgExitFs,
  SvgEye, SvgFile, SvgFlag, SvgFullscreen, SvgGear, SvgInfo, SvgLink, SvgListUl,
  SvgPaperclip, SvgPlus, SvgSend, SvgTrash, SvgUsers, SvgX,
} from './TaskModalIcons';

// ─── Constantes locais ───────────────────────────────────────────────────────

type StateClsKey = 'todo' | 'doing' | 'review' | 'done' | 'blocked';

function stateClsFor(state: ITaskState | undefined): StateClsKey {
  if (!state) return 'todo';
  switch (state.systemKey) {
    case 'TODO': return 'todo';
    case 'INPROGRESS': return 'doing';
    case 'DONE': return 'done';
    default: return 'review';
  }
}

interface PriorityOpt { key: string; label: string; cls: 'crit' | 'high' | 'med' | 'low' | 'none' }
function priorityOptions(t: (k: string) => string): PriorityOpt[] {
  return [
    { key: '',  label: t('task.priority.none'), cls: 'none' },
    { key: '0', label: t('task.priority.crit'), cls: 'crit' },
    { key: '1', label: t('task.priority.high'), cls: 'high' },
    { key: '2', label: t('task.priority.med'),  cls: 'med' },
    { key: '3', label: t('task.priority.low'),  cls: 'low' },
  ];
}

function constraintOptions(t: (k: string) => string) {
  return [
    { key: '',     label: t('task.constraint.none') },
    { key: 'asap', label: t('task.constraint.asap') },
    { key: 'alap', label: t('task.constraint.alap') },
    { key: 'snet', label: t('task.constraint.snet') },
    { key: 'snlt', label: t('task.constraint.snlt') },
    { key: 'fnet', label: t('task.constraint.fnet') },
    { key: 'fnlt', label: t('task.constraint.fnlt') },
  ];
}

function typeOptions(t: (k: string) => string) {
  return [
    { key: 'task',      label: t('task.type.task') },
    { key: 'project',   label: t('task.type.project') },
    { key: 'milestone', label: t('task.type.milestone') },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveStateLabel(state: ITaskState | undefined, t: (k: string) => string): string {
  if (!state) return '—';
  if (state.label) return state.label;
  if (state.labelKey) return t(state.labelKey);
  return '—';
}

function shortDateFromWire(wire: string | undefined): string {
  // 'DD-MM-YYYY HH:mm' → 'DD/MM/YYYY' (display short no property strip)
  if (!wire) return '—';
  const m = wire.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (!m) return wire;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

const FILE_KIND_BY_EXT: Record<string, { kind: string; col: string; soft: string }> = {
  pdf:  { kind: 'PDF',  col: 'oklch(0.55 0.18 25)',  soft: 'oklch(0.95 0.06 25)'  },
  doc:  { kind: 'DOC',  col: 'oklch(0.50 0.16 264)', soft: 'oklch(0.94 0.06 264)' },
  docx: { kind: 'DOCX', col: 'oklch(0.50 0.16 264)', soft: 'oklch(0.94 0.06 264)' },
  xls:  { kind: 'XLS',  col: 'oklch(0.45 0.15 155)', soft: 'oklch(0.94 0.06 155)' },
  xlsx: { kind: 'XLSX', col: 'oklch(0.45 0.15 155)', soft: 'oklch(0.94 0.06 155)' },
  ppt:  { kind: 'PPT',  col: 'oklch(0.55 0.18 30)',  soft: 'oklch(0.95 0.06 30)'  },
  pptx: { kind: 'PPTX', col: 'oklch(0.55 0.18 30)',  soft: 'oklch(0.95 0.06 30)'  },
  zip:  { kind: 'ZIP',  col: 'oklch(0.55 0.02 250)', soft: 'oklch(0.95 0.005 250)' },
  '7z': { kind: '7Z',   col: 'oklch(0.55 0.02 250)', soft: 'oklch(0.95 0.005 250)' },
  png:  { kind: 'PNG',  col: 'oklch(0.55 0.16 220)', soft: 'oklch(0.94 0.06 220)' },
  jpg:  { kind: 'JPG',  col: 'oklch(0.55 0.16 220)', soft: 'oklch(0.94 0.06 220)' },
  jpeg: { kind: 'JPG',  col: 'oklch(0.55 0.16 220)', soft: 'oklch(0.94 0.06 220)' },
  webp: { kind: 'WEBP', col: 'oklch(0.55 0.16 220)', soft: 'oklch(0.94 0.06 220)' },
  svg:  { kind: 'SVG',  col: 'oklch(0.55 0.16 295)', soft: 'oklch(0.94 0.06 295)' },
  mp4:  { kind: 'MP4',  col: 'oklch(0.55 0.16 30)',  soft: 'oklch(0.95 0.06 30)'  },
};

export function fileKindOf(name: string): { kind: string; col: string; soft: string } {
  const idx = name.lastIndexOf('.');
  const ext = idx === -1 ? '' : name.slice(idx + 1).toLowerCase();
  return FILE_KIND_BY_EXT[ext] ?? { kind: ext.toUpperCase().slice(0, 4) || 'FILE', col: 'var(--ink2)', soft: 'var(--panel2)' };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface AvatarBubbleProps {
  publicId: string;
  name: string;
  /** URL pública do avatar (do member). Quando `null`/omitido, mostra iniciais. */
  avatarUrl?: string | null;
  /** ISO 8601 — usado para cache busting via `?v=` (mesmo padrão de
   *  `AssigneeAvatars`). Sem isto, o browser cacha avatar antigo após upload. */
  avatarUpdatedAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
}
function AvatarBubble({ publicId, name, avatarUrl, avatarUpdatedAt, size = 'sm' }: AvatarBubbleProps) {
  const px = size === 'lg' ? 38 : size === 'md' ? 26 : 18;
  const fs = size === 'lg' ? 13 : size === 'md' ? 10 : 9;
  const src = avatarUrlOf({
    avatarUrl: avatarUrl ?? null,
    avatarUpdatedAt: avatarUpdatedAt ?? null,
  });
  return (
    <div
      style={{
        width: px, height: px, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: avatarColorFor(publicId),
        color: '#fff', fontSize: fs, fontWeight: 600, flex: '0 0 auto',
        overflow: 'hidden',
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        initialsOf(name)
      )}
    </div>
  );
}

interface StatePillProps {
  states: ITaskState[];
  value: string;
  onChange: (publicId: string) => void;
  disabled?: boolean;
}
function StatePill({ states, value, onChange, disabled }: StatePillProps) {
  const { t } = useTranslation('planning');
  const options = states.map((s) => ({
    key: s.publicId,
    label: resolveStateLabel(s, t),
  }));
  const current = states.find((s) => s.publicId === value);
  const cls = stateClsFor(current);

  if (disabled) {
    return (
      <span className={`st-pill ${cls}`}>
        <span className="dot"></span>
        {resolveStateLabel(current, t)}
      </span>
    );
  }
  return (
    <TMSelect<string>
      value={value}
      onChange={onChange}
      options={options}
      renderTrigger={(v) => {
        const s = states.find((st) => st.publicId === v);
        const c = stateClsFor(s);
        return (
          <span className={`st-pill ${c}`}>
            <span className="dot"></span>
            {resolveStateLabel(s, t)}
          </span>
        );
      }}
      renderOption={(o) => {
        const s = states.find((st) => st.publicId === o.key);
        const c = stateClsFor(s);
        return (
          <span className={`st-pill ${c}`} style={{ pointerEvents: 'none' }}>
            <span className="dot"></span>
            {o.label}
          </span>
        );
      }}
    />
  );
}

function PriorityPill({ value, onChange, t }: { value: string; onChange: (v: string) => void; t: (k: string) => string }) {
  const opts = priorityOptions(t);
  return (
    <TMSelect<string>
      value={value}
      onChange={onChange}
      options={opts}
      renderTrigger={(v) => {
        const o = opts.find((x) => x.key === v) ?? opts[0];
        return (
          <span className={`pri-pill ${o.cls}`}>
            <SvgFlag /> {o.label}
          </span>
        );
      }}
      renderOption={(o) => {
        const opt = opts.find((x) => x.key === o.key) ?? opts[0];
        return (
          <span className={`pri-pill ${opt.cls}`} style={{ pointerEvents: 'none' }}>
            <SvgFlag /> {opt.label}
          </span>
        );
      }}
    />
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

type CanFn = ReturnType<typeof useProjectPermissions>['can'];

interface TaskModalProps {
  projectPublicId: string;
  /** null = create; ITask = edit. */
  initialValue: ITask | null;
  initialTab?: TaskModalTab;
  /** Quando criar subtask via "+ Add subtask", o caller pode passar o publicId
   *  do pai (resolvido para id numérico em useTaskForm). */
  parentPublicId?: string;
  /** Estado default pré-seleccionado em modo create. Tipicamente o `TODO` system. */
  boardColumnPublicId?: string;
  // Dados
  states: ITaskState[];
  tasks: ITask[];
  links: ITaskLink[];
  /** Map indexado por `TaskResourceNode.publicId` — chave canónica do
   *  `task.owner_id[]` no backend. Construído pela `ProjectDetailPage` a
   *  partir de `resources + members`. Necessário porque `IProjectMember.publicId`
   *  é `User.publicId`, NÃO o id que o backend espera em `owner_id` (que é
   *  `TaskResourceNode.publicId`, distinto). Usar este map evita erro
   *  `INVALID_OWNER_ID` ao gravar tasks com assignees adicionados na UI. */
  assigneesByPublicId: Map<string, IProjectMember>;
  workHours: { start: number; end: number } | null;
  // Permissões
  can: CanFn;
  // Lifecycle
  onClose: () => void;
  onMutated: () => Promise<void> | void;
}

// ─── Main component ─────────────────────────────────────────────────────────

export function TaskModal(props: TaskModalProps) {
  const {
    projectPublicId, initialValue, initialTab = 'details',
    parentPublicId, boardColumnPublicId,
    states, tasks, links, assigneesByPublicId, workHours,
    can, onClose, onMutated,
  } = props;

  const { t } = useTranslation('planning');
  const { t: tc } = useTranslation('common');
  const { user } = useAuth();
  const tz = useTimezone();
  const { showToast } = useToast();
  const { tags: availableTags } = useWorkspaceTags();
  const uploadFlag = useFeatureFlag('upload');
  const uploadsAvailable = useUploadsAvailability();
  // Two-phase close — bate com `animation-duration` de .tm-modal.is-closing (260ms).
  const { closing, requestClose } = useClosingState(onClose, 260);

  const canCreate = can(ProjectAction.TASK_CREATE);
  const canEdit = can(ProjectAction.TASK_EDIT);
  const canDelete = can(ProjectAction.TASK_DELETE);
  const canLinks = can(ProjectAction.LINK_MANAGE);
  const canComment = can(ProjectAction.TASK_COMMENT);
  const canFileView = can(ProjectAction.FILE_VIEW);
  const canFileUpload = can(ProjectAction.FILE_UPLOAD);
  const canFileDelete = can(ProjectAction.FILE_DELETE);
  const canFileRename = can(ProjectAction.FILE_RENAME);

  const showFilesTab = canFileView && uploadFlag.enabled && uploadsAvailable !== false;

  // ── Form state via hook ───────────────────────────────────────────────────
  const form = useTaskForm({
    projectPublicId,
    onMutated,
    onSubmitSuccess: requestClose,  /* fecha a modal externa após save OK (com slide-out) */
    defaultBoardColumnPublicId: boardColumnPublicId ?? null,
    tasks,
    workHours,
    states,
  });

  const editing = initialValue !== null;

  // Init / reset state via key (key bump força re-mount limpo).
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    if (initialValue) {
      form.openEditTask(initialValue, initialTab);
    } else {
      form.openCreateTask(0, boardColumnPublicId, parentPublicId);
      if (initialTab !== 'details') form.setTaskModalTab(initialTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Esc fecha; body overflow lock.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') requestClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [requestClose]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [fullscreen, setFullscreen] = useState(false);
  const [follow, setFollow] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLinkCreate, setShowLinkCreate] = useState(false);

  // ── Links derivados ───────────────────────────────────────────────────────
  const { createLink, removeLink } = usePlanningLinks(projectPublicId, async () => {
    await onMutated();
  });
  const tasksById = useMemo(() => {
    const m = new Map<number, ITask>();
    for (const tk of tasks) m.set(tk.id, tk);
    return m;
  }, [tasks]);

  const predecessors = useMemo(
    () => (initialValue ? links.filter((l) => l.target === initialValue.id) : []),
    [links, initialValue],
  );
  const successors = useMemo(
    () => (initialValue ? links.filter((l) => l.source === initialValue.id) : []),
    [links, initialValue],
  );

  // ── Recent files (sidebar Details) ───────────────────────────────────────
  const filesHook = useFiles({
    projectPublicId,
    taskPublicId: initialValue?.publicId ?? null,
    enabled: showFilesTab && !!initialValue,
  });
  const recentFiles = filesHook.files.slice(0, 3);

  // ── Subtasks ─────────────────────────────────────────────────────────────
  const subtasks = useMemo(
    () => (initialValue ? tasks.filter((tk) => tk.parent === initialValue.id) : []),
    [tasks, initialValue],
  );
  const subtasksDone = subtasks.filter(
    (st) => st.boardColumn && states.find((s) => s.publicId === st.boardColumn)?.systemKey === 'DONE',
  ).length;

  // ── Parent options ───────────────────────────────────────────────────────
  const parentOptions = useMemo(() => {
    const opts: Array<{ key: string; label: string; placeholder?: boolean }> = [
      { key: '0', label: t('task.field.parent_none'), placeholder: true },
    ];
    for (const tk of tasks) {
      if (tk.type === 'milestone') continue;
      if (initialValue && tk.id === initialValue.id) continue;
      // TODO descendant check (cheap: skip if parent === self.id)
      if (initialValue && tk.parent === initialValue.id) continue;
      opts.push({ key: String(tk.id), label: tk.text });
    }
    return opts;
  }, [tasks, initialValue, t]);

  // ── Assignee dropdown ────────────────────────────────────────────────────
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const assigneeMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (assigneeMenuRef.current && !assigneeMenuRef.current.contains(e.target as Node)) {
        setShowAssigneeMenu(false);
      }
    }
    if (showAssigneeMenu) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showAssigneeMenu]);

  /** Options para o dropdown "+ Add" — usa `assigneesByPublicId` cujas
   *  CHAVES são `TaskResourceNode.publicId` (= `owner_id` canónico no
   *  backend). Cada opção tem `publicId: nodeId` para que ao clicar o
   *  valor inserido em `taskOwnerIds[]` seja o id correcto. */
  const assigneeOptions = useMemo(() => {
    const taken = new Set(form.taskOwnerIds);
    const list: Array<{ publicId: string; name: string; avatarUrl: string | null; avatarUpdatedAt: string | null }> = [];
    for (const [nodeId, mem] of assigneesByPublicId) {
      if (taken.has(nodeId)) continue;
      list.push({
        publicId: nodeId,
        name: mem.name,
        avatarUrl: mem.avatarUrl,
        avatarUpdatedAt: mem.avatarUpdatedAt,
      });
    }
    return list;
  }, [assigneesByPublicId, form.taskOwnerIds]);

  const formId = 'task-modal-form';

  // ── Counters (stats + tabs) ──────────────────────────────────────────────
  const discussionCount = initialValue?.commentCount ?? 0;
  const linkCount = predecessors.length + successors.length;
  const fileCount = initialValue ? filesHook.files.length : 0;

  // ── Title input ─────────────────────────────────────────────────────────
  const titleInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!editing && titleInputRef.current) titleInputRef.current.focus();
  }, [editing]);

  return (
    <>
      <div className={'tm-backdrop' + (closing ? ' is-closing' : '')} onClick={requestClose} role="presentation" />
      <div className={'tm-modal' + (fullscreen ? ' full' : '') + (closing ? ' is-closing' : '')} role="dialog" aria-modal>
        {/* ── Chrome ───────────────────────────────────────────────── */}
        <div className="tm-chrome">
          <span className="kind">
            <SvgCheck s={11} />
            {t(`task.chrome.kind_${form.taskForm.type}` as 'task.chrome.kind_task')}
          </span>
          {initialValue?.updatedAt && (
            <span className="updated">
              <SvgClock />
              {t('task.chrome.updated_relative', {
                relative: relativeTimeInTimezone(initialValue.updatedAt, t as never, tz),
                author: initialValue.updatedBy?.name ?? '—',
              })}
            </span>
          )}
          <div className="grow"></div>
          <button
            type="button"
            className={'follow' + (follow ? ' is-following' : '')}
            onClick={() => setFollow((f) => !f)}
            title={t('task.chrome.follow_hint')}
          >
            <SvgBell s={13} /> {follow ? t('task.chrome.following') : t('task.chrome.follow')}
          </button>
          <button
            type="button"
            className="ico-btn"
            title={fullscreen ? t('task.chrome.exit_fullscreen') : t('task.chrome.fullscreen')}
            onClick={() => setFullscreen((f) => !f)}
          >
            {fullscreen ? <SvgExitFs /> : <SvgFullscreen />}
          </button>
          <button type="button" className="ico-btn" title={tc('actions.close')} onClick={requestClose}>
            <SvgX s={14} />
          </button>
        </div>

        {/* ── Title ────────────────────────────────────────────────── */}
        <div className="tm-title-row">
          {/* DIFF (E): canónico usa <h2 contentEditable> — convertemos para
              <input> com mesma tipografia para validação fiável (`required`,
              autoFocus em create). */}
          <input
            ref={titleInputRef}
            type="text"
            className="tm-title-input"
            value={form.taskForm.text}
            onChange={(e) => form.setTaskForm((f) => ({ ...f, text: e.target.value }))}
            placeholder={t('task.title_placeholder')}
            form={formId}
            required
            disabled={editing && !canEdit}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              background: 'transparent',
              font: 'inherit',
              fontSize: 24,
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.5px',
              lineHeight: 1.2,
              padding: 0,
            }}
          />
        </div>

        {/* ── Tags + stats ─────────────────────────────────────────── */}
        <div className="tm-meta-row">
          <TagsField
            value={form.taskTags}
            onChange={form.setTaskTags}
            availableTags={availableTags}
            minimal
            disabled={editing && !canEdit}
            placeholder={t('task.tags_placeholder')}
          />
          <div className="tm-stats">
            <span className="s"><SvgChat s={13} /><b>{discussionCount}</b></span>
            <span className="s"><SvgPaperclip s={13} /><b>{fileCount}</b></span>
            <span className="s"><SvgEye s={13} /><b>0</b> {t('task.stats.followers')}</span>
          </div>
        </div>

        {/* ── Property strip ───────────────────────────────────────── */}
        <div className="tm-props">
          <div className="tm-prop state-prop">
            <span className="l">{t('task.prop.state')}</span>
            <span className="v">
              <StatePill
                states={states}
                value={form.taskForm.boardColumn}
                onChange={(v) => form.setTaskForm((f) => ({ ...f, boardColumn: v }))}
                disabled={editing && !canEdit}
              />
            </span>
          </div>
          <div className="tm-prop">
            <span className="l">{t('task.prop.start')}</span>
            <span className="v">
              <span className="cal"><SvgCal /></span>
              <span className="date">{shortDateFromWire(form.taskForm.start_date)}</span>
              <span className="dur">
                · {form.taskForm.duration} {form.taskForm.durationUnit === 'HOUR' ? t('task.prop.duration_hours') : t('task.prop.duration_days')}
              </span>
            </span>
          </div>
          <div className="tm-prop progress-prop">
            <span className="l">{t('task.prop.progress')}</span>
            <span className="v">
              <div className="bar"><div className="fill" style={{ width: `${form.taskForm.progress}%` }}></div></div>
              <span className="pct">{form.taskForm.progress}%</span>
            </span>
          </div>
          <div className="tm-prop">
            <span className="l">{t('task.prop.priority')}</span>
            <span className="v">
              {(() => {
                const opts = priorityOptions(t);
                const o = opts.find((x) => x.key === form.taskForm.priority) ?? opts[0];
                return <span className={`pri-pill ${o.cls}`} style={{ cursor: 'default' }}><SvgFlag /> {o.label}</span>;
              })()}
            </span>
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────────────── */}
        <div className="tm-tabs">
          <button type="button"
            className={'tm-tab' + (form.taskModalTab === 'details' ? ' active' : '')}
            onClick={() => form.setTaskModalTab('details')}
          >
            <span className="ic"><SvgFile s={13} /></span>{t('task.tab.details')}
          </button>
          <button type="button"
            className={'tm-tab' + (form.taskModalTab === 'discussion' ? ' active' : '')}
            onClick={() => form.setTaskModalTab('discussion')}
          >
            <span className="ic"><SvgChat s={13} /></span>{t('task.tab.discussion')}
            <span className="n">{discussionCount}</span>
          </button>
          <button type="button"
            className={'tm-tab' + (form.taskModalTab === 'links' ? ' active' : '')}
            onClick={() => form.setTaskModalTab('links')}
          >
            <span className="ic"><SvgLink s={13} /></span>{t('task.tab.links')}
            <span className="n">{linkCount}</span>
          </button>
          {showFilesTab && (
            <button type="button"
              className={'tm-tab' + (form.taskModalTab === 'files' ? ' active' : '')}
              onClick={() => form.setTaskModalTab('files')}
            >
              <span className="ic"><SvgPaperclip s={13} /></span>{t('task.tab.files')}
              <span className="n">{fileCount}</span>
            </button>
          )}
        </div>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="tm-body">
          {form.taskFormError && (
            <div className="tm-rule-errors" style={{ marginBottom: 14 }}>
              <div className="ttl">{tc('errors.generic')}</div>
              <ul><li>{form.taskFormError}</li></ul>
            </div>
          )}
          {form.fieldRuleErrors.length > 0 && (
            <div className="tm-rule-errors">
              <div className="ttl">{t('states.rules.validation_title')}</div>
              <ul>{form.fieldRuleErrors.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </div>
          )}

          {form.taskModalTab === 'details' && (
            <form id={formId} onSubmit={form.handleTaskSubmit}>
              <div className="tm-details">
                {/* Col 1 — Description + Subtasks */}
                <div>
                  <div className="tm-block">
                    <div className="head"><SvgFile s={13} /> {t('task.section.description')}</div>
                    <textarea
                      className="tm-textarea"
                      value={form.taskForm.description}
                      onChange={(e) => form.setTaskForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder={t('task.desc_placeholder')}
                      disabled={editing && !canEdit}
                    />
                  </div>

                  {editing && (
                    <div className="tm-block">
                      <div className="head" style={{ display: 'flex' }}>
                        {t('task.section.subtasks')}
                        <span style={{ marginLeft: 8, fontSize: 11.5, color: 'var(--mute)', fontWeight: 400 }}>
                          · {t('task.subtasks.count', { done: subtasksDone, total: subtasks.length })}
                        </span>
                        {canCreate && (
                          <button
                            type="button"
                            className="tm-add-sub"
                            style={{ marginLeft: 'auto' }}
                            onClick={() => {
                              // Fecha o modal actual e re-abre em create com parentPublicId.
                              // O parent será informado pelo caller via re-open com parentPublicId.
                              window.dispatchEvent(new CustomEvent('awp:open-create-subtask', {
                                detail: { parentPublicId: initialValue!.publicId },
                              }));
                            }}
                          >
                            <SvgPlus s={11} /> {t('task.subtasks.add')}
                          </button>
                        )}
                      </div>
                      {subtasks.length === 0 && (
                        <div className="tm-empty">{t('task.subtasks.empty')}</div>
                      )}
                      {subtasks.map((s) => {
                        const sState = states.find((st) => st.publicId === s.boardColumn);
                        const done = sState?.systemKey === 'DONE';
                        const cls = stateClsFor(sState);
                        return (
                          <div
                            key={s.publicId}
                            className={'tm-sub-row' + (done ? ' done' : '')}
                            onClick={() => {
                              // Open subtask in edit mode via custom event handled by container.
                              window.dispatchEvent(new CustomEvent('awp:open-edit-task', { detail: { publicId: s.publicId } }));
                            }}
                          >
                            <div
                              className="ck"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (canEdit) void form.toggleTaskDone(s, !done);
                              }}
                              role="checkbox"
                              aria-checked={done}
                            />
                            <span className="nm">{s.text}</span>
                            <span className={`st-pill ${cls}`}>
                              <span className="dot"></span>
                              {resolveStateLabel(sState, t)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Col 2 — Schedule */}
                <div>
                  <div className="tm-block">
                    <div className="head"><SvgCal /> {t('task.section.schedule')}</div>
                    <div className="tm-field">
                      <label className="lbl">{t('task.field.start_date')}</label>
                      <div className="tm-input-wrap">
                        <span className="ic-l"><SvgCal /></span>
                        <DatePicker
                          className="tm-input icon-l"
                          value={form.taskForm.start_date}
                          onChange={(formatted) => {
                            // O backend espera sempre wire DHTMLX 'DD-MM-YYYY HH:mm'.
                            // Em modo DAY, o picker formata só 'd-m-Y' → completamos `00:00`.
                            const wire = form.taskForm.durationUnit === 'HOUR'
                              ? formatted
                              : (formatted ? `${formatted} 00:00` : '');
                            form.setTaskForm((f) => ({ ...f, start_date: wire }));
                          }}
                          format={form.taskForm.durationUnit === 'HOUR' ? 'd-m-Y H:i' : 'd-m-Y'}
                          enableTime={form.taskForm.durationUnit === 'HOUR'}
                          placeholder={form.taskForm.durationUnit === 'HOUR' ? 'DD-MM-YYYY HH:mm' : 'DD-MM-YYYY'}
                          disabled={editing && !canEdit}
                        />
                        {form.taskForm.start_date && (canEdit || !editing) && (
                          <span
                            className="ic-r"
                            title={tc('actions.clear')}
                            onClick={() => form.setTaskForm((f) => ({ ...f, start_date: '' }))}
                          >
                            <SvgX s={11} />
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
                      <div className="tm-field" style={{ flex: 1, marginBottom: 0 }}>
                        <label className="lbl">
                          {form.taskForm.durationUnit === 'HOUR'
                            ? t('task.field.duration_hours')
                            : t('task.field.duration_days')}
                        </label>
                        <input
                          className="tm-input"
                          type="number"
                          min={form.taskForm.durationUnit === 'HOUR' ? 0.25 : 1}
                          step={form.taskForm.durationUnit === 'HOUR' ? 0.25 : 1}
                          value={form.taskForm.duration}
                          onChange={(e) => form.setTaskForm((f) => ({ ...f, duration: e.target.value }))}
                          disabled={editing && !canEdit}
                        />
                      </div>
                      <div className="tm-field" style={{ marginBottom: 0 }}>
                        <label className="lbl">
                          {t('task.field.exact_time')}{' '}
                          <span className="tm-help" title={t('task.field.exact_time_hint')}><SvgInfo /></span>
                        </label>
                        <div className="tm-toggle-row" style={{ paddingTop: 5 }}>
                          <div
                            className={'tm-toggle' + (form.taskForm.durationUnit === 'HOUR' ? ' on' : '')}
                            onClick={() => {
                              if (editing && !canEdit) return;
                              form.setTaskForm((f) => ({
                                ...f,
                                durationUnit: f.durationUnit === 'HOUR' ? 'DAY' : 'HOUR',
                              }));
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="tm-field" style={{ marginTop: 14 }}>
                      <label className="lbl">{t('task.field.constraint')}</label>
                      <TMSelect<string>
                        value={form.taskForm.constraint_type}
                        onChange={(v) => form.setTaskForm((f) => ({ ...f, constraint_type: v }))}
                        options={constraintOptions(t)}
                        placeholder={t('task.constraint.none')}
                      />
                    </div>
                    {CONSTRAINT_NEEDS_DATE.has(form.taskForm.constraint_type) && (
                      <div className="tm-field" style={{ marginTop: 14 }}>
                        <label className="lbl">{t('task.field.constraint_date')}</label>
                        <DatePicker
                          className="tm-input"
                          value={form.taskForm.constraint_date}
                          onChange={(s) => form.setTaskForm((f) => ({ ...f, constraint_date: s }))}
                          format="d-m-Y"
                          enableTime={false}
                          placeholder="DD-MM-YYYY"
                          disabled={editing && !canEdit}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Col 3 — Configuration */}
                <div>
                  <div className="tm-block">
                    <div className="head"><SvgGear s={13} /> {t('task.section.configuration')}</div>
                    <div className="tm-field">
                      <label className="lbl">{t('task.field.type')}</label>
                      <TMSelect<string>
                        value={form.taskForm.type}
                        onChange={(v) => form.setTaskForm((f) => ({ ...f, type: v }))}
                        options={typeOptions(t)}
                      />
                    </div>
                    <div className="tm-field">
                      <label className="lbl">{t('task.field.parent_task')}</label>
                      <TMSelect<string>
                        value={form.taskForm.parent}
                        onChange={(v) => form.setTaskForm((f) => ({ ...f, parent: v }))}
                        options={parentOptions}
                        renderTrigger={(v) => {
                          if (v === '0') return <span className="ph">{t('task.field.parent_none')}</span>;
                          const tk = tasks.find((x) => String(x.id) === v);
                          return <span>{tk?.text ?? '—'}</span>;
                        }}
                      />
                    </div>
                    <div className="tm-field">
                      <label className="lbl">{t('task.field.priority')}</label>
                      <PriorityPill
                        value={form.taskForm.priority}
                        onChange={(v) => form.setTaskForm((f) => ({ ...f, priority: v }))}
                        t={t}
                      />
                    </div>
                    <div className="tm-field">
                      <label className="lbl">{t('task.field.progress_pct')}</label>
                      <input
                        className="tm-input"
                        type="number"
                        min={0}
                        max={100}
                        value={form.taskForm.progress}
                        onChange={(e) => form.setTaskForm((f) => ({
                          ...f,
                          progress: String(Math.max(0, Math.min(100, Number(e.target.value) || 0))),
                        }))}
                        disabled={editing && !canEdit}
                      />
                    </div>
                  </div>
                </div>

                {/* Col 4 — Assignees + Recent files + System */}
                <div className="tm-side">
                  <div className="tm-side-card">
                    <div className="head">
                      <span className="t"><SvgUsers /> {t('task.section.assignees')} <span className="tm-block-n">{form.taskOwnerIds.length}</span></span>
                    </div>
                    <div className="tm-assignee-list" ref={assigneeMenuRef} style={{ position: 'relative' }}>
                      {form.taskOwnerIds.map((pid) => {
                        /* `pid` é `TaskResourceNode.publicId` — resolvido via
                           `assigneesByPublicId` (mapa indexado por nodeId). */
                        const m = assigneesByPublicId.get(pid);
                        const name = m?.name ?? pid;
                        return (
                          <span key={pid} className="tm-asg">
                            <AvatarBubble
                              publicId={pid}
                              name={name}
                              avatarUrl={m?.avatarUrl ?? null}
                              avatarUpdatedAt={m?.avatarUpdatedAt ?? null}
                              size="sm"
                            />
                            <span className="nm">{name}</span>
                            {(canEdit || !editing) && (
                              <span
                                className="x"
                                onClick={() => form.setTaskOwnerIds((ids) => ids.filter((id) => id !== pid))}
                              >×</span>
                            )}
                          </span>
                        );
                      })}
                      {(canEdit || !editing) && (
                        <span
                          className="tm-add-tag"
                          style={{ alignSelf: 'center' }}
                          onClick={() => setShowAssigneeMenu((s) => !s)}
                        >+ {tc('actions.add')}</span>
                      )}
                      {showAssigneeMenu && (
                        <div
                          className="tm-tags-dropdown"
                          style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4 }}
                        >
                          {assigneeOptions.length === 0 && (
                            <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--mute)' }}>
                              {t('task.section.assignees_none_available')}
                            </div>
                          )}
                          {assigneeOptions.map((m) => (
                            <button
                              key={m.publicId}
                              type="button"
                              className="tm-tags-opt"
                              onClick={() => {
                                form.setTaskOwnerIds((ids) => [...ids, m.publicId]);
                                setShowAssigneeMenu(false);
                              }}
                            >{m.name}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {editing && showFilesTab && (
                    <div className="tm-side-card">
                      <div className="head">
                        <span className="t"><SvgPaperclip s={13} /> {t('task.section.recent_files')}</span>
                      </div>
                      {recentFiles.length === 0 ? (
                        <div className="tm-empty">—</div>
                      ) : (
                        recentFiles.map((f) => {
                          const kind = fileKindOf(f.originalName);
                          return (
                            <div key={f.publicId} className="tm-recent-row">
                              <div className="icn" style={{ background: kind.soft, color: kind.col }}>{kind.kind}</div>
                              <div className="nm" title={f.originalName}>{f.originalName}</div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {editing && initialValue && (
                    <div className="tm-side-card">
                      <div className="head">
                        <span className="t"><SvgInfo /> {t('task.section.system')}</span>
                      </div>
                      <div className="tm-sys-row">
                        <span className="l">{t('task.system.created_by')}</span>
                        <span className="v">
                          {initialValue.createdBy ? (
                            <>
                              <AvatarBubble publicId={initialValue.createdBy.publicId} name={initialValue.createdBy.name} size="sm" />
                              {initialValue.createdBy.name}
                            </>
                          ) : '—'}
                        </span>
                      </div>
                      <div className="tm-sys-row">
                        <span className="l">{t('task.system.created_at')}</span>
                        <span className="v">{formatMoment(initialValue.createdAt, tz)}</span>
                      </div>
                      <div className="tm-sys-row">
                        <span className="l">{t('task.system.updated_by')}</span>
                        <span className="v">
                          {initialValue.updatedBy ? (
                            <>
                              <AvatarBubble publicId={initialValue.updatedBy.publicId} name={initialValue.updatedBy.name} size="sm" />
                              {initialValue.updatedBy.name}
                            </>
                          ) : '—'}
                        </span>
                      </div>
                      <div className="tm-sys-row">
                        <span className="l">{t('task.system.updated_at')}</span>
                        <span className="v">{formatMoment(initialValue.updatedAt, tz)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          )}

          {form.taskModalTab === 'discussion' && (
            initialValue ? (
              <CommentsPanel
                projectPublicId={projectPublicId}
                entityType="TASK"
                entityPublicId={initialValue.publicId}
                canComment={canComment}
                currentUser={user ? { publicId: user.publicId, name: user.name } : null}
              />
            ) : (
              <div className="tm-empty-block">
                <div className="e-t">{t('task.discussion.create_first_title')}</div>
                <div className="e-s">{t('task.discussion.create_first_hint')}</div>
              </div>
            )
          )}

          {form.taskModalTab === 'links' && (
            initialValue ? (
              <div>
                <div className="tm-links-head">
                  <span className="t"><SvgLink /> {t('task.links.title')}</span>
                  <span className="n">{linkCount}</span>
                  <div className="grow"></div>
                  {canLinks && (
                    <button
                      type="button"
                      className="tm-btn-save"
                      style={{ padding: '7px 13px' }}
                      onClick={() => setShowLinkCreate(true)}
                    >
                      <SvgPlus s={12} /> {t('task.links.add')}
                    </button>
                  )}
                </div>

                {linkCount === 0 ? (
                  <div className="tm-empty-block">
                    <div className="e-t">{t('task.links.empty_title')}</div>
                    <div className="e-s">{t('task.links.empty_hint')}</div>
                  </div>
                ) : (
                  <div className="tm-dep-table">
                    <div className="tm-dep-section">
                      <span className="dl">{t('task.links.predecessors')}</span>
                      <span className="n">{predecessors.length}</span>
                    </div>
                    <div className="tm-dep-row head">
                      <span className="col">{t('task.links.col.source')}</span>
                      <span className="col">{t('task.links.col.target')}</span>
                      <span className="col">{t('task.links.col.type')}</span>
                      <span className="col actions-h">{t('task.links.col.actions')}</span>
                    </div>
                    {predecessors.length === 0 && <div className="tm-dep-empty">{t('task.links.empty_pred')}</div>}
                    {predecessors.map((l) => {
                      const src = tasksById.get(l.source);
                      return (
                        <div key={l.publicId} className="tm-dep-row">
                          <button
                            type="button"
                            className="tm-dep-task"
                            onClick={() => {
                              if (src) window.dispatchEvent(new CustomEvent('awp:open-edit-task', { detail: { publicId: src.publicId } }));
                            }}
                          >
                            <SvgCheck s={12} /> {src?.text ?? `#${l.source}`}
                          </button>
                          <span className="tm-dep-target">{t('task.links.this_task')}</span>
                          <span><span className={`tm-dep-type-pill type-${l.type}`}>{t(`task.links.type_${linkTypeKey(l.type)}`)}</span></span>
                          <span className="tm-dep-actions">
                            {canLinks && (
                              <button
                                type="button"
                                className="tm-dep-trash"
                                title={tc('actions.delete')}
                                onClick={async () => { await removeLink(l.publicId); }}
                              >
                                <SvgTrash s={13} />
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })}

                    <div className="tm-dep-section">
                      <span className="dl">{t('task.links.successors')}</span>
                      <span className="n">{successors.length}</span>
                    </div>
                    <div className="tm-dep-row head">
                      <span className="col">{t('task.links.col.source')}</span>
                      <span className="col">{t('task.links.col.target')}</span>
                      <span className="col">{t('task.links.col.type')}</span>
                      <span className="col actions-h">{t('task.links.col.actions')}</span>
                    </div>
                    {successors.length === 0 && <div className="tm-dep-empty">{t('task.links.empty_succ')}</div>}
                    {successors.map((l) => {
                      const tgt = tasksById.get(l.target);
                      return (
                        <div key={l.publicId} className="tm-dep-row">
                          <span className="tm-dep-target">{t('task.links.this_task')}</span>
                          <button
                            type="button"
                            className="tm-dep-task"
                            onClick={() => {
                              if (tgt) window.dispatchEvent(new CustomEvent('awp:open-edit-task', { detail: { publicId: tgt.publicId } }));
                            }}
                          >
                            <SvgCheck s={12} /> {tgt?.text ?? `#${l.target}`}
                          </button>
                          <span><span className={`tm-dep-type-pill type-${l.type}`}>{t(`task.links.type_${linkTypeKey(l.type)}`)}</span></span>
                          <span className="tm-dep-actions">
                            {canLinks && (
                              <button
                                type="button"
                                className="tm-dep-trash"
                                title={tc('actions.delete')}
                                onClick={async () => { await removeLink(l.publicId); }}
                              >
                                <SvgTrash s={13} />
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="tm-empty-block">
                <div className="e-t">{t('task.links.create_first_title')}</div>
                <div className="e-s">{t('task.links.create_first_hint')}</div>
              </div>
            )
          )}

          {form.taskModalTab === 'files' && showFilesTab && (
            initialValue ? (
              <FilesPanel
                projectPublicId={projectPublicId}
                taskPublicId={initialValue.publicId}
                canUpload={canFileUpload}
                canDelete={canFileDelete}
                canRename={canFileRename}
              />
            ) : (
              <div className="tm-empty-block">
                <div className="e-t">{t('task.files.create_first_title')}</div>
                <div className="e-s">{t('task.files.create_first_hint')}</div>
              </div>
            )
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────
            Os 3 botões (Eliminar / Cancelar / Salvar) renderizam SEMPRE
            que aplicável (Eliminar só em modo edit; Cancelar/Salvar em
            ambos os modos). Sem permissão → `disabled` em vez de hidden,
            para que o utilizador VEJA que o botão existe e perceba o
            gating. (DIFF cat. E vs a regra geral "UI esconde sem
            permissão" — autorizado pelo utilizador para o footer do
            TaskModal, Mai 2026, devido a relatos de "botões em falta"
            quando o problema era a condição render colapsar 2 buttons.) */}
        <div className="tm-footer">
          {editing && (
            <button
              type="button"
              className="tm-btn-delete"
              disabled={!canDelete}
              onClick={() => {
                if (!canDelete) return;
                form.setDeletingTask(initialValue);
                setShowDeleteModal(true);
              }}
            >
              <SvgTrash s={13} /> {tc('actions.delete')}
            </button>
          )}
          {form.taskFormError && <span className="err">{form.taskFormError}</span>}
          <div className="right">
            <button
              type="button"
              className="tm-btn-cancel"
              onClick={requestClose}
              disabled={form.taskFormLoading}
            >{tc('actions.cancel')}</button>
            <button
              type="submit"
              form={formId}
              className="tm-btn-save"
              disabled={form.taskFormLoading || (editing && !canEdit)}
            >
              <SvgCheck s={13} /> {form.taskFormLoading
                ? tc('messages.processing')
                : editing ? tc('actions.save') : t('task.btn.create')}
            </button>
          </div>
        </div>
      </div>

      {showLinkCreate && initialValue && (
        <LinkModal
          tasks={tasks}
          onClose={() => setShowLinkCreate(false)}
          onCreate={async (dto) => { await createLink(dto); }}
        />
      )}

      {showDeleteModal && form.deletingTask && (
        <ConfirmDialog
          /* Chaves seeded em `planning.json`: `task.delete_title` +
             `task.delete_confirm` (underscore, alinhado com o resto do
             namespace — `task.success_created`, `task.error_save`, etc.).
             O JSON tem `{{name}}` na interpolação. */
          title={t('task.delete_title')}
          message={t('task.delete_confirm', { name: form.deletingTask.text })}
          danger
          onCancel={() => { setShowDeleteModal(false); form.setDeletingTask(null); }}
          onConfirm={async () => {
            await form.handleDeleteTask();
            setShowDeleteModal(false);
            requestClose();
          }}
        />
      )}
    </>
  );
}

function linkTypeKey(wire: string): 'fs' | 'ss' | 'ff' | 'sf' {
  switch (wire) {
    case '0': return 'fs';
    case '1': return 'ss';
    case '2': return 'ff';
    case '3': return 'sf';
    default: return 'fs';
  }
}
