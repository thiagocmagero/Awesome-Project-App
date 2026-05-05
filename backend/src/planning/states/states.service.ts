import { HttpStatus, Injectable } from '@nestjs/common';
import { BoardColumnType, EntityType, InviteStatus, Status } from '@prisma/client';
import { AppException } from '../../common/exceptions/app.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBoardColumnDto } from './dto/create-board-column.dto';
import { UpdateBoardColumnDto } from './dto/update-board-column.dto';
import { ReorderColumnsDto } from './dto/reorder-columns.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { DeleteBoardColumnDto } from './dto/delete-board-column.dto';
import { CreateBoardSwimlaneDto } from './dto/create-board-swimlane.dto';
import { UpdateBoardSwimlaneDto } from './dto/update-board-swimlane.dto';
import { ReorderSwimlanesDto } from './dto/reorder-swimlanes.dto';

/**
 * StatesService — gere os Estados (colunas) e Swimlanes do projecto. Substitui o
 * antigo BoardService (Abril 2026); a tabela DB continua a chamar-se BoardColumn
 * mas o conceito é agora Planning. Métodos board-only (`getBoard`, `assignCard`,
 * `applyOptimistic*`) foram removidos; só permanecem os que `PlanningStatesController`,
 * `PlanningSwimlanesController` e `PlanningController` ainda invocam.
 */
const SYSTEM_COLUMNS = [
  { systemKey: 'TODO',       type: BoardColumnType.INITIAL,       position: 0 },
  { systemKey: 'INPROGRESS', type: BoardColumnType.INTERMEDIATE,  position: 1 },
  { systemKey: 'DONE',       type: BoardColumnType.FINAL,         position: 2 },
];

