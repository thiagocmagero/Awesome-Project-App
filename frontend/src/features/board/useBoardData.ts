// Hook que compõe o bundle do Board a partir de dados já carregados pelo
// Planning (`usePlanningData`) e pelos Estados/Swimlanes
// (`usePlanningStates`). Faz o mapping para a shape do widget AwesomeKanban
// e expõe a lista de utilizadores do projecto para o `cardShape.users.values`.
//
// Recebe os inputs já hidratados (não fetcha nada) — alinhado com a página
// `PlanningPage` que carrega tudo numa única vez e partilha entre tabs.

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Card, Column, Row } from 'awesome-kanban';
import type { ITaskState, ITaskSwimlane } from '../planning/states-types';
import type { Task, ResourceNode, ProjectDetail } from '../planning/types';
import {
  stateToColumn,
  swimlaneToRow,
  taskToCard,
} from './mappers';
import type { BoardBundle, BoardUserOption } from './types';

interface UseBoardDataInput {
  tasks: Task[];
  states: ITaskState[];
  swimlanes: ITaskSwimlane[];
  project?: ProjectDetail | null;
  /**
   * Nós de recursos do Gantt (folhas = utilizadores/externos). Usados para
   * construir o mapa de avatares por resource-node publicId (que é o que
   * `task.owner_id` contém desde Maio 2026 — publicIds UUID do
   * `TaskResourceNode`, não publicIds de User).
   */
  resourceNodes: ResourceNode[];
  /** publicId do utilizador autenticado (passado ao widget como `currentUser`). */
  currentUserPublicId: string;
}

/**
 * Cor estável (mas não bonita) por publicId — fallback enquanto não chega
 * uma cor configurada. Mantém-se simples para evitar deps externas.
 */
function colorFor(id: string): string {
  const palette = ['#7c5cff', '#23b7e5', '#26bf94', '#f59e0b', '#3b82f6', '#ef4444', '#ec4899', '#10b981'];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function useBoardData({
  tasks,
  states,
  swimlanes,
  resourceNodes,
  currentUserPublicId,
}: UseBoardDataInput): BoardBundle {
  const { t } = useTranslation('planning');

  return useMemo(() => {
    // ── Filtrar tipos não suportados — milestones e projects não aparecem no board ──
    const boardTasks = tasks.filter(t => t.type !== 'project' && t.type !== 'milestone');

    // ── Lookup auxiliar: id numérico → publicId (para subtaskOf) ─────────────
    const idToPublicId = new Map<number, string>();
    for (const t of boardTasks) idToPublicId.set(t.id, t.publicId);

    // ── Lookup auxiliar: id numérico → texto da tarefa (para parentLabel) ────
    const idToText = new Map<number, string>();
    for (const t of boardTasks) idToText.set(t.id, t.text);

    // ── Contagem de subtarefas por pai (X/Y progress) ────────────────────────
    // Estados com type=FINAL = "concluído". Usados para calcular progressDone.
    const finalStatePublicIds = new Set(
      states.filter(s => s.type === 'FINAL').map(s => s.publicId)
    );
    const childCounts = new Map<number, { total: number; done: number }>();
    for (const task of boardTasks) {
      if (task.parent && task.parent !== 0) {
        const entry = childCounts.get(task.parent) ?? { total: 0, done: 0 };
        entry.total++;
        if (task.boardColumn && finalStatePublicIds.has(task.boardColumn)) {
          entry.done++;
        }
        childCounts.set(task.parent, entry);
      }
    }

    // ── Resolve label dos Estados (i18n via labelKey, ou label custom) ───────
    const resolveStateLabel = (s: ITaskState): string => {
      if (s.label) return s.label;
      if (s.labelKey) return t(s.labelKey);
      return '';
    };
    const resolveSwimlaneLabel = (sw: ITaskSwimlane): string => {
      if (sw.label) return sw.label;
      if (sw.labelKey) return t(sw.labelKey);
      return '';
    };

    // ── Columns ─────────────────────────────────────────────────────────────
    const columns: Column[] = [...states]
      .sort((a, b) => a.position - b.position)
      .map((s) => stateToColumn(s, resolveStateLabel));

    const fallbackColumnPublicId = columns.length > 0 ? String(columns[0].id) : '';

    // ── Rows (swimlanes) ────────────────────────────────────────────────────
    const rows: Row[] = [...swimlanes]
      .sort((a, b) => a.position - b.position)
      .map((sw) => swimlaneToRow(sw, resolveSwimlaneLabel));

    // Fallback para tarefas sem `boardSwimlane` quando há swimlanes definidas:
    // o widget esconde cards com rowId desconhecido, e cards com rowId=undefined
    // num quadro com rows não aparecem em nenhuma faixa. A swimlane primária
    // (`isPrimary=true`) recolhe estes órfãos. Sem primária, mantém-se undefined
    // — o BoardView limpa o rowId quando swimlanes estão off.
    const primarySwimlanePublicId = swimlanes.find((sw) => sw.isPrimary)?.publicId;

    // ── Cards (tasks) ───────────────────────────────────────────────────────
    // Ordenar por `boardPosition` ASC. O backend re-sequencia em cada `moveCard`
    // (ver `states.service.ts: moveCard`); sem este sort, o widget renderiza
    // pela ordem que o Prisma devolve (`id: asc`), o que faz com que após um
    // drag-drop o card "saltite" para outra posição na re-sincronização que
    // segue o POST. Tasks sem `boardPosition` (ainda não tocadas pelo board)
    // ficam no fim em `id` ascendente, preservando ordem de criação.
    const cards: Card[] = [...boardTasks]
      .sort((a, b) => {
        const ap = a.boardPosition;
        const bp = b.boardPosition;
        if (ap == null && bp == null) return a.id - b.id;
        if (ap == null) return 1;
        if (bp == null) return -1;
        return ap - bp;
      })
      .map((task) =>
        taskToCard(task, idToPublicId, fallbackColumnPublicId, primarySwimlanePublicId, idToText, childCounts),
      );

    // ── Users — indexados por resource-node publicId ────────────────────────
    // Desde Maio 2026 `task.owner_id` é array de publicIds (UUIDs) do
    // TaskResourceNode (não User.publicId). O KanbanCard faz lookup de
    // `card.users[i]` dentro de `cardShape.users.values` — o `id` aqui tem de
    // bater certo com o publicId que vai estar em `card.users`.
    const users: BoardUserOption[] = resourceNodes
      .filter((n) => !n.isGroup)       // só folhas (utilizadores / externos)
      .map((n) => ({
        id: n.id,
        label: n.text,
        color: colorFor(n.id),
        // `avatar` só está presente para nodes com `userId` (User com avatarUrl).
        // Externos sem userId mantêm-se com iniciais coloridas.
        avatar: n.avatarUrl ?? undefined,
      }));

    return {
      columns,
      rows,
      cards,
      users,
      currentUserId: currentUserPublicId,
    };
  }, [tasks, states, swimlanes, resourceNodes, currentUserPublicId, t]);
}
