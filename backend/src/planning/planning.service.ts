import {
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { EntityType, GanttTaskDurationUnit } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { HolidaysService } from '../holidays/holidays.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StatesService } from './states/states.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { JwtPayload } from '../auth/jwt.strategy';
import { addBusinessDaysInclusive } from './business-days.util';
import {
  addBusinessHoursInclusive,
  DEFAULT_WORK_HOURS,
  WorkHours,
} from './business-hours.util';
import { assertTaskDurationWithinLimit } from './limits.util';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { StorageService } from '../storage/storage.service';

/**
 * Helper interno — devolve workHours válido a partir do JSON do projecto, ou
 * o default se ausente/inválido. Robusto contra `null`, `undefined`, ou
 * strings (que o Prisma pode devolver para campos Json).
 */
function resolveWorkHours(raw: unknown): WorkHours {
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.start === 'number' && typeof obj.end === 'number'
        && obj.end > obj.start) {
      return { start: obj.start, end: obj.end };
    }
  }
  return DEFAULT_WORK_HOURS;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** Converte string wire DHTMLX `"DD-MM-YYYY HH:mm"` → Date (UTC). */
export function parseGanttDate(d: string): Date {
  const [datePart, timePart = '00:00'] = d.split(' ');
  const [day, month, year] = datePart.split('-');
  const [h, m] = timePart.split(':');
  return new Date(`${year}-${month}-${day}T${h}:${m}:00.000Z`);
}

