// Componente principal do novo Board. Monta o widget AwesomeKanban com dados
// reais do projecto, regista handlers `api.on(...)` para sincronizar com o
// backend, e usa `api.intercept(...)` para aplicar permissões ao DnD.
//
// Histórico (Undo/Redo) é gerido por `useBoardHistory` (stack próprio com
// closures forward/inverse) — a flag `skipNextHandler` evita que mutações
// programáticas vindas do redo/undo disparem novamente os handlers.
//
// O widget é montado em modo UNCONTROLLED (default*) — controlled mode causa
// snap-back visual em reordens dentro da mesma coluna. Ver
// `frontend/src/features/kanban-demo/KanbanDemoView.tsx` linhas 1-9.

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AwesomeKanban,
  applyColumnReorder,
  applyRowReorder,
  defaultColumnMenuItems,
  type AwesomeKanbanApi,
  type CardMenuItem,
  type CardShape,
  type Column,
  type ColumnMenuCtx,
  type ColumnShape,
  type Id,
  type PriorityValue,
  type ReadonlyConfig,
} from 'awesome-kanban';

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getApiBase, apiFetch } from '../../lib/api';
import type { ITaskState, ITaskSwimlane } from '../planning/states-types';
import type { GanttTask, ProjectDetail, ResourceNode } from '../planning/types';
import {
  columnAddEventToPayload,
  columnUpdateEventToPayload,
  priorityToTask,
  rowAddEventToPayload,
  rowUpdateEventToPayload,
} from './mappers';
import { useBoardData } from './useBoardData';
import { useBoardHistory } from './useBoardHistory';
import type { BoardColorsConfig, BoardConfigData } from './types';

// ── Helper: aplica cores das colunas de sistema a partir da config ────────────

const SYS_KEY_TO_CONFIG: Record<string, keyof NonNullable<BoardColorsConfig['systemColumns']>> = {
  TODO:       'todo',
  INPROGRESS: 'inProgress',
  DONE:       'done',
};

const DEFAULT_SYSTEM_COLORS: Required<NonNullable<BoardColorsConfig['systemColumns']>> = {
  todo:       '#9ca3af',
  inProgress: '#7c5cff',
  done:       '#26bf94',
};

function applySystemColumnColors(columns: Column[], config: BoardConfigData): Column[] {
  const sysColors = config.colors?.systemColumns ?? {};
  return columns.map((col) => {
    const sk = col.data?.systemKey as string | undefined;
    if (!sk) return col;
    const configKey = SYS_KEY_TO_CONFIG[sk];
    if (!configKey) return col;
    const color = sysColors[configKey] ?? DEFAULT_SYSTEM_COLORS[configKey];
    return { ...col, color };
  });
}

export interface BoardViewApi {
  refresh: () => Promise<void>;
  search: (query: string) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /** Cria uma coluna nova via widget (abre o flow inline). */
  addColumn: () => void;
  /** Cria uma swimlane nova via widget. */
  addSwimlane: () => void;
}

interface BoardViewProps {
  projectPublicId: string;
  tasks: GanttTask[];
  states: ITaskState[];
  swimlanes: ITaskSwimlane[];
  project: ProjectDetail | null;
  resourceNodes: ResourceNode[];
  config: BoardConfigData;
  searchQuery: string;
  showSwimlanes: boolean;
  /** Sinaliza que tasks + states terminaram de carregar — o widget só monta após este flag. */
  dataReady: boolean;
  /** Função `canDo` resolvida para este projecto (ProjectAction → boolean). */
  canDo: (action: string) => boolean;
  /**
   * Refresh da camada Planning + States. Chamado após mutações para manter
   * Planning e Board consistentes.
   */
  onDataChanged: () => Promise<void>;
  /** Ref API exposta ao parent (PlanningPage) para search/undo/redo/etc. */
  apiHandleRef: MutableRefObject<BoardViewApi | null>;
  /** Callback para mudar canUndo/canRedo na UnifiedToolbar. */
  onHistoryChange: (canUndo: boolean, canRedo: boolean) => void;
  /**
   * Abre o `TaskModal` partilhado para CRIAR uma tarefa nova.
   * `boardColumnPublicId` pré-selecciona o estado e `parentPublicId` faz a
   * tarefa nascer como subtarefa.
   */
  onOpenCreateTask: (boardColumnPublicId?: string, parentPublicId?: string) => void;
  /** Abre o `TaskModal` partilhado para EDITAR a tarefa cujo publicId é dado. */
  onOpenEditTask: (taskPublicId: string, initialTab?: 'details' | 'comments') => void;
  /**
   * Pede ao parent (PlanningPage) para abrir o `DeleteTaskModal` partilhado.
   * Mesmo fluxo de confirmação usado pelo botão "Eliminar" da lista do
   * Planning (`useTaskForm.handleDeleteTask`) — mantém a UX coerente entre
   * vistas. O backend e a refresh do bundle ficam encapsulados dentro do
   * `handleDeleteTask` (chama `loadAll()` no fim).
   */
  onRequestDeleteTask: (taskPublicId: string) => void;
}