@Injectable()
export class StatesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async resolveProjectId(projectPublicId: string): Promise<number> {
    const project = await this.prisma.project.findUnique({
      where: { publicId: projectPublicId },
      select: { id: true },
    });
    if (!project) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);
    return project.id;
  }

  private async resolveTaskId(taskPublicId: string, projectId: number): Promise<number> {
    const task = await this.prisma.ganttTask.findFirst({
      where: { publicId: taskPublicId, projectId },
      select: { id: true },
    });
    if (!task) throw new AppException('TASK_NOT_FOUND', HttpStatus.NOT_FOUND);
    return task.id;
  }

  private async resolveColumnId(columnPublicId: string, projectId: number): Promise<number> {
    const col = await this.prisma.boardColumn.findFirst({
      where: { publicId: columnPublicId, projectId, status: Status.ACTIVE },
      select: { id: true },
    });
    if (!col) throw new AppException('COLUMN_NOT_FOUND', HttpStatus.NOT_FOUND);
    return col.id;
  }

  /** Mapeia uma row de BoardSwimlane para o formato devolvido pela API. */
  private mapSwimlaneRow(
    sw: { publicId: string; label: string | null; labelKey: string | null; isPrimary: boolean; color: string | null; position: number },
    collapsed = false,
  ) {
    return {
      publicId:  sw.publicId,
      label:     sw.label,
      labelKey:  sw.labelKey,
      isPrimary: sw.isPrimary,
      color:     sw.color,
      position:  sw.position,
      collapsed,
    };
  }

  private async resolveSwimlaneId(swimlanePublicId: string, projectId: number): Promise<number> {
    const sw = await this.prisma.boardSwimlane.findFirst({
      where: { publicId: swimlanePublicId, projectId, status: Status.ACTIVE },
      select: { id: true },
    });
    if (!sw) throw new AppException('SWIMLANE_NOT_FOUND', HttpStatus.NOT_FOUND);
    return sw.id;
  }

  /**
   * Garante que os 3 estados base existem para o projecto.
   * Chamado em getBoard() — idempotente.
   */
  private async ensureSystemColumns(projectId: number): Promise<void> {
    for (const col of SYSTEM_COLUMNS) {
      await this.prisma.boardColumn.upsert({
        where: {
          // Upsert por (projectId, systemKey) — precisamos de um compound unique
          // Não existe no schema, então usamos findFirst + create condicional
          // Workaround: unique via @@unique([projectId, systemKey]) — ver schema
          // Como não temos esse @@unique, usamos findFirst + createIfNotExists
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          publicId: `__system_${projectId}_${col.systemKey}__` as any, // não existe → sempre cria
        },
        update: {},
        create: {
          projectId,
          systemKey: col.systemKey,
          type: col.type,
          isSystem: true,
          position: col.position,
          label: null,
          status: Status.ACTIVE,
        },
      }).catch(async () => {
        // Se o upsert falhar (publicId inválido), verificar se já existe
        const existing = await this.prisma.boardColumn.findFirst({
          where: { projectId, systemKey: col.systemKey, status: Status.ACTIVE },
        });
        if (!existing) {
          await this.prisma.boardColumn.create({
            data: {
              projectId,
              systemKey: col.systemKey,
              type: col.type,
              isSystem: true,
              position: col.position,
              label: null,
              status: Status.ACTIVE,
            },
          });
        }
      });
    }
  }

  // ── GET /board ────────────────────────────────────────────────────────────────

  async getBoard(projectPublicId: string, requestingUserId: number) {
    const projectId = await this.resolveProjectId(projectPublicId);

    // Garantir estados base
    const existingSystemCols = await this.prisma.boardColumn.count({
      where: { projectId, isSystem: true, status: Status.ACTIVE },
    });
    if (existingSystemCols < 3) {
      await this.initSystemColumns(projectId);
    }

    // Buscar colunas activas ordenadas por posição
    const rawColumns = await this.prisma.boardColumn.findMany({
      where: { projectId, status: Status.ACTIVE },
      orderBy: { position: 'asc' },
      select: {
        id: true,       // necessário para identificar colunas FINAL na agregação de subtarefas
        publicId: true,
        label: true,
        systemKey: true,
        type: true,
        isSystem: true,
        position: true,
        color: true,
        wipLimit: true,
      },
    });

    // Computar labelKey a partir de systemKey — namespace `planning` (Abril 2026 — antes era `board`).
    const columns = rawColumns.map((col) => ({
      ...col,
      labelKey: col.systemKey ? `states.${col.systemKey.toLowerCase()}` : null,
    }));

    // IDs internos das colunas de tipo FINAL (para calcular subtarefas concluídas)
    const finalColumnInternalIds = new Set(
      rawColumns.filter((c) => c.type === BoardColumnType.FINAL).map((c) => c.id),
    );

    // Índice columnType → publicId para auto-posicionar tarefas sem boardColumnId
    // (usa a primeira coluna de cada tipo encontrada, por ordem de posição)
    const columnByType = new Map<BoardColumnType, string>();
    for (const col of rawColumns) {
      if (!columnByType.has(col.type)) {
        columnByType.set(col.type, col.publicId);
      }
    }

    // Swimlanes do projecto (com estado collapsed resolvido para o utilizador actual)
    const rawSwimlanes = await this.prisma.boardSwimlane.findMany({
      where: { projectId, status: Status.ACTIVE },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        publicId: true,
        label: true,
        labelKey: true,
        isPrimary: true,
        color: true,
        position: true,
        userStates: {
          where: { userId: requestingUserId },
          select: { collapsed: true },
        },
      },
    });
    const swimlanes = rawSwimlanes.map((sw) => this.mapSwimlaneRow(sw, sw.userStates[0]?.collapsed ?? false));

    // Buscar tarefas do tipo 'task' (inclui pais e subtarefas — o frontend filtra pelo toggle)
    const tasks = await this.prisma.ganttTask.findMany({
      where: { projectId, type: 'task' },
      select: {
        publicId: true,
        text: true,
        type: true,
        startDate: true,
        duration: true,
        progress: true,
        priority: true,
        boardColumnId: true,
        boardPosition: true,
        boardColumn: { select: { publicId: true } },
        boardSwimlane: { select: { publicId: true } },
        ownerIds: true,
        boardAssignees: {
          select: { user: { select: { publicId: true } } },
        },
        // Tarefa pai — `type` é necessário para decidir se a task é subtarefa.
        // Só tasks cujo pai é também type='task' são consideradas subtarefas;
        // tasks com pai type='project' ou 'milestone' são raízes no board.
        parent: { select: { publicId: true, type: true } },
        // Filhos directos (para agregar progresso de subtarefas no card pai)
        children: {
          where: { type: 'task' },
          select: { boardColumnId: true },
        },
      },
      orderBy: [{ boardPosition: 'asc' }, { createdAt: 'asc' }],
    });

    // Resolver ownerIds (IDs de GanttResourceNode) → User.publicId
    // ownerIds são strings numéricas que referenciam GanttResourceNode.id (folhas internas têm userId)
    const allNodeIds = new Set<number>();
    for (const task of tasks) {
      for (const oid of task.ownerIds) {
        const n = Number(oid);
        if (!isNaN(n)) allNodeIds.add(n);
      }
    }
    const nodeUserMap = new Map<number, string>();
    if (allNodeIds.size > 0) {
      const nodes = await this.prisma.ganttResourceNode.findMany({
        where: { id: { in: Array.from(allNodeIds) }, userId: { not: null } },
        select: { id: true, user: { select: { publicId: true } } },
      });
      for (const node of nodes) {
        if (node.user?.publicId) nodeUserMap.set(node.id, node.user.publicId);
      }
    }

    // Contagem de comentários por task (agregação única)
    const taskPublicIds = tasks.map((t) => t.publicId);
    const commentCountMap = new Map<string, number>();
    if (taskPublicIds.length > 0) {
      const rows = await this.prisma.comment.groupBy({
        by: ['entityPublicId'],
        where: { entityType: EntityType.TASK, entityPublicId: { in: taskPublicIds } },
        _count: { _all: true },
      });
      for (const row of rows) commentCountMap.set(row.entityPublicId, row._count._all);
    }

    /**
     * Mapeia uma tarefa para o formato de card do board.
     * Tarefas sem boardColumnId caem na primeira coluna INITIAL (fallback mínimo).
     * Tarefas pai têm subtaskTotal/subtaskDone agregados; o progress reflecte a conclusão de subtarefas.
     */
    const mapTask = (task: typeof tasks[number]) => {
      let column = task.boardColumn?.publicId ?? null;
      if (column === null) {
        column = columnByType.get(BoardColumnType.INITIAL) ?? null;
      }

      // Agregação de subtarefas directas (filhos imediatos)
      const subtaskTotal = task.children?.length ?? 0;
      const subtaskDone  = task.children?.filter(
        (c) => c.boardColumnId !== null && finalColumnInternalIds.has(c.boardColumnId),
      ).length ?? 0;

      // Progress do card: subtask completion quando há filhos, senão progress próprio
      const boardProgress = subtaskTotal > 0
        ? Math.round((subtaskDone / subtaskTotal) * 100)
        : Math.round((task.progress ?? 0) * 100);

      return {
        id: task.publicId,
        label: task.text,
        column,
        rowId: task.boardSwimlane?.publicId ?? null,
        position: task.boardPosition ?? 0,
        priority: task.priority ?? 0,
        start_date: task.startDate?.toISOString(),
        end_date: task.duration != null && task.startDate != null
          ? new Date(task.startDate.getTime() + task.duration * 86400000).toISOString()
          : undefined,
        progress: boardProgress,
        type: task.type,
        users: [
          ...task.ownerIds
            .map((oid) => nodeUserMap.get(Number(oid)))
            .filter((uid): uid is string => uid !== undefined),
          ...task.boardAssignees.map((a) => a.user.publicId),
        ].filter((uid, idx, arr) => arr.indexOf(uid) === idx),
        commentCount: commentCountMap.get(task.publicId) ?? 0,
        // publicId do pai — preenchido APENAS quando o pai é type='task'.
        // Tasks com pai type='project' ou 'milestone' são raízes no board.
        parentTaskId: task.parent?.type === 'task' ? task.parent.publicId : null,
        subtaskTotal,
        subtaskDone,
      };
    };

    const placed  = tasks.filter((t) => t.boardColumnId != null).map(mapTask);
    const unplaced = tasks.filter((t) => t.boardColumnId == null).map(mapTask);

    // Membros do projecto disponíveis para atribuição
    const members = await this.getBoardMembers(projectId);

    return { columns, swimlanes, cards: placed, unplaced, members };
  }

  /** Inicializar estados base (usado se count < 3) */
  private async initSystemColumns(projectId: number): Promise<void> {
    for (const col of SYSTEM_COLUMNS) {
      const existing = await this.prisma.boardColumn.findFirst({
        where: { projectId, systemKey: col.systemKey },
      });
      if (!existing) {
        await this.prisma.boardColumn.create({
          data: {
            projectId,
            systemKey: col.systemKey,
            type: col.type,
            isSystem: true,
            position: col.position,
            label: null,
            status: Status.ACTIVE,
          },
        });
      }
    }
  }

  /** Lista de membros do projecto (directos + por equipa) para o selector de assignees */
  private async getBoardMembers(projectId: number) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        owner: { select: { publicId: true, name: true } },
        members: {
          where: { status: InviteStatus.ACCEPTED },
          select: { user: { select: { publicId: true, name: true } } },
        },
        teams: {
          include: {
            team: {
              select: {
                members: { select: { user: { select: { publicId: true, name: true } } } },
              },
            },
          },
        },
      },
    });
    if (!project) return [];

    const seen = new Set<string>();
    const members: { id: string; label: string }[] = [];

    const addMember = (u: { publicId: string; name: string } | null) => {
      if (!u || seen.has(u.publicId)) return;
      seen.add(u.publicId);
      members.push({ id: u.publicId, label: u.name });
    };

    if (project.owner) addMember(project.owner);
    for (const m of project.members) addMember(m.user);
    for (const pt of project.teams) {
      for (const tm of pt.team.members) addMember(tm.user);
    }

    return members;
  }

  /**
   * Lista apenas as colunas ("estados") do projecto — usado pelo PlanningStatesController
   * para o select do TaskModal e offcanvas de gestão, sem depender de `board_view`.
   * Garante que as 3 colunas-sistema existem (idempotente).
   */
  async listStates(projectPublicId: string) {
    const projectId = await this.resolveProjectId(projectPublicId);

    const existingSystemCols = await this.prisma.boardColumn.count({
      where: { projectId, isSystem: true, status: Status.ACTIVE },
    });
    if (existingSystemCols < 3) await this.initSystemColumns(projectId);

    const rawColumns = await this.prisma.boardColumn.findMany({
      where: { projectId, status: Status.ACTIVE },
      orderBy: { position: 'asc' },
      select: {
        publicId: true,
        label: true,
        systemKey: true,
        type: true,
        isSystem: true,
        position: true,
        color: true,
        wipLimit: true,
      },
    });

    return rawColumns.map((col) => ({
      ...col,
      labelKey: col.systemKey ? `states.${col.systemKey.toLowerCase()}` : null,
    }));
  }

  /**
   * Resolve a coluna INITIAL (primeiro TODO) do projecto, criando-a se necessário.
   * Usado por createTask para atribuir coluna default.
   */
  async getInitialColumnId(projectId: number): Promise<number | null> {
    const existingSystemCols = await this.prisma.boardColumn.count({
      where: { projectId, isSystem: true, status: Status.ACTIVE },
    });
    if (existingSystemCols < 3) await this.initSystemColumns(projectId);

    const initial = await this.prisma.boardColumn.findFirst({
      where: { projectId, type: BoardColumnType.INITIAL, status: Status.ACTIVE },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    return initial?.id ?? null;
  }

  // ── Columns CRUD ──────────────────────────────────────────────────────────────

  async createColumn(projectPublicId: string, dto: CreateBoardColumnDto) {
    const projectId = await this.resolveProjectId(projectPublicId);

    // Calcular próxima posição
    const maxPos = await this.prisma.boardColumn.aggregate({
      where: { projectId, status: Status.ACTIVE },
      _max: { position: true },
    });
    const position = (maxPos._max.position ?? -1) + 1;

    return this.prisma.boardColumn.create({
      data: {
        projectId,
        label: dto.label,
        systemKey: null,
        type: BoardColumnType.INTERMEDIATE,
        isSystem: false,
        position,
        color: dto.color ?? null,
        wipLimit: dto.wipLimit ?? null,
        status: Status.ACTIVE,
      },
      select: { publicId: true, label: true, systemKey: true, type: true, isSystem: true, position: true, color: true, wipLimit: true },
    });
  }

  async updateColumn(projectPublicId: string, columnPublicId: string, dto: UpdateBoardColumnDto) {
    const projectId = await this.resolveProjectId(projectPublicId);

    const col = await this.prisma.boardColumn.findFirst({
      where: { publicId: columnPublicId, projectId, status: Status.ACTIVE },
    });
    if (!col) throw new AppException('COLUMN_NOT_FOUND', HttpStatus.NOT_FOUND);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {
      color: dto.color !== undefined ? dto.color : undefined,
      wipLimit: dto.wipLimit !== undefined ? dto.wipLimit : undefined,
    };

    // label: permitido para todos, mas com semântica diferente
    if (dto.label !== undefined) {
      // null = repor i18n default (só faz sentido para sistema)
      data.label = dto.label ?? null;
    }

    return this.prisma.boardColumn.update({
      where: { id: col.id },
      data,
      select: { publicId: true, label: true, systemKey: true, type: true, isSystem: true, position: true, color: true, wipLimit: true },
    });
  }

  async reorderColumns(projectPublicId: string, dto: ReorderColumnsDto) {
    const projectId = await this.resolveProjectId(projectPublicId);

    // Validar que todos os publicIds pertencem ao projecto
    const columns = await this.prisma.boardColumn.findMany({
      where: { projectId, publicId: { in: dto.orderedPublicIds }, status: Status.ACTIVE },
      select: { id: true, publicId: true },
    });

    if (columns.length !== dto.orderedPublicIds.length) {
      throw new AppException('BOARD_COLUMNS_INVALID_IDS', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    // Actualizar posições
    await Promise.all(
      dto.orderedPublicIds.map((pubId, index) => {
        const col = columns.find((c) => c.publicId === pubId)!;
        return this.prisma.boardColumn.update({ where: { id: col.id }, data: { position: index } });
      }),
    );

    return { reordered: dto.orderedPublicIds.length };
  }

  async deleteColumn(projectPublicId: string, columnPublicId: string, dto: DeleteBoardColumnDto) {
    const projectId = await this.resolveProjectId(projectPublicId);

    const col = await this.prisma.boardColumn.findFirst({
      where: { publicId: columnPublicId, projectId, status: Status.ACTIVE },
    });
    if (!col) throw new AppException('COLUMN_NOT_FOUND', HttpStatus.NOT_FOUND);

    // Proibir eliminação de estados sistema
    if (col.isSystem) {
      throw new AppException('BOARD_SYSTEM_COLUMN_DELETE', HttpStatus.CONFLICT);
    }

    // Contar tarefas na coluna
    const taskCount = await this.prisma.ganttTask.count({
      where: { boardColumnId: col.id },
    });

    if (taskCount > 0) {
      if (!dto.targetColumnPublicId) {
        throw new AppException('BOARD_COLUMN_NEEDS_TARGET', HttpStatus.UNPROCESSABLE_ENTITY);
      }

      const targetCol = await this.prisma.boardColumn.findFirst({
        where: { publicId: dto.targetColumnPublicId, projectId, status: Status.ACTIVE },
        select: { id: true },
      });
      if (!targetCol) throw new AppException('TARGET_COLUMN_NOT_FOUND', HttpStatus.NOT_FOUND);

      // Realocar tarefas para a coluna de destino
      await this.prisma.ganttTask.updateMany({
        where: { boardColumnId: col.id },
        data: { boardColumnId: targetCol.id },
      });
    }

    // Soft-delete da coluna
    await this.prisma.boardColumn.update({
      where: { id: col.id },
      data: { status: Status.INACTIVE },
    });

    // Reajustar posições das colunas restantes
    const remaining = await this.prisma.boardColumn.findMany({
      where: { projectId, status: Status.ACTIVE },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    await Promise.all(remaining.map((c, i) =>
      this.prisma.boardColumn.update({ where: { id: c.id }, data: { position: i } }),
    ));

    return { deleted: true, tasksReassigned: taskCount };
  }

  // ── Cards ─────────────────────────────────────────────────────────────────────

  /**
   * Move (ou reordena) um card dentro de / entre colunas.
   * Reescrito para:
   *  - Fazer re-sequencing das posições dos outros cards (evita duplicados).
   *  - Executar em transação (atomicidade).
   *  - Devolver o card serializado no formato do `getBoard` para optimistic update.
   */
  async moveCard(projectPublicId: string, taskPublicId: string, dto: MoveCardDto) {
    const projectId = await this.resolveProjectId(projectPublicId);
    const taskId    = await this.resolveTaskId(taskPublicId, projectId);

    let newColumnId: number | null = null;
    if (dto.columnPublicId) {
      newColumnId = await this.resolveColumnId(dto.columnPublicId, projectId);
    }

    // Resolução da swimlane — distingue undefined (manter) vs null (swimlane default)
    // dto.swimlanePublicId: undefined = skip update; null = set null; uuid = resolve
    const swimlaneIntent: { change: boolean; value: number | null } = { change: false, value: null };
    if (dto.swimlanePublicId !== undefined) {
      swimlaneIntent.change = true;
      if (dto.swimlanePublicId === null) {
        swimlaneIntent.value = null;
      } else {
        swimlaneIntent.value = await this.resolveSwimlaneId(dto.swimlanePublicId, projectId);
      }
    }

    // Estado actual do card
    const current = await this.prisma.ganttTask.findUnique({
      where: { id: taskId },
      select: { boardColumnId: true, boardPosition: true },
    });
    if (!current) throw new AppException('TASK_NOT_FOUND', HttpStatus.NOT_FOUND);

    const oldColumnId = current.boardColumnId ?? null;
    const oldPosition = current.boardPosition ?? 0;
    const targetPosition = Math.max(0, dto.position ?? 0);

    await this.prisma.$transaction(async (tx) => {
      if (oldColumnId === newColumnId && newColumnId !== null) {
        // Reorder dentro da mesma coluna
        if (oldPosition < targetPosition) {
          await tx.ganttTask.updateMany({
            where: {
              boardColumnId: newColumnId,
              boardPosition: { gt: oldPosition, lte: targetPosition },
              id: { not: taskId },
            },
            data: { boardPosition: { decrement: 1 } },
          });
        } else if (oldPosition > targetPosition) {
          await tx.ganttTask.updateMany({
            where: {
              boardColumnId: newColumnId,
              boardPosition: { gte: targetPosition, lt: oldPosition },
              id: { not: taskId },
            },
            data: { boardPosition: { increment: 1 } },
          });
        }
      } else {
        // Mover entre colunas: compactar origem + abrir espaço no destino
        if (oldColumnId !== null) {
          await tx.ganttTask.updateMany({
            where: {
              boardColumnId: oldColumnId,
              boardPosition: { gt: oldPosition },
              id: { not: taskId },
            },
            data: { boardPosition: { decrement: 1 } },
          });
        }
        if (newColumnId !== null) {
          await tx.ganttTask.updateMany({
            where: {
              boardColumnId: newColumnId,
              boardPosition: { gte: targetPosition },
              id: { not: taskId },
            },
            data: { boardPosition: { increment: 1 } },
          });
        }
      }

      // Aplicar posição/coluna/swimlane novas ao próprio card
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {
        boardColumnId: newColumnId,
        boardPosition: newColumnId !== null ? targetPosition : null,
      };
      if (swimlaneIntent.change) {
        updateData.boardSwimlaneId = swimlaneIntent.value;
      }
      await tx.ganttTask.update({ where: { id: taskId }, data: updateData });
    });

    // Serializar card actualizado
    const updated = await this.prisma.ganttTask.findUnique({
      where: { id: taskId },
      select: {
        publicId: true,
        text: true,
        type: true,
        startDate: true,
        duration: true,
        progress: true,
        priority: true,
        boardPosition: true,
        boardColumn: { select: { publicId: true } },
        boardSwimlane: { select: { publicId: true } },
        boardAssignees: { select: { user: { select: { publicId: true } } } },
      },
    });
    if (!updated) throw new AppException('TASK_NOT_FOUND', HttpStatus.NOT_FOUND);

    return {
      moved: true,
      card: {
        id: updated.publicId,
        label: updated.text,
        column: updated.boardColumn?.publicId ?? null,
        rowId: updated.boardSwimlane?.publicId ?? null,
        position: updated.boardPosition ?? 0,
        priority: updated.priority ?? 0,
        start_date: updated.startDate?.toISOString(),
        end_date: updated.duration != null && updated.startDate != null
          ? new Date(updated.startDate.getTime() + updated.duration * 86400000).toISOString()
          : undefined,
        progress: Math.round((updated.progress ?? 0) * 100),
        type: updated.type,
        users: updated.boardAssignees.map((a) => a.user.publicId),
      },
    };
  }

  // `assignCard` board-only foi removido em Abril 2026 com o tab Board.
  // Reintroduzir aqui (e re-criar `AssignCardDto`) quando o futuro componente
  // Board voltar — ver `docs/claude/future-board.md`.

  // ── Swimlanes CRUD ────────────────────────────────────────────────────────────

  /**
   * Lista as swimlanes do projecto com estado `collapsed` resolvido para o utilizador.
   * Usado por contextos que precisam das swimlanes sem passar por `getBoard()`.
   */
  async listSwimlanes(projectPublicId: string, requestingUserId: number) {
    const projectId = await this.resolveProjectId(projectPublicId);

    const rows = await this.prisma.boardSwimlane.findMany({
      where: { projectId, status: Status.ACTIVE },
      orderBy: { position: 'asc' },
      select: {
        publicId: true,
        label: true,
        labelKey: true,
        isPrimary: true,
        color: true,
        position: true,
        userStates: {
          where: { userId: requestingUserId },
          select: { collapsed: true },
        },
      },
    });

    return rows.map((sw) => this.mapSwimlaneRow(sw, sw.userStates[0]?.collapsed ?? false));
  }

  async createSwimlane(projectPublicId: string, dto: CreateBoardSwimlaneDto) {
    const projectId = await this.resolveProjectId(projectPublicId);

    // Tudo dentro de uma única transacção para que a verificação de
    // `isPrimary` e a criação sejam atómicas — sem isto, dois pedidos
    // simultâneos (ou o ex-bug do StrictMode) viam ambos `primary == null`
    // e cada um criava uma swimlane principal nova ⇒ N "Geral" duplicadas.
    // Defesa adicional: índice parcial único `(projectId) WHERE isPrimary`
    // (migração `add_unique_primary_swimlane`).
    await this.prisma.$transaction(async (tx) => {
      // O índice parcial único é em `(projectId) WHERE isPrimary=true`
      // — sem filtrar status. Se existir uma primary INACTIVE/ARCHIVED,
      // criar uma nova primary rebenta no índice. Por isso a busca
      // **não filtra por status** e, se aparecer uma primary não-activa,
      // reactiva-a em vez de criar nova.
      const primary = await tx.boardSwimlane.findFirst({
        where: { projectId, isPrimary: true },
        select: { id: true, status: true },
      });

      if (!primary) {
        // Primeira swimlane do projecto: criar a principal e migrar
        // todas as tasks órfãs para ela.
        const created = await tx.boardSwimlane.create({
          data: {
            projectId,
            label:     null,
            labelKey:  'swimlane.general',
            isPrimary: true,
            position:  0,
            status:    Status.ACTIVE,
          },
          select: { id: true },
        });
        await tx.ganttTask.updateMany({
          where: { projectId, boardSwimlaneId: null, type: 'task' },
          data:  { boardSwimlaneId: created.id },
        });
      } else if (primary.status !== Status.ACTIVE) {
        // Primary existente mas inactiva — reactivar (e migrar tasks órfãs
        // novamente, defensivo).
        await tx.boardSwimlane.update({
          where: { id: primary.id },
          data:  { status: Status.ACTIVE },
        });
        await tx.ganttTask.updateMany({
          where: { projectId, boardSwimlaneId: null, type: 'task' },
          data:  { boardSwimlaneId: primary.id },
        });
      }

      // Sempre cria a swimlane pedida pelo utilizador no fim da lista.
      const maxPos = await tx.boardSwimlane.aggregate({
        where: { projectId, status: Status.ACTIVE },
        _max:  { position: true },
      });
      await tx.boardSwimlane.create({
        data: {
          projectId,
          label:     dto.label,
          labelKey:  null,
          isPrimary: false,
          color:     dto.color ?? null,
          position:  (maxPos._max.position ?? -1) + 1,
          status:    Status.ACTIVE,
        },
      });
    });

    return { created: true };
  }

  async updateSwimlane(projectPublicId: string, swimlanePublicId: string, dto: UpdateBoardSwimlaneDto) {
    const projectId = await this.resolveProjectId(projectPublicId);

    const sw = await this.prisma.boardSwimlane.findFirst({
      where: { publicId: swimlanePublicId, projectId, status: Status.ACTIVE },
    });
    if (!sw) throw new AppException('SWIMLANE_NOT_FOUND', HttpStatus.NOT_FOUND);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};
    // label vazio/null → persistir null (fallback para labelKey i18n)
    if (dto.label !== undefined) data.label = dto.label?.trim() || null;
    if (dto.color !== undefined) data.color = dto.color;

    return this.prisma.boardSwimlane.update({
      where: { id: sw.id },
      data,
      select: { publicId: true, label: true, color: true, position: true },
    });
  }

  async reorderSwimlanes(projectPublicId: string, dto: ReorderSwimlanesDto) {
    const projectId = await this.resolveProjectId(projectPublicId);

    const swimlanes = await this.prisma.boardSwimlane.findMany({
      where: { projectId, publicId: { in: dto.orderedPublicIds }, status: Status.ACTIVE },
      select: { id: true, publicId: true },
    });

    if (swimlanes.length !== dto.orderedPublicIds.length) {
      throw new AppException('BOARD_SWIMLANES_INVALID_IDS', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    await Promise.all(
      dto.orderedPublicIds.map((pubId, index) => {
        const sw = swimlanes.find((s) => s.publicId === pubId)!;
        return this.prisma.boardSwimlane.update({ where: { id: sw.id }, data: { position: index } });
      }),
    );

    return { reordered: dto.orderedPublicIds.length };
  }

  async deleteSwimlane(projectPublicId: string, swimlanePublicId: string) {
    const projectId = await this.resolveProjectId(projectPublicId);

    const sw = await this.prisma.boardSwimlane.findFirst({
      where: { publicId: swimlanePublicId, projectId, status: Status.ACTIVE },
    });
    if (!sw) throw new AppException('SWIMLANE_NOT_FOUND', HttpStatus.NOT_FOUND);

    const allActive = await this.prisma.boardSwimlane.findMany({
      where: { projectId, status: Status.ACTIVE },
      select: { id: true, isPrimary: true },
    });

    if (sw.isPrimary) {
      // Swimlane principal: só pode ser apagada se for a última
      if (allActive.length > 1) {
        throw new AppException('BOARD_PRIMARY_SWIMLANE_DELETE', HttpStatus.CONFLICT);
      }
      // É a última — os cards voltam a null (board regressa ao modo sem swimlanes)
      await this.prisma.$transaction(async (tx) => {
        await tx.ganttTask.updateMany({
          where: { boardSwimlaneId: sw.id },
          data:  { boardSwimlaneId: null },
        });
        await tx.boardSwimlane.update({
          where: { id: sw.id },
          data:  { status: Status.INACTIVE },
        });
      });
    } else {
      // Swimlane normal: cards migram automaticamente para a swimlane principal
      const primary = allActive.find((s) => s.isPrimary);
      if (!primary) {
        throw new AppException('BOARD_PRIMARY_SWIMLANE_NOT_FOUND', HttpStatus.CONFLICT);
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.ganttTask.updateMany({
          where: { boardSwimlaneId: sw.id },
          data:  { boardSwimlaneId: primary.id },
        });
        await tx.boardSwimlane.update({
          where: { id: sw.id },
          data:  { status: Status.INACTIVE },
        });
        // Reajustar posições das swimlanes restantes
        const remaining = await tx.boardSwimlane.findMany({
          where: { projectId, status: Status.ACTIVE },
          orderBy: { position: 'asc' },
          select: { id: true },
        });
        await Promise.all(remaining.map((s, i) =>
          tx.boardSwimlane.update({ where: { id: s.id }, data: { position: i } }),
        ));
      });
    }

    return { deleted: true };
  }

  /**
   * Define o estado collapsed/expandido de uma swimlane para o utilizador autenticado.
   * Upsert idempotente em BoardSwimlaneUserState.
   */
  async setSwimlaneCollapsed(
    projectPublicId: string,
    swimlanePublicId: string,
    userId: number,
    collapsed: boolean,
  ) {
    const projectId = await this.resolveProjectId(projectPublicId);
    const swimlaneId = await this.resolveSwimlaneId(swimlanePublicId, projectId);

    await this.prisma.boardSwimlaneUserState.upsert({
      where: { swimlaneId_userId: { swimlaneId, userId } },
      update: { collapsed },
      create: { swimlaneId, userId, collapsed },
    });

    return { collapsed };
  }
}