/** Converte Date (UTC) → string wire DHTMLX `"DD-MM-YYYY HH:mm"`. */
export function formatGanttDate(d: Date): string {
  const dd   = String(d.getUTCDate()).padStart(2, '0');
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getUTCFullYear());
  const hh   = String(d.getUTCHours()).padStart(2, '0');
  const mi   = String(d.getUTCMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly holidaysService: HolidaysService,
    private readonly notificationsService: NotificationsService,
    private readonly statesService: StatesService,
    private readonly platformConfig: PlatformConfigService,
    private readonly storage: StorageService,
  ) {}

  /** Helper local — converte `avatarKey` em `avatarUrl` para o response. */
  private resolveAvatarUrl(key: string | null | undefined): string | null {
    if (!key || !this.storage.isReady()) return null;
    return this.storage.buildPublicUrl(key);
  }

  // ── Helpers: resolve publicId → internal numeric id ─────────────────────────

  private async resolveProjectId(publicId: string): Promise<number> {
    const project = await this.prisma.project.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!project) throw new AppException('PROJECT_NOT_FOUND', HttpStatus.NOT_FOUND);
    return project.id;
  }

  private async resolveTaskId(publicId: string): Promise<number> {
    const task = await this.prisma.ganttTask.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!task) throw new AppException('TASK_NOT_FOUND', HttpStatus.NOT_FOUND);
    return task.id;
  }

  private async resolveLinkId(publicId: string): Promise<number> {
    const link = await this.prisma.ganttLink.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!link) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return link.id;
  }

  private async resolveResourceId(publicId: string): Promise<number> {
    const resource = await this.prisma.ganttResource.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!resource) throw new AppException('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND);
    return resource.id;
  }

  private async resolveUserId(publicId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!user) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return user.id;
  }

  private async resolveUserTypeId(publicId: string): Promise<number> {
    const ut = await this.prisma.userType.findUnique({
      where: { publicId },
      select: { id: true },
    });
    if (!ut) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    return ut.id;
  }

  // ── Resource Node Sync ───────────────────────────────────────────────────────

  /**
   * Reconcilia a tabela GanttResourceNode com o estado actual do projecto.
   * Garante 1 grupo por UserType presente + 1 folha por membro/externo.
   * Migra owner_id das tarefas de formato antigo (u_X, r_X, X) para IDs de nós.
   */
  async syncResourceNodes(projectId: number) {
    // 1. Recolher dados em paralelo
    const [project, externalResources, memberHoursRows, existingNodes, tasks] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          teams: {
            include: {
              team: {
                include: {
                  members: {
                    include: {
                      user: {
                        select: { id: true, name: true, status: true, userType: { select: { id: true, code: true, label: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.ganttResource.findMany({
        where: { projectId, userId: null },
        include: { userType: { select: { id: true, code: true, label: true } } },
      }),
      this.prisma.projectMemberHours.findMany({ where: { projectId } }),
      this.prisma.ganttResourceNode.findMany({ where: { projectId } }),
      this.prisma.ganttTask.findMany({ where: { projectId }, select: { id: true, ownerIds: true } }),
    ]);

    if (!project) return [];

    const memberHoursMap = new Map(memberHoursRows.map((h) => [h.userId, h.hoursPerDay]));

    // 2. Deduplicate team members
    const membersMap = new Map<number, { id: number; name: string; userTypeId: number | null; userTypeLabel: string | null }>();
    for (const pt of project.teams) {
      for (const tm of pt.team.members) {
        if (tm.user.status !== 'ACTIVE') continue;
        if (!membersMap.has(tm.user.id)) {
          membersMap.set(tm.user.id, {
            id: tm.user.id,
            name: tm.user.name,
            userTypeId: tm.user.userType?.id ?? null,
            userTypeLabel: tm.user.userType?.label ?? null,
          });
        }
      }
    }

    // 3. Collect all UserTypes needed (from members + external resources)
    const typeMap = new Map<number, string>(); // userTypeId → label
    for (const m of membersMap.values()) {
      if (m.userTypeId !== null) typeMap.set(m.userTypeId, m.userTypeLabel!);
    }
    for (const ext of externalResources) {
      if (ext.userType) typeMap.set(ext.userType.id, ext.userType.label);
    }
    // Check if any members/externals lack a type → need "Sem tipo" group
    const needsUntyped = [...membersMap.values()].some((m) => m.userTypeId === null);

    // 4. Build index of existing nodes
    const existingGroupsByType = new Map<number | null, typeof existingNodes[0]>();
    const existingUserNodes = new Map<number, typeof existingNodes[0]>();
    const existingExtNodes = new Map<number, typeof existingNodes[0]>();
    for (const n of existingNodes) {
      if (n.isGroup) {
        existingGroupsByType.set(n.userTypeId, n);
      } else if (n.userId !== null) {
        existingUserNodes.set(n.userId, n);
      } else if (n.ganttResourceId !== null) {
        existingExtNodes.set(n.ganttResourceId, n);
      }
    }

    const seenNodeIds = new Set<number>();
    const now = new Date();

    // 5. Upsert group nodes
    const groupNodeIds = new Map<number | null, number>(); // userTypeId → nodeId

    for (const [typeId, label] of typeMap) {
      const existing = existingGroupsByType.get(typeId);
      if (existing) {
        if (existing.text !== label) {
          await this.prisma.ganttResourceNode.update({ where: { id: existing.id }, data: { text: label, updatedAt: now } });
        }
        groupNodeIds.set(typeId, existing.id);
        seenNodeIds.add(existing.id);
      } else {
        const created = await this.prisma.ganttResourceNode.create({
          data: { text: label, projectId, userTypeId: typeId, isGroup: true, updatedAt: now },
        });
        groupNodeIds.set(typeId, created.id);
        seenNodeIds.add(created.id);
      }
    }

    // "Sem tipo" group
    if (needsUntyped) {
      const existing = existingGroupsByType.get(null);
      if (existing) {
        groupNodeIds.set(null, existing.id);
        seenNodeIds.add(existing.id);
      } else {
        const created = await this.prisma.ganttResourceNode.create({
          data: { text: 'Sem tipo', projectId, userTypeId: null, isGroup: true, updatedAt: now },
        });
        groupNodeIds.set(null, created.id);
        seenNodeIds.add(created.id);
      }
    }

    // 6. Upsert leaf nodes (internal members)
    for (const m of membersMap.values()) {
      const parentId = groupNodeIds.get(m.userTypeId) ?? groupNodeIds.get(null);
      const hpd = memberHoursMap.get(m.id) ?? 8;
      const existing = existingUserNodes.get(m.id);
      if (existing) {
        const needsUpdate = existing.text !== m.name || existing.parentId !== parentId || existing.hoursPerDay !== hpd;
        if (needsUpdate) {
          await this.prisma.ganttResourceNode.update({
            where: { id: existing.id },
            data: { text: m.name, parentId: parentId ?? null, hoursPerDay: hpd, updatedAt: now },
          });
        }
        seenNodeIds.add(existing.id);
      } else {
        const created = await this.prisma.ganttResourceNode.create({
          data: { text: m.name, projectId, userId: m.id, parentId: parentId ?? null, hoursPerDay: hpd, updatedAt: now },
        });
        seenNodeIds.add(created.id);
      }
    }

    // 7. Upsert leaf nodes (external resources)
    for (const ext of externalResources) {
      const typeId = ext.userType?.id ?? null;
      const parentId = groupNodeIds.get(typeId) ?? groupNodeIds.get(null);
      const existing = existingExtNodes.get(ext.id);
      if (existing) {
        const needsUpdate = existing.text !== ext.text || existing.parentId !== parentId || existing.hoursPerDay !== ext.hoursPerDay;
        if (needsUpdate) {
          await this.prisma.ganttResourceNode.update({
            where: { id: existing.id },
            data: { text: ext.text, parentId: parentId ?? null, hoursPerDay: ext.hoursPerDay, updatedAt: now },
          });
        }
        seenNodeIds.add(existing.id);
      } else {
        const created = await this.prisma.ganttResourceNode.create({
          data: { text: ext.text, projectId, ganttResourceId: ext.id, parentId: parentId ?? null, hoursPerDay: ext.hoursPerDay, updatedAt: now },
        });
        seenNodeIds.add(created.id);
      }
    }

    // 8. Delete orphaned nodes
    const orphanIds = existingNodes.filter((n) => !seenNodeIds.has(n.id)).map((n) => n.id);
    if (orphanIds.length > 0) {
      // Delete leaves first (avoid FK cascade issues), then groups
      await this.prisma.ganttResourceNode.deleteMany({ where: { id: { in: orphanIds }, isGroup: false } });
      await this.prisma.ganttResourceNode.deleteMany({ where: { id: { in: orphanIds }, isGroup: true } });
    }

    // 9. Migrate legacy owner_id on tasks (idempotent)
    const finalNodes = await this.prisma.ganttResourceNode.findMany({ where: { projectId }, orderBy: { id: 'asc' } });
    const nodeByUserId = new Map<number, number>();
    const nodeByExtId = new Map<number, number>();
    for (const n of finalNodes) {
      if (n.userId !== null) nodeByUserId.set(n.userId, n.id);
      if (n.ganttResourceId !== null) nodeByExtId.set(n.ganttResourceId, n.id);
    }
    const validNodeIds = new Set(finalNodes.map((n) => n.id));

    for (const task of tasks) {
      if (!task.ownerIds || task.ownerIds.length === 0) continue;
      let changed = false;
      const newIds = task.ownerIds.map((oid) => {
        // Already a valid node ID?
        const num = Number(oid);
        if (!isNaN(num) && validNodeIds.has(num)) return oid;
        // Prefixed format: u_X → nodeId
        if (oid.startsWith('u_')) {
          const uid = Number(oid.slice(2));
          const nid = nodeByUserId.get(uid);
          if (nid !== undefined) { changed = true; return String(nid); }
        }
        // Prefixed format: r_X → nodeId
        if (oid.startsWith('r_')) {
          const rid = Number(oid.slice(2));
          const nid = nodeByExtId.get(rid);
          if (nid !== undefined) { changed = true; return String(nid); }
        }
        // Legacy plain numeric → try as userId
        if (!isNaN(Number(oid))) {
          const nid = nodeByUserId.get(Number(oid));
          if (nid !== undefined) { changed = true; return String(nid); }
        }
        changed = true;
        return null; // Unknown → drop
      }).filter((id): id is string => id !== null);

      if (changed) {
        await this.prisma.ganttTask.update({ where: { id: task.id }, data: { ownerIds: newIds } });
      }
    }

    // 10. Return serialized nodes — usa publicId (não `id` numérico interno)
    // tanto no `id` como no `parent`. DHTMLX aceita strings como ids; o
    // resource_property `owner_id` matches por igualdade. Cobertura de
    // segurança: GanttResourceNode.id e User.id deixam de vazar para a API.
    const idToPublicId = new Map<number, string>();
    for (const n of finalNodes) idToPublicId.set(n.id, n.publicId);

    // Buscar avatarKey dos users associados aos nodes (folhas com `userId`).
    const userIds = finalNodes
      .map((n) => n.userId)
      .filter((id): id is number => id !== null);
    const avatarByUserId = new Map<number, string | null>();
    if (userIds.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, avatarKey: true },
      });
      for (const u of users) avatarByUserId.set(u.id, u.avatarKey);
    }

    return finalNodes.map((n) => ({
      id: n.publicId,
      text: n.text,
      parent: n.parentId !== null ? (idToPublicId.get(n.parentId) ?? null) : null,
      hoursPerDay: n.hoursPerDay,
      isGroup: n.isGroup,
      avatarUrl: n.userId
        ? this.resolveAvatarUrl(avatarByUserId.get(n.userId) ?? null)
        : null,
    }));
  }

  // ── Project data ────────────────────────────────────────────────────────────

  async getProjectData(projectPublicId: string) {
    const projectId = await this.resolveProjectId(projectPublicId);

    const [tasks, links, resources, nonWorkingDays, commentCounts] = await Promise.all([
      this.prisma.ganttTask.findMany({
        where: { projectId },
        include: {
          boardColumn:   { select: { publicId: true } },
          boardSwimlane: { select: { publicId: true } },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.ganttLink.findMany({
        where: {
          OR: [
            { source: { projectId } },
            { target: { projectId } },
          ],
        },
        orderBy: { id: 'asc' },
      }),
      this.syncResourceNodes(projectId),
      this.holidaysService.getNonWorkingDaysForProject(projectId),
      this.prisma.comment.groupBy({
        by: ['entityPublicId'],
        where: { projectId, entityType: EntityType.TASK },
        _count: { id: true },
      }),
    ]);

    const commentCountMap = new Map<string, number>(
      commentCounts.map((c) => [c.entityPublicId, c._count.id]),
    );

    // Map para hidratar `owner_id` numéricos (BD) → publicIds (wire format).
    // Inclui apenas leaves (groups não aparecem em ownerIds).
    const nodeIdToPublicId = await this.buildNodeIdToPublicIdMap(projectId);

    return {
      data: tasks.map((t) =>
        this.serializeTask(t, commentCountMap.get(t.publicId) ?? 0, nodeIdToPublicId),
      ),
      links: links.map((l) => this.serializeLink(l)),
      resources,
      nonWorkingDays,
    };
  }

  /**
   * Constrói Map<numericId, publicId> dos GanttResourceNode dum projecto.
   * Usado para hidratar `task.ownerIds` (ints stringified em BD) para
   * publicIds (UUIDs) no wire format. A coluna BD continua a guardar ints
   * para reversibilidade — só o wire muda.
   */
  private async buildNodeIdToPublicIdMap(projectId: number): Promise<Map<number, string>> {
    const nodes = await this.prisma.ganttResourceNode.findMany({
      where: { projectId },
      select: { id: true, publicId: true },
    });
    const map = new Map<number, string>();
    for (const n of nodes) map.set(n.id, n.publicId);
    return map;
  }

  /**
   * Resolve `owner_id: string[]` recebido do DTO (publicIds UUID) para os
   * ints stringified que `GanttTask.ownerIds` guarda. Lança 400 se algum
   * publicId não pertence a um GanttResourceNode deste projecto.
   *
   * Aceita também ints stringified para retrocompatibilidade durante a
   * transição (o frontend pode estar a cachear payloads antigos).
   */
  private async resolveOwnerIdsFromPublicIds(
    projectId: number,
    inputIds: string[],
  ): Promise<string[]> {
    if (inputIds.length === 0) return [];
    // Separa publicIds (UUIDs) de ints stringified legacy.
    const uuids: string[] = [];
    const ints: string[] = [];
    for (const id of inputIds) {
      if (/^\d+$/.test(id)) ints.push(id);
      else uuids.push(id);
    }

    const result: string[] = [...ints]; // legacy passa-através

    if (uuids.length > 0) {
      const nodes = await this.prisma.ganttResourceNode.findMany({
        where: { projectId, publicId: { in: uuids } },
        select: { id: true, publicId: true },
      });
      const found = new Set(nodes.map((n) => n.publicId));
      const missing = uuids.filter((u) => !found.has(u));
      if (missing.length > 0) {
        throw new AppException('INVALID_OWNER_ID', HttpStatus.BAD_REQUEST);
      }
      for (const n of nodes) result.push(String(n.id));
    }

    return result;
  }

  // ── Tasks ───────────────────────────────────────────────────────────────────

  async createTask(projectPublicId: string, dto: CreateTaskDto, requestingUser?: JwtPayload) {
    const projectId = await this.resolveProjectId(projectPublicId);
    this.validateTaskConstraints(dto.type, dto.duration, dto.progress);

    const durationUnit: GanttTaskDurationUnit = dto.durationUnit ?? GanttTaskDurationUnit.DAY;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workHours: true },
    });
    const workHours = resolveWorkHours(project?.workHours);

    const startDate = parseGanttDate(dto.start_date);
    const constraintDate = dto.constraint_date
      ? parseGanttDate(dto.constraint_date)
      : undefined;

    const nonWorkingDays = await this.holidaysService.getNonWorkingDaysForProject(projectId);
    const nonWorkingSet = new Set(nonWorkingDays);

    let endDate: Date;

    // Cap configurável (PlatformLimits) — converte HOUR ↔ dias úteis via workHours.
    const maxBusinessDays = await this.platformConfig.getMaxTaskBusinessDays();
    assertTaskDurationWithinLimit(dto.duration, durationUnit, workHours, maxBusinessDays);

    if (durationUnit === GanttTaskDurationUnit.HOUR) {
      this.assertStartWithinWorkHours(startDate, workHours);
      endDate = addBusinessHoursInclusive(startDate, dto.duration, workHours, nonWorkingSet);
    } else {
      // DAY (legacy): addBusinessDaysInclusive + endDateMode.
      const lastBusinessDay = addBusinessDaysInclusive(startDate, dto.duration, nonWorkingSet);
      endDate = dto.endDateMode === 'inclusive'
        ? lastBusinessDay
        : new Date(lastBusinessDay.getTime() + 86400000);
    }
    this.assertEndDateInRange(endDate);

    // Atribuir automaticamente a coluna INITIAL (TODO) para tarefas tipo 'task'.
    // Tarefas do tipo 'project' ou 'milestone' não aparecem no board (não precisam).
    const effectiveType = dto.type ?? 'task';
    let boardColumnId: number | null = null;
    let boardPosition: number | null = null;
    if (effectiveType === 'task') {
      boardColumnId = await this.statesService.getInitialColumnId(projectId);
      if (boardColumnId !== null) {
        const tail = await this.prisma.ganttTask.count({
          where: { boardColumnId },
        });
        boardPosition = tail;
      }
    }

    // Resolver parentId: aceita id numérico (flow Planning/Gantt) ou publicId UUID (flow Board)
    let resolvedParentId: number | null = null;
    if (dto.parent && dto.parent !== 0) {
      resolvedParentId = dto.parent;
    } else if (dto.parentPublicId) {
      const parentTask = await this.prisma.ganttTask.findUnique({
        where: { publicId: dto.parentPublicId },
        select: { id: true },
      });
      resolvedParentId = parentTask?.id ?? null;
    }

    // owner_id no DTO chega em publicIds UUIDs — converter para ints
    // stringified (formato persistido na coluna `ownerIds`).
    const ownerIdsToStore = dto.owner_id
      ? await this.resolveOwnerIdsFromPublicIds(projectId, dto.owner_id)
      : [];

    const task = await this.prisma.ganttTask.create({
      data: {
        projectId,
        text: dto.text,
        type: effectiveType,
        startDate,
        endDate,
        duration: dto.duration,
        durationUnit,
        progress: dto.progress ?? 0,
        ownerIds: ownerIdsToStore,
        parentId: resolvedParentId,
        priority: dto.priority ?? null,
        constraintType: dto.constraint_type ?? null,
        constraintDate: constraintDate ?? null,
        boardColumnId,
        boardPosition,
      },
    });

    // Notificar owners atribuídos na criação. `notifyNewOwners` espera ints
    // stringified (matches em GanttResourceNode.id) — usa o array já resolvido.
    if (requestingUser && ownerIdsToStore.length > 0) {
      const projectMeta = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { publicId: true },
      });
      const requester = await this.prisma.user.findUnique({
        where: { id: requestingUser.sub },
        select: { name: true },
      });
      const assignerName = requester?.name ?? 'Alguém';
      await this.notifyNewOwners(
        ownerIdsToStore,
        [],
        task.publicId,
        task.text,
        projectMeta!.publicId,
        assignerName,
      );
    }

    const nodeMap = await this.buildNodeIdToPublicIdMap(projectId);
    return this.serializeTask(task, 0, nodeMap);
  }

  async updateTask(taskPublicId: string, dto: UpdateTaskDto, requestingUser?: JwtPayload) {
    const id = await this.resolveTaskId(taskPublicId);

    const existing = await this.prisma.ganttTask.findUnique({ where: { id } });
    if (!existing) throw new AppException('TASK_NOT_FOUND', HttpStatus.NOT_FOUND);

    const effectiveType = dto.type ?? existing.type;
    const effectiveDuration = dto.duration ?? existing.duration;
    const effectiveProgress = dto.progress ?? existing.progress;
    this.validateTaskConstraints(effectiveType, effectiveDuration, effectiveProgress);

    if (dto.parent !== undefined && dto.parent === id) {
      throw new AppException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
    }

    const project = await this.prisma.project.findUnique({
      where: { id: existing.projectId },
      select: { workHours: true },
    });
    const workHours = resolveWorkHours(project?.workHours);
    const effUnit = dto.durationUnit ?? existing.durationUnit;

    const data: Record<string, unknown> = {};
    if (dto.text !== undefined) data.text = dto.text;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.start_date !== undefined) data.startDate = parseGanttDate(dto.start_date);
    if (dto.duration !== undefined) data.duration = dto.duration;
    if (dto.durationUnit !== undefined) data.durationUnit = dto.durationUnit;
    if (dto.progress !== undefined) data.progress = dto.progress;
    // owner_id chega em publicIds UUIDs — converter para ints stringified.
    if (dto.owner_id !== undefined) {
      data.ownerIds = await this.resolveOwnerIdsFromPublicIds(existing.projectId, dto.owner_id);
    }
    if (dto.parent !== undefined)
      data.parentId = dto.parent !== 0 ? dto.parent : null;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.constraint_type !== undefined) data.constraintType = dto.constraint_type;
    if (dto.constraint_date !== undefined)
      data.constraintDate = parseGanttDate(dto.constraint_date);

    // Calcular endDate sempre que startDate, duration ou durationUnit forem actualizados.
    // Ramifica conforme a unidade efectiva (DTO ou existente).
    if (
      dto.start_date !== undefined ||
      dto.duration !== undefined ||
      dto.durationUnit !== undefined
    ) {
      const effStart = dto.start_date ? parseGanttDate(dto.start_date) : existing.startDate;
      const effDur   = dto.duration  ?? existing.duration;
      const nonWorkingDays = await this.holidaysService.getNonWorkingDaysForProject(existing.projectId);
      const nonWorkingSet = new Set(nonWorkingDays);

      const maxBusinessDays = await this.platformConfig.getMaxTaskBusinessDays();
      assertTaskDurationWithinLimit(effDur, effUnit, workHours, maxBusinessDays);

      if (effUnit === GanttTaskDurationUnit.HOUR) {
        // Só validar quando o user tocou no start. Tasks legacy podem ter
        // startDate fora da janela e um resize-direita (sem dto.start_date)
        // não deve ser bloqueado por isso.
        if (dto.start_date !== undefined) {
          this.assertStartWithinWorkHours(effStart, workHours);
        }
        data.endDate = addBusinessHoursInclusive(effStart, effDur, workHours, nonWorkingSet);
      } else {
        const lastBusinessDay = addBusinessDaysInclusive(effStart, effDur, nonWorkingSet);
        data.endDate = dto.endDateMode === 'inclusive'
          ? lastBusinessDay
          : new Date(lastBusinessDay.getTime() + 86400000);
      }
      this.assertEndDateInRange(data.endDate as Date);
    }

    const previousOwnerIds = existing.ownerIds;
    const task = await this.prisma.ganttTask.update({ where: { id }, data });

    // Notificar novos owners — ambos os arrays em ints stringified
    // (post-resolução). `data.ownerIds` é o array que foi gravado.
    if (requestingUser && dto.owner_id !== undefined) {
      const projectRecord = await this.prisma.project.findUnique({
        where: { id: existing.projectId },
        select: { publicId: true },
      });
      const requester = await this.prisma.user.findUnique({
        where: { id: requestingUser.sub },
        select: { name: true },
      });
      const assignerName = requester?.name ?? 'Alguém';
      const newOwnerIds = (data.ownerIds as string[]) ?? [];
      await this.notifyNewOwners(
        newOwnerIds,
        previousOwnerIds,
        task.publicId,
        task.text,
        projectRecord!.publicId,
        assignerName,
      );
    }

    const nodeMap = await this.buildNodeIdToPublicIdMap(existing.projectId);
    return this.serializeTask(task, 0, nodeMap);
  }

  /**
   * Recalcula endDate de todas as tarefas do projecto. Tasks DAY usam o
   * `endDateMode` recebido (inclusive/exclusive); tasks HOUR usam o
   * `workHours` actual do projecto (refresca se o user mudou a janela útil).
   */
  async recalculateEndDates(
    projectPublicId: string,
    endDateMode: string,
  ): Promise<{ affected: number }> {
    const projectId = await this.resolveProjectId(projectPublicId);

    const tasks = await this.prisma.ganttTask.findMany({
      where: { projectId },
      select: { id: true, startDate: true, duration: true, durationUnit: true },
    });

    const nonWorkingDays = await this.holidaysService.getNonWorkingDaysForProject(projectId);
    const nonWorkingSet = new Set(nonWorkingDays);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { workHours: true },
    });
    const workHours = resolveWorkHours(project?.workHours);

    await this.prisma.$transaction(
      tasks.map((t) => {
        let endDate: Date;
        if (t.durationUnit === GanttTaskDurationUnit.HOUR) {
          endDate = addBusinessHoursInclusive(t.startDate, t.duration, workHours, nonWorkingSet);
        } else {
          const lastBusinessDay = addBusinessDaysInclusive(t.startDate, t.duration, nonWorkingSet);
          endDate = endDateMode === 'inclusive'
            ? lastBusinessDay
            : new Date(lastBusinessDay.getTime() + 86400000);
        }
        return this.prisma.ganttTask.update({
          where: { id: t.id },
          data: { endDate },
        });
      }),
    );

    return { affected: tasks.length };
  }

  private async notifyNewOwners(
    newOwnerIds: string[],
    previousOwnerIds: string[],
    taskPublicId: string,
    taskName: string,
    projectPublicId: string,
    assignerName: string,
  ): Promise<void> {
    const addedIds = newOwnerIds.filter((id) => !previousOwnerIds.includes(id));
    if (!addedIds.length) return;
    const numericIds = addedIds.map((id) => parseInt(id, 10)).filter((n) => !isNaN(n));
    if (!numericIds.length) return;
    const nodes = await this.prisma.ganttResourceNode.findMany({
      where: { id: { in: numericIds } },
      select: { userId: true },
    });
    for (const node of nodes) {
      if (!node.userId) continue;
      this.notificationsService
        .createTaskAssignedNotification(assignerName, node.userId, projectPublicId, taskPublicId, taskName)
        .catch(() => {/* silent */});
    }
  }

  async deleteTask(taskPublicId: string) {
    const id = await this.resolveTaskId(taskPublicId);

    const existing = await this.prisma.ganttTask.findUnique({ where: { id } });
    if (!existing) throw new AppException('TASK_NOT_FOUND', HttpStatus.NOT_FOUND);

    await this.deleteTaskCascade(id);
    return { deleted: id };
  }

  private async deleteTaskCascade(id: number): Promise<void> {
    const children = await this.prisma.ganttTask.findMany({
      where: { parentId: id },
      select: { id: true },
    });

    for (const child of children) {
      await this.deleteTaskCascade(child.id);
    }

    await this.prisma.ganttTask.delete({ where: { id } });
  }

  // ── Links ───────────────────────────────────────────────────────────────────

  async createLink(dto: CreateLinkDto) {
    if (dto.source === dto.target) {
      throw new AppException('LINK_CYCLE_DETECTED', HttpStatus.BAD_REQUEST);
    }

    const [src, tgt] = await Promise.all([
      this.prisma.ganttTask.findUnique({ where: { id: dto.source } }),
      this.prisma.ganttTask.findUnique({ where: { id: dto.target } }),
    ]);
    if (!src) throw new AppException('TASK_NOT_FOUND', HttpStatus.NOT_FOUND);
    if (!tgt) throw new AppException('TASK_NOT_FOUND', HttpStatus.NOT_FOUND);

    const hasCycle = await this.wouldCreateCycle(dto.source, dto.target);
    if (hasCycle) {
      throw new AppException('LINK_CYCLE_DETECTED', HttpStatus.BAD_REQUEST);
    }

    const link = await this.prisma.ganttLink.create({
      data: {
        sourceId: dto.source,
        targetId: dto.target,
        type: dto.type ?? '0',
        lag: dto.lag ?? 0,
      },
    });

    return this.serializeLink(link);
  }

  async updateLink(linkPublicId: string, dto: UpdateLinkDto) {
    const id = await this.resolveLinkId(linkPublicId);

    const existing = await this.prisma.ganttLink.findUnique({ where: { id } });
    if (!existing) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);

    const data: Record<string, unknown> = {};
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.lag !== undefined) data.lag = dto.lag;

    const link = await this.prisma.ganttLink.update({ where: { id }, data });
    return this.serializeLink(link);
  }

  async deleteLink(linkPublicId: string) {
    const id = await this.resolveLinkId(linkPublicId);

    const existing = await this.prisma.ganttLink.findUnique({ where: { id } });
    if (!existing) throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);

    await this.prisma.ganttLink.delete({ where: { id } });
    return { deleted: id };
  }

  // ── Resources ───────────────────────────────────────────────────────────────

  /** Serializa um GanttResource para o formato de resposta da API */
  private serializeResource(r: {
    id: number;
    publicId: string;
    text: string;
    parentId: number | null;
    userId: number | null;
    hoursPerDay: number;
    userType: { publicId: string; code: string; label: string } | null;
  }) {
    return {
      id: r.id,
      publicId: r.publicId,
      text: r.text,
      parent: r.parentId ?? 0,
      userId: r.userId ?? undefined,
      hoursPerDay: r.hoursPerDay,
      userType: r.userType ?? undefined,
    };
  }

  async getResources(projectPublicId: string) {
    const projectId = await this.resolveProjectId(projectPublicId);

    const resources = await this.prisma.ganttResource.findMany({
      where: { projectId },
      orderBy: { id: 'asc' },
      include: { userType: { select: { publicId: true, code: true, label: true } } },
    });

    return resources.map((r) => this.serializeResource(r));
  }

  async createResource(projectPublicId: string, dto: CreateResourceDto) {
    const projectId = await this.resolveProjectId(projectPublicId);
    const userTypeId = await this.resolveUserTypeId(dto.userTypeId);

    const resource = await this.prisma.ganttResource.create({
      data: {
        text: dto.text,
        parentId: dto.parentId ?? null,
        userId: dto.userId ?? null,
        hoursPerDay: dto.hoursPerDay ?? 8,
        userTypeId,
        projectId,
      },
      include: { userType: { select: { publicId: true, code: true, label: true } } },
    });

    // Sync resource nodes so the new external resource appears in the Gantt tree
    await this.syncResourceNodes(projectId);

    return this.serializeResource(resource);
  }

  async updateResource(resourcePublicId: string, dto: UpdateResourceDto) {
    const id = await this.resolveResourceId(resourcePublicId);

    const existing = await this.prisma.ganttResource.findUnique({ where: { id } });
    if (!existing) throw new AppException('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND);

    const data: Record<string, unknown> = {};
    if (dto.text !== undefined) data.text = dto.text;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.userId !== undefined) data.userId = dto.userId;
    if (dto.hoursPerDay !== undefined) data.hoursPerDay = dto.hoursPerDay;
    if (dto.userTypeId !== undefined) {
      data.userTypeId = await this.resolveUserTypeId(dto.userTypeId);
    }

    const resource = await this.prisma.ganttResource.update({
      where: { id },
      data,
      include: { userType: { select: { publicId: true, code: true, label: true } } },
    });

    // Sync resource nodes to reflect changes in the Gantt tree
    if (existing.projectId) await this.syncResourceNodes(existing.projectId);

    return this.serializeResource(resource);
  }

  async deleteResource(resourcePublicId: string) {
    const id = await this.resolveResourceId(resourcePublicId);

    const existing = await this.prisma.ganttResource.findUnique({ where: { id } });
    if (!existing) throw new AppException('RESOURCE_NOT_FOUND', HttpStatus.NOT_FOUND);

    await this.prisma.ganttResource.delete({ where: { id } });

    // Sync to remove orphaned node from the Gantt tree
    if (existing.projectId) await this.syncResourceNodes(existing.projectId);

    return { deleted: id };
  }

  // ── Member Hours ────────────────────────────────────────────────────────────

  async getMemberHours(projectPublicId: string) {
    const projectId = await this.resolveProjectId(projectPublicId);

    const rows = await this.prisma.projectMemberHours.findMany({
      where: { projectId },
      include: { user: { select: { publicId: true } } },
    });
    return rows.map((r) => ({ userPublicId: r.user.publicId, hoursPerDay: r.hoursPerDay }));
  }

  async upsertMemberHours(projectPublicId: string, userPublicId: string, hoursPerDay: number) {
    if (hoursPerDay < 0 || hoursPerDay > 24) {
      throw new AppException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
    }

    const [projectId, userId] = await Promise.all([
      this.resolveProjectId(projectPublicId),
      this.resolveUserId(userPublicId),
    ]);

    const row = await this.prisma.projectMemberHours.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, hoursPerDay },
      update: { hoursPerDay },
    });
    return { userPublicId, hoursPerDay: row.hoursPerDay };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private validateTaskConstraints(
    type: string | undefined,
    duration: number | undefined,
    progress: number | undefined,
  ) {
    if (type === 'milestone' && duration !== undefined && duration !== 0) {
      throw new AppException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
    }
    if (progress !== undefined && (progress < 0 || progress > 1)) {
      throw new AppException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
    }
    // Negative durations só são bloqueadas aqui; o cap superior é
    // configurável via PlatformLimits.maxTaskBusinessDays (PLATFORM_ADMIN)
    // e aplicado por `assertTaskDurationWithinLimit` no service.
    if (duration !== undefined && duration < 0) {
      throw new AppException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Tasks HOUR: bloqueia startDate fora da janela útil do projecto. Sem isto,
   * o `addBusinessHoursInclusive` salta silenciosamente para a próxima abertura
   * útil e a barra do widget aparece estendida desde a hora "morta" (ex.: user
   * cria às 02:00 com workHours 9–18 e duration=2h → endDate=11:00, mas a barra
   * vai de 02:00 a 11:00 visualmente).
   */
  private assertStartWithinWorkHours(
    startDate: Date,
    workHours: { start: number; end: number },
  ) {
    const hour = startDate.getUTCHours() + startDate.getUTCMinutes() / 60;
    if (hour < workHours.start || hour >= workHours.end) {
      throw new AppException('START_OUTSIDE_WORK_HOURS', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Validação de range absoluto da `endDate` calculada — bloqueia gravação
   * se a data resultante cair fora de [now-5y, now+10y]. Última linha de
   * defesa após a duração já estar capada.
   */
  private assertEndDateInRange(endDate: Date) {
    const now = Date.now();
    const minMs = now - 5  * 365 * 86400000;
    const maxMs = now + 10 * 365 * 86400000;
    const t = endDate.getTime();
    if (t < minMs || t > maxMs) {
      throw new AppException('VALIDATION_FAILED', HttpStatus.BAD_REQUEST);
    }
  }

  private async wouldCreateCycle(
    sourceId: number,
    targetId: number,
  ): Promise<boolean> {
    const visited = new Set<number>();
    const queue = [targetId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === sourceId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const outgoing = await this.prisma.ganttLink.findMany({
        where: { sourceId: current },
        select: { targetId: true },
      });
      queue.push(...outgoing.map((l) => l.targetId));
    }

    return false;
  }

  // ── Serializers (used by responses and by GanttService) ─────────────────────

  serializeTask(t: {
    id: number;
    publicId: string;
    text: string;
    type: string;
    startDate: Date;
    endDate: Date | null;
    duration: number;
    durationUnit: GanttTaskDurationUnit;
    progress: number;
    ownerIds: string[];
    parentId: number | null;
    priority: number | null;
    constraintType: string | null;
    constraintDate: Date | null;
    boardPosition?: number | null;
    boardColumn?: { publicId: string } | null;
    boardSwimlane?: { publicId: string } | null;
  }, commentCount = 0, nodeIdToPublicId?: Map<number, string>) {
    // owner_id wire format: publicIds (UUIDs) do GanttResourceNode. A coluna
    // BD `ownerIds` continua a guardar ints stringified — convertemos na
    // boundary para evitar leak de IDs internos. Se o map não for fornecido
    // (ex.: chamadas isoladas de createTask/updateTask) devolvemos sem
    // conversão; o caller responsável por hidratar.
    const ownerWire = nodeIdToPublicId
      ? t.ownerIds
          .map((id) => nodeIdToPublicId.get(parseInt(id, 10)) ?? null)
          .filter((id): id is string => id !== null)
      : t.ownerIds;
    return {
      id: t.id,
      publicId: t.publicId,
      text: t.text,
      type: t.type,
      start_date: formatGanttDate(t.startDate),
      end_date: formatGanttDate(t.endDate ?? (
        t.durationUnit === GanttTaskDurationUnit.HOUR
          ? new Date(t.startDate.getTime() + t.duration * 3_600_000)
          : new Date(t.startDate.getTime() + t.duration * 24 * 60 * 60 * 1000)
      )),
      duration: t.duration,
      durationUnit: t.durationUnit,
      progress: t.progress,
      owner_id: ownerWire,
      parent: t.parentId ?? 0,
      priority: t.priority ?? undefined,
      constraint_type: t.constraintType ?? undefined,
      constraint_date: t.constraintDate
        ? formatGanttDate(t.constraintDate)
        : undefined,
      boardColumn: t.boardColumn?.publicId ?? null,
      boardSwimlane: t.boardSwimlane?.publicId ?? null,
      boardPosition: t.boardPosition ?? null,
      commentCount,
    };
  }

  serializeLink(l: {
    id: number;
    publicId: string;
    sourceId: number;
    targetId: number;
    type: string;
    lag: number;
  }) {
    return {
      id: String(l.id),
      publicId: l.publicId,
      source: l.sourceId,
      target: l.targetId,
      type: l.type,
      lag: l.lag,
    };
  }
}