export function BoardView({
  projectPublicId,
  tasks,
  states,
  swimlanes,
  resourceNodes,
  config,
  searchQuery,
  showSwimlanes,
  dataReady,
  canDo,
  onDataChanged,
  apiHandleRef,
  onHistoryChange,
  onOpenCreateTask,
  onOpenEditTask,
  onRequestDeleteTask,
}: BoardViewProps) {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation('board');
  const { t: tc } = useTranslation('common');

  const apiRef = useRef<AwesomeKanbanApi | null>(null);
  // Off functions devolvidos por api.on() / api.intercept(). Chamados no cleanup
  // do effect de bind para desligar os listeners — em StrictMode o effect corre
  // 2× e o bus é preservado (useRef estável), pelo que sem isto cada listener
  // ficava registado em duplicado e cada evento (row:add, row:delete, etc.)
  // disparava 2× → swimlanes duplicadas + 2 toasts no delete.
  const handlerOffsRef = useRef<Array<() => void>>([]);
  // Trigger re-render quando o widget expõe a sua API — necessário para que o
  // effect de parse() corra com `apiRef.current` já não-null.
  const [apiBound, setApiBound] = useState(false);
  // skip flags por evento+id (count-based — múltiplos undos consecutivos podem
  // empilhar varios skips para o mesmo card).
  const skipNextHandler = useRef<Record<string, number>>({});
  // true durante a execução de parse() — suprime eventos re-emitidos pelo widget
  const isParsingRef = useRef(false);
  const initialDataRef = useRef<{
    columns: ReturnType<typeof useBoardData>['columns'];
    rows: ReturnType<typeof useBoardData>['rows'];
    cards: ReturnType<typeof useBoardData>['cards'];
  } | null>(null);

  const apiBase = getApiBase();

  // ── Bundle (mapeia domain → widget) ───────────────────────────────────────

  const bundle = useBoardData({
    tasks,
    states,
    swimlanes,
    resourceNodes,
    currentUserPublicId: user?.publicId ?? '',
  });

  // ── History stack ─────────────────────────────────────────────────────────

  const history = useBoardHistory();
  useEffect(() => {
    onHistoryChange(history.canUndo, history.canRedo);
  }, [history.canUndo, history.canRedo, onHistoryChange]);

  // ── Refs estáveis (evitam stale closures dentro de api.on) ────────────────

  const canDoRef = useRef(canDo);
  const onDataChangedRef = useRef(onDataChanged);
  const showToastRef = useRef(showToast);
  const tRef = useRef(t);
  const tcRef = useRef(tc);
  const tokenRef = useRef(token);
  const projectIdRef = useRef(projectPublicId);
  const historyPushRef = useRef(history.push);
  const onOpenCreateTaskRef = useRef(onOpenCreateTask);
  const onOpenEditTaskRef = useRef(onOpenEditTask);
  const onRequestDeleteTaskRef = useRef(onRequestDeleteTask);
  useEffect(() => { canDoRef.current = canDo; }, [canDo]);
  useEffect(() => { onDataChangedRef.current = onDataChanged; }, [onDataChanged]);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);
  useEffect(() => { tRef.current = t; }, [t]);
  useEffect(() => { tcRef.current = tc; }, [tc]);
  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { projectIdRef.current = projectPublicId; }, [projectPublicId]);
  useEffect(() => { historyPushRef.current = history.push; }, [history.push]);
  useEffect(() => { onOpenCreateTaskRef.current = onOpenCreateTask; }, [onOpenCreateTask]);
  useEffect(() => { onOpenEditTaskRef.current = onOpenEditTask; }, [onOpenEditTask]);
  useEffect(() => { onRequestDeleteTaskRef.current = onRequestDeleteTask; }, [onRequestDeleteTask]);

  // ── API helpers (chamam backend) ──────────────────────────────────────────

  const callApi = (path: string, init: RequestInit = {}): Promise<Response> => {
    return apiFetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenRef.current}`,
        ...(init.headers ?? {}),
      },
    });
  };

  const consumeSkip = (key: string): boolean => {
    const n = skipNextHandler.current[key] ?? 0;
    if (n > 0) {
      skipNextHandler.current[key] = n - 1;
      return true;
    }
    return false;
  };
  const queueSkip = (key: string) => {
    skipNextHandler.current[key] = (skipNextHandler.current[key] ?? 0) + 1;
  };

  // ── CardShape + Card menu items (incluindo "+ Subtarefa") ────────────────

  const priorityValues: PriorityValue[] = useMemo(() => {
    const colors = config.colors?.priority ?? {};
    return [
      { id: 'high',   label: t('priority.high'),   bg: colors.high ?? '#ef4444', fg: '#fff' },
      { id: 'medium', label: t('priority.medium'), bg: colors.medium ?? '#f59e0b', fg: '#fff' },
      { id: 'low',    label: t('priority.low'),    bg: colors.low ?? '#3b82f6', fg: '#fff' },
      { id: 'none',   label: t('priority.none'),   bg: colors.none ?? '#9ca3af', fg: '#fff' },
    ];
  }, [t, config.colors]);

  const cardMenuItems: CardMenuItem[] = useMemo(() => [
    {
      id: 'edit',
      text: t('card.edit'),
      icon: 'ri-pencil-line',
      onClick: ({ card }) => onOpenEditTaskRef.current(String(card.id)),
    },
    {
      id: 'add_subtask',
      text: t('card.add_subtask'),
      icon: 'ri-node-tree',
      onClick: ({ card }) => {
        if (!canDoRef.current('TASK_CREATE')) {
          showToastRef.current('warning', tcRef.current('errors.forbidden'));
          return;
        }
        onOpenCreateTaskRef.current(String(card.columnId), String(card.id));
      },
    },
    { id: 'sep', separator: true },
    {
      id: 'delete',
      text: t('card.delete'),
      icon: 'ri-delete-bin-line',
      destructive: true,
      // Abre o DeleteTaskModal partilhado (mesma confirmação da lista
      // Planning). O fluxo continua via `handleDeleteTask` no PlanningPage,
      // que faz API + loadAll() — o board re-parsa quando o `tasks` muda.
      onClick: ({ card }) => {
        if (!canDoRef.current('TASK_DELETE')) {
          showToastRef.current('warning', tcRef.current('errors.forbidden'));
          return;
        }
        onRequestDeleteTaskRef.current(String(card.id));
      },
    },
  ], [t]);

  const cardShape: CardShape = useMemo(() => ({
    progress: { show: config.behavior?.showProgress !== false },
    start_date: { show: config.behavior?.showDates !== false },
    end_date: { show: config.behavior?.showDates !== false },
    showSubtaskLink: config.behavior?.showSubtasks !== false,
    priority: { show: config.behavior?.showPriority !== false, values: priorityValues },
    users: {
      show: config.behavior?.showAssignees !== false,
      values: bundle.users.map((u) => ({ id: u.id, label: u.label, color: u.color })),
      maxCount: 3,
    },
    comments: { show: config.behavior?.showComments !== false },
    menu: { show: true, items: cardMenuItems },
    // Confirmação é nossa (DeleteTaskModal) — desligamos a do widget para
    // evitar duplo-modal. O fluxo do menu chama `onRequestDeleteTask`. Para
    // o atalho `Delete`, interceptamos `card:delete` mais abaixo e abrimos a
    // mesma modal.
    confirmDeletion: false,
  }), [config.behavior, priorityValues, bundle.users, cardMenuItems]);

  // ── ColumnShape (menu com delete desativado para colunas de sistema) ──────

  const columnShape: ColumnShape = useMemo(() => ({
    menu: {
      show: true,
      rightClick: true,
      items: (ctx: ColumnMenuCtx) =>
        defaultColumnMenuItems.map((item) => {
          if (item.id === 'add-card') {
            // Replace the builtin 'add-card' id with a custom non-builtin id so
            // handleMenuSelect's switch-case never fires the builtin flow
            // (api.addCard + api.openEditor). The onClick below takes full control.
            return {
              ...item,
              id: 'custom-add-task',
              onClick: ({ column }: { column: Column }) => {
                if (!canDoRef.current('TASK_CREATE')) {
                  showToastRef.current('warning', tcRef.current('errors.forbidden'));
                  return;
                }
                onOpenCreateTaskRef.current(String(column.id));
              },
            };
          }
          if (item.id === 'delete-column' && ctx.column.data?.isSystem) {
            return { ...item, disabled: true };
          }
          return item;
        }),
    },
    fixedHeaders: true,
    confirmDeletion: false,
    showCardCount: true,
  }), []);

  // ── Snapshot inicial (modo uncontrolled) ─────────────────────────────────
  // Capturado uma única vez quando: (1) dataReady=true (tasks + states
  // terminaram de carregar) e (2) há ≥ 1 coluna. Garante que o widget monta
  // com os cards reais — em uncontrolled mode, parse() após mount com
  // defaultCards=[] tem semântica frágil e não repõe os cards corretamente.
  if (dataReady && initialDataRef.current === null && bundle.columns.length > 0) {
    initialDataRef.current = {
      columns: applySystemColumnColors(bundle.columns, config),
      rows: bundle.rows,
      cards: bundle.cards,
    };
  }

  // ── Bind dos handlers — runs once after mount + retry se apiRef ainda null ─

  useEffect(() => {
    let cancelled = false;
    let raf = 0;

    const doBind = (): boolean => {
      const api = apiRef.current;
      if (!api) return false;
      handlerOffsRef.current = bindHandlers(api);
      // Trigger re-render para que o effect de parse() corra com apiRef pronta.
      setApiBound(true);
      return true;
    };

    if (!doBind()) {
      const loop = () => {
        if (cancelled) return;
        if (doBind()) return;
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      // Desliga todos os listeners para que a re-execução do effect (StrictMode
      // ou reciclagem futura) não acumule handlers duplicados no bus.
      handlerOffsRef.current.forEach((off) => off());
      handlerOffsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Refresh do widget quando bundle muda (parse — preserva DnD) ───────────

  const lastBundleSig = useRef<string>('');
  useEffect(() => {
    if (!apiRef.current || !apiBound) return;
    // Sig inclui rows (id+label), columns (id+label), cores de colunas sistema
    // e o flag showSwimlanes — sem o último, quando o auto-activate de swimlanes
    // (PlanningPage) flipa `showSwimlanes` num render posterior ao da chegada das
    // rows novas, o `bundle` não muda → sig empata → parse() não corre → widget
    // continua com `rows: []` da chamada anterior.
    const sc = config.colors?.systemColumns;
    const sysColorSig = `${sc?.todo ?? ''}:${sc?.inProgress ?? ''}:${sc?.done ?? ''}`;
    const sig =
      `sw:${showSwimlanes ? 1 : 0}|`
      + `sc:${sysColorSig}|`
      + `cols:${bundle.columns.map((c) => `${c.id}:${c.label ?? ''}`).join(',')}|`
      + `rows:${bundle.rows.map((r) => `${r.id}:${r.label ?? ''}`).join(',')}|`
      + `cards:${bundle.cards.map((c) => `${c.id}:${c.columnId}:${c.rowId ?? ''}:${c.label}:${c.subtaskOf ?? ''}`).join(',')}`;
    if (sig === lastBundleSig.current) return;
    lastBundleSig.current = sig;
    isParsingRef.current = true;
    apiRef.current.parse({
      columns: applySystemColumnColors(bundle.columns, config),
      rows: showSwimlanes ? bundle.rows : [],
      // quando swimlanes estão escondidas, remover rowId dos cards para que fiquem
      // visíveis (card com rowId sem row correspondente fica invisível no widget)
      cards: showSwimlanes
        ? bundle.cards
        : bundle.cards.map((c) => ({ ...c, rowId: undefined })),
    });
    // reset after 2 rAF frames — Svelte may defer events to next render cycle(s)
    requestAnimationFrame(() => requestAnimationFrame(() => { isParsingRef.current = false; }));
  }, [bundle, showSwimlanes, apiBound, config.colors?.systemColumns]);

  // ── Search reactivo ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!apiRef.current || !apiBound) return;
    apiRef.current.setConfig({ searchQuery });
  }, [searchQuery, apiBound]);

  // ── Visual config reactivo (density / accent / priority style / primary) ──

  useEffect(() => {
    if (!apiRef.current || !apiBound || !config.visual) return;
    apiRef.current.setConfig({
      density: config.visual.density,
      primaryColor: config.visual.primaryColor,
      columnAccentStyle: config.visual.columnAccentStyle,
      priorityStyle: config.visual.priorityStyle,
    });
  }, [config.visual, apiBound]);

  // ── Permissões reactivas (DnD + edit) ─────────────────────────────────────

  useEffect(() => {
    if (!apiRef.current || !apiBound) return;
    const ro: ReadonlyConfig = {
      cards: {
        add:    !canDo('TASK_CREATE'),
        edit:   !canDo('TASK_EDIT'),
        delete: !canDo('TASK_DELETE'),
        move:   !canDo('TASK_EDIT'),
      },
      columns: {
        add:    !canDo('STATE_MANAGE'),
        edit:   !canDo('STATE_MANAGE'),
        delete: !canDo('STATE_MANAGE'),
        move:   !canDo('STATE_MANAGE'),
      },
      rows: {
        add:    !canDo('STATE_MANAGE'),
        edit:   !canDo('STATE_MANAGE'),
        delete: !canDo('STATE_MANAGE'),
        move:   !canDo('STATE_MANAGE'),
      },
    };
    apiRef.current.setConfig({ readonly: ro });
  }, [canDo, apiBound]);

  // ── Bind handlers (intercepts + on) ───────────────────────────────────────

  function bindHandlers(api: AwesomeKanbanApi): Array<() => void> {
    const offs: Array<() => void> = [];
    // ── Permission intercepts ────────────────────────────────────────────
    offs.push(api.intercept('card:move', () => {
      if (!canDoRef.current('TASK_EDIT')) {
        showToastRef.current('warning', tcRef.current('errors.forbidden'));
        return false;
      }
      return true;
    }));
    offs.push(api.intercept('card:update', () => canDoRef.current('TASK_EDIT')));
    // Intercept que cancela o delete nativo do widget (atalho Delete) e
    // abre a nossa modal de confirmação. Sem permissão, mostra toast e
    // cancela. Com permissão, desvia para a modal e cancela à mesma — a
    // execução do API call acontece dentro do `handleDeleteTask`.
    offs.push(api.intercept('card:delete', (e) => {
      if (!canDoRef.current('TASK_DELETE')) {
        showToastRef.current('warning', tcRef.current('errors.forbidden'));
        return false;
      }
      // `card:delete` pode trazer um único id ou array (multi-select). Para
      // multi não temos UI de confirmação dedicada; abrimos a modal só com
      // o primeiro como aproximação simples (raro neste fluxo).
      const id = Array.isArray(e.id) ? e.id[0] : e.id;
      if (id !== undefined) onRequestDeleteTaskRef.current(String(id));
      return false;
    }));
    offs.push(api.intercept('column:add', () => canDoRef.current('STATE_MANAGE')));
    offs.push(api.intercept('column:update', () => canDoRef.current('STATE_MANAGE')));
    offs.push(api.intercept('column:delete', () => canDoRef.current('STATE_MANAGE')));
    offs.push(api.intercept('column:move', () => canDoRef.current('STATE_MANAGE')));
    offs.push(api.intercept('row:add', () => canDoRef.current('STATE_MANAGE')));
    offs.push(api.intercept('row:update', () => canDoRef.current('STATE_MANAGE')));
    offs.push(api.intercept('row:delete', () => canDoRef.current('STATE_MANAGE')));
    offs.push(api.intercept('row:move', () => canDoRef.current('STATE_MANAGE')));

    // ── Card move (drag) ─────────────────────────────────────────────────
    offs.push(api.on('card:move', async (e) => {
      if (consumeSkip(`card:move:${e.id}`)) return;
      const cardId = String(e.id);
      const fromColumnId = String(e.fromColumnId);
      const toColumnId = String(e.toColumnId);
      const fromRowId = e.fromRowId == null ? null : String(e.fromRowId);
      const toRowId = e.toRowId == null ? null : String(e.toRowId);

      // Posição calculada a partir do `before`/`after` que o widget entrega
      // (fonte canónica do drop visual). Excluir apenas o próprio card a mover.
      //
      // NOTA: NÃO filtrar `!c.subtaskOf`. Uma subtarefa cujo pai esteja noutra
      // coluna torna-se top-level visualmente nesta coluna e o widget pode
      // entregá-la como `before`/`after` legítimo. Filtrar partia o `findIndex`
      // e o fallback caía em `position = 0`. Além disso, o backend re-sequencia
      // por `boardColumnId` (sem filtrar subtarefas) — manter os dois lados
      // alinhados garante coerência.
      const state = api.getState();
      const siblings = state.cards.filter((c) =>
        String(c.columnId) === toColumnId
        && (toRowId == null || String(c.rowId ?? '') === String(toRowId ?? ''))
        && String(c.id) !== cardId,
      );
      let position: number;
      if (e.before !== undefined) {
        const idx = siblings.findIndex((c) => String(c.id) === String(e.before));
        position = idx >= 0 ? idx : 0;
      } else if (e.after !== undefined) {
        const idx = siblings.findIndex((c) => String(c.id) === String(e.after));
        position = idx >= 0 ? idx + 1 : siblings.length;
      } else {
        // Sem âncora → drop em coluna/swimlane vazia (ou no fim).
        position = siblings.length;
      }

      const projectId = projectIdRef.current;

      const doMove = async (
        targetColumn: string, targetRow: string | null, targetPos: number,
      ): Promise<void> => {
        const r = await callApi(
          `/projects/${projectId}/planning/tasks/${cardId}/state`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              stateId: targetColumn,
              position: targetPos,
              swimlaneId: targetRow,
            }),
          },
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      };

      try {
        await doMove(toColumnId, toRowId, position);
        await onDataChangedRef.current();

        historyPushRef.current({
          label: 'card:move',
          forward: async () => {
            await doMove(toColumnId, toRowId, position);
            queueSkip(`card:move:${cardId}`);
            api.moveCard(cardId, { columnId: toColumnId, rowId: toRowId ?? undefined });
            await onDataChangedRef.current();
          },
          inverse: async () => {
            await doMove(fromColumnId, fromRowId, 0);
            queueSkip(`card:move:${cardId}`);
            api.moveCard(cardId, { columnId: fromColumnId, rowId: fromRowId ?? undefined });
            await onDataChangedRef.current();
          },
        });
      } catch (err) {
        console.error('[BoardView] card:move failed:', err);
        showToastRef.current('danger', tRef.current('errors.move_failed'));
        queueSkip(`card:move:${cardId}`);
        api.moveCard(cardId, { columnId: fromColumnId, rowId: fromRowId ?? undefined });
      }
    }));

    // ── Card update (label, priority, dates, progress, assignees) ────────
    offs.push(api.on('card:update', async (e) => {
      if (consumeSkip(`card:update:${e.id}`)) return;
      const cardId = String(e.id);
      const projectId = projectIdRef.current;

      const payload: Record<string, unknown> = {};
      if ('label' in e.patch && typeof e.patch.label === 'string') payload.text = e.patch.label;
      if ('priority' in e.patch) payload.priority = priorityToTask(e.patch.priority as string);
      if ('progress' in e.patch && typeof e.patch.progress === 'number') {
        payload.progress = e.patch.progress / 100;
      }
      if ('users' in e.patch && Array.isArray(e.patch.users)) {
        payload.ownerIds = (e.patch.users as Id[]).map(String);
      }

      if (Object.keys(payload).length === 0) return;

      try {
        const r = await callApi(`/projects/${projectId}/planning/tasks/${cardId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        showToastRef.current('success', tRef.current('success.card_updated'));
        await onDataChangedRef.current();
      } catch (err) {
        console.error('[BoardView] card:update failed:', err);
        showToastRef.current('danger', tRef.current('error.save'));
      }
    }));

    // ── Card delete ──────────────────────────────────────────────────────
    offs.push(api.on('card:delete', async (e) => {
      const ids = Array.isArray(e.id) ? e.id.map(String) : [String(e.id)];
      const projectId = projectIdRef.current;
      try {
        await Promise.all(ids.map((id) =>
          callApi(`/projects/${projectId}/planning/tasks/${id}`, { method: 'DELETE' }),
        ));
        showToastRef.current('success', tRef.current('success.card_deleted'));
        await onDataChangedRef.current();
      } catch (err) {
        console.error('[BoardView] card:delete failed:', err);
        showToastRef.current('danger', tRef.current('error.save'));
      }
    }));

    // ── Card click / double-click → abre TaskModal de edição ─────────────
    offs.push(api.on('card:click', (e) => {
      onOpenEditTaskRef.current(String(e.card.id));
    }));
    offs.push(api.on('card:doubleclick', (e) => {
      onOpenEditTaskRef.current(String(e.card.id));
    }));

    // ── Column add ───────────────────────────────────────────────────────
    offs.push(api.on('column:add', async (e) => {
      if (isParsingRef.current) return;
      const projectId = projectIdRef.current;
      const payload = columnAddEventToPayload(e.column);
      try {
        const r = await callApi(`/projects/${projectId}/planning/states`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        showToastRef.current('success', tRef.current('success.column_added'));
        await onDataChangedRef.current();
      } catch (err) {
        console.error('[BoardView] column:add failed:', err);
        showToastRef.current('danger', tRef.current('errors.load_failed'));
      }
    }));

    // ── Column update ────────────────────────────────────────────────────
    offs.push(api.on('column:update', async (e) => {
      if (isParsingRef.current) return;
      const projectId = projectIdRef.current;
      const payload = columnUpdateEventToPayload(e.patch);
      try {
        const r = await callApi(
          `/projects/${projectId}/planning/states/${String(e.id)}`,
          { method: 'PATCH', body: JSON.stringify(payload) },
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        await onDataChangedRef.current();
      } catch (err) {
        console.error('[BoardView] column:update failed:', err);
        showToastRef.current('danger', tRef.current('error.save'));
      }
    }));

    // ── Column delete ────────────────────────────────────────────────────
    offs.push(api.on('column:delete', async (e) => {
      if (isParsingRef.current) return;
      const projectId = projectIdRef.current;
      try {
        const r = await callApi(
          `/projects/${projectId}/planning/states/${String(e.id)}`,
          { method: 'DELETE', body: JSON.stringify({}) },
        );
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.message ?? `HTTP ${r.status}`);
        }
        showToastRef.current('success', tRef.current('success.column_deleted'));
        await onDataChangedRef.current();
      } catch (err) {
        console.error('[BoardView] column:delete failed:', err);
        showToastRef.current('danger', tRef.current('errors.reorder_failed'));
      }
    }));

    // ── Column move (reorder) ────────────────────────────────────────────
    // CRÍTICO: `bus.emit('column:move', ...)` é síncrono e dispara ANTES do
    // React fazer commit do `setColumns(result)` que ocorreu dentro de
    // `api.moveColumn`. Por isso `api.getState().columns` ainda devolve a
    // ordem ANTIGA neste handler. Usar `applyColumnReorder` para reaplicar
    // o `before`/`after` do evento sobre o snapshot actual e obter a ordem
    // correcta a enviar para o backend.
    offs.push(api.on('column:move', async (e) => {
      if (isParsingRef.current) return;
      const projectId = projectIdRef.current;
      const reordered = applyColumnReorder(api.getState().columns, e);
      const orderedIds = reordered.map((c) => String(c.id));
      try {
        const r = await callApi(`/projects/${projectId}/planning/states/reorder`, {
          method: 'PATCH',
          body: JSON.stringify({ orderedPublicIds: orderedIds }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        showToastRef.current('success', tRef.current('success.columns_reordered'));
        await onDataChangedRef.current();
      } catch (err) {
        console.error('[BoardView] column:move failed:', err);
        showToastRef.current('danger', tRef.current('errors.reorder_failed'));
      }
    }));

    // ── Row (swimlane) add ───────────────────────────────────────────────
    offs.push(api.on('row:add', async (e) => {
      if (isParsingRef.current) return; // triggered by parse() — not a user action
      const projectId = projectIdRef.current;
      const payload = rowAddEventToPayload(e.row);
      try {
        const r = await callApi(`/projects/${projectId}/planning/swimlanes`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        showToastRef.current('success', tRef.current('success.swimlane_added'));
        await onDataChangedRef.current();
      } catch (err) {
        console.error('[BoardView] row:add failed:', err);
        showToastRef.current('danger', tRef.current('swimlane.errors.save_failed'));
      }
    }));

    // ── Row update ───────────────────────────────────────────────────────
    offs.push(api.on('row:update', async (e) => {
      if (isParsingRef.current) return;
      const projectId = projectIdRef.current;
      const payload = rowUpdateEventToPayload(e.patch);
      try {
        const r = await callApi(
          `/projects/${projectId}/planning/swimlanes/${String(e.id)}`,
          { method: 'PATCH', body: JSON.stringify(payload) },
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        await onDataChangedRef.current();
      } catch (err) {
        console.error('[BoardView] row:update failed:', err);
        showToastRef.current('danger', tRef.current('swimlane.errors.save_failed'));
      }
    }));

    // ── Row delete ───────────────────────────────────────────────────────
    offs.push(api.on('row:delete', async (e) => {
      if (isParsingRef.current) return;
      const projectId = projectIdRef.current;
      try {
        const r = await callApi(
          `/projects/${projectId}/planning/swimlanes/${String(e.id)}`,
          { method: 'DELETE' },
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        showToastRef.current('success', tRef.current('swimlane.success.deleted'));
        await onDataChangedRef.current();
      } catch (err) {
        console.error('[BoardView] row:delete failed:', err);
        showToastRef.current('danger', tRef.current('swimlane.errors.delete_failed'));
      }
    }));

    // ── Row move (reorder) ───────────────────────────────────────────────
    // Mesmo padrão de stale-state que `column:move`: emit síncrono pré-commit.
    offs.push(api.on('row:move', async (e) => {
      if (isParsingRef.current) return;
      const projectId = projectIdRef.current;
      const reordered = applyRowReorder(api.getState().rows, e);
      const orderedIds = reordered.map((r) => String(r.id));
      try {
        const r = await callApi(`/projects/${projectId}/planning/swimlanes/reorder`, {
          method: 'PATCH',
          body: JSON.stringify({ orderedPublicIds: orderedIds }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        showToastRef.current('success', tRef.current('swimlane.success.reordered'));
        await onDataChangedRef.current();
      } catch (err) {
        console.error('[BoardView] row:move failed:', err);
        showToastRef.current('danger', tRef.current('errors.reorder_failed'));
      }
    }));

    // ── Row collapse (per-user state) ────────────────────────────────────
    offs.push(api.on('row:collapse', async (e) => {
      const projectId = projectIdRef.current;
      try {
        await callApi(
          `/projects/${projectId}/planning/swimlanes/${String(e.id)}/collapsed`,
          { method: 'PATCH', body: JSON.stringify({ collapsed: e.collapsed }) },
        );
      } catch (err) {
        console.error('[BoardView] row:collapse failed:', err);
      }
    }));

    return offs;
  }

  // ── API exposta ao parent ─────────────────────────────────────────────────

  useEffect(() => {
    apiHandleRef.current = {
      refresh: async () => {
        await onDataChangedRef.current();
      },
      search: (query: string) => {
        apiRef.current?.setConfig({ searchQuery: query });
      },
      undo: async () => {
        try {
          await history.undo();
        } catch (err) {
          console.error('[BoardView] undo failed:', err);
          showToastRef.current('danger', tRef.current('errors.undo_failed'));
        }
      },
      redo: async () => {
        try {
          await history.redo();
        } catch (err) {
          console.error('[BoardView] redo failed:', err);
          showToastRef.current('danger', tRef.current('errors.redo_failed'));
        }
      },
      canUndo: () => history.canUndo,
      canRedo: () => history.canRedo,
      addColumn: () => {
        // Adicionar coluna passa pelo flow do widget — emite `column:add` que
        // o nosso handler persiste em `POST /states`.
        if (!apiRef.current) return;
        apiRef.current.addColumn({ column: { label: tRef.current('modal.create_column') } });
      },
      addSwimlane: () => {
        if (!apiRef.current) return;
        apiRef.current.addRow({ row: { label: tRef.current('swimlane.create_title') } });
      },
    };
    return () => {
      apiHandleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.canUndo, history.canRedo]);

  // ── Render ────────────────────────────────────────────────────────────────

  // Aguarda primeiro bundle não-vazio antes de mountar o widget — evita o
  // bug de cards não aparecerem quando AwesomeKanban é mounted com `defaultCards = []`.
  if (!initialDataRef.current) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner-border text-primary me-2" />
        <span className="text-muted">{tc('messages.loading')}</span>
      </div>
    );
  }

  return (
    // Sem scroll interno — o widget cresce com o conteúdo e a página inteira
    // (viewWrapperRef em PlanningPage) trata da rolagem. Sem flex:1/minHeight:0
    // para que .ak-board possa crescer naturalmente além do viewport em fullscreen.
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <AwesomeKanban
          apiRef={apiRef}
          defaultColumns={initialDataRef.current.columns}
          defaultRows={showSwimlanes ? initialDataRef.current.rows : []}
          defaultCards={initialDataRef.current.cards}
          editor={false}
          currentUser={bundle.currentUserId || undefined}
          density={config.visual?.density}
          primaryColor={config.visual?.primaryColor}
          columnAccentStyle={config.visual?.columnAccentStyle}
          priorityStyle={config.visual?.priorityStyle}
          cardShape={cardShape}
          columnShape={columnShape}
          history={false}
          searchQuery={searchQuery}
          readonly={{
            cards: {
              add:    !canDo('TASK_CREATE'),
              edit:   !canDo('TASK_EDIT'),
              delete: !canDo('TASK_DELETE'),
              move:   !canDo('TASK_EDIT'),
            },
            columns: {
              add:    !canDo('STATE_MANAGE'),
              edit:   !canDo('STATE_MANAGE'),
              delete: !canDo('STATE_MANAGE'),
              move:   !canDo('STATE_MANAGE'),
            },
            rows: {
              add:    !canDo('STATE_MANAGE'),
              edit:   !canDo('STATE_MANAGE'),
              delete: !canDo('STATE_MANAGE'),
              move:   !canDo('STATE_MANAGE'),
            },
          }}
          onAddCard={(columnId, _rowId) => {
            if (!canDoRef.current('TASK_CREATE')) {
              showToastRef.current('warning', tcRef.current('errors.forbidden'));
              return;
            }
            onOpenCreateTaskRef.current(String(columnId));
          }}
          onAddSubtask={({ cardId, columnId }) => {
            if (!canDoRef.current('TASK_CREATE')) {
              showToastRef.current('warning', tcRef.current('errors.forbidden'));
              return;
            }
            onOpenCreateTaskRef.current(
              columnId ? String(columnId) : undefined,
              String(cardId),
            );
          }}
          onCommentClick={({ cardId }) => {
            onOpenEditTaskRef.current(String(cardId), 'comments');
          }}
        />
      </div>
    </div>
  );
}
