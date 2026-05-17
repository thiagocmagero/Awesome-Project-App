import {
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Status } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt.strategy';
import { CreateUserTypeDto } from './dto/create-user-type.dto';
import { UpdateUserTypeDto } from './dto/update-user-type.dto';

const SELECT = {
  id: true,
  publicId: true,
  code: true,
  label: true,
  description: true,
  status: true,
  ownerId: true,
  workspaceId: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
} as const;

const SYSTEM_NO_TYPE_CODE = 'NO_TYPE';
const SYSTEM_NO_TYPE_LABEL = 'Sem Tipo';

const IS_ADMIN = (u: JwtPayload) => u.profileCode === 'PLATFORM_ADMIN';

interface PublicUserType {
  publicId: string;
  code: string;
  label: string;
  description: string | null;
  status: Status;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
}

@Injectable()
export class UserTypesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista tipos visíveis ao utilizador — `isSystem: true` fica escondido.
   *  `usageCount` é calculado scoped ao workspace do tipo (não global). */
  async findAll(requestingUser: JwtPayload): Promise<PublicUserType[]> {
    const where = IS_ADMIN(requestingUser)
      ? { status: { not: Status.ARCHIVED }, isSystem: false }
      : { status: { not: Status.ARCHIVED }, isSystem: false, ownerId: requestingUser.sub };

    const rows = await this.prisma.userType.findMany({
      where,
      orderBy: { id: 'asc' },
      select: SELECT,
    });
    // Conta scoped por workspace de cada tipo (paralelo).
    const counts = await Promise.all(
      rows.map((r) => this.countUsageScoped(r.id, r.workspaceId)),
    );
    return rows.map((r, i) => this.toPublic(r, counts[i]));
  }

  async findOne(publicId: string, requestingUser: JwtPayload) {
    const item = await this.prisma.userType.findUnique({ where: { publicId }, select: SELECT });
    if (!item) throw new NotFoundException(`UserType '${publicId}' não encontrado.`);

    if (!IS_ADMIN(requestingUser) && item.ownerId !== requestingUser.sub) {
      throw new ForbiddenException('Sem permissão para aceder a este recurso.');
    }

    return item;
  }

  async create(dto: CreateUserTypeDto, requestingUser: JwtPayload) {
    const code = dto.code.toUpperCase().replace(/\s+/g, '_');
    if (code === SYSTEM_NO_TYPE_CODE) {
      throw new ConflictException(`Código '${SYSTEM_NO_TYPE_CODE}' é reservado.`);
    }
    const ownerId = IS_ADMIN(requestingUser) ? null : requestingUser.sub;
    // Resolve workspace: BASIC users always own a workspace (auto-criado no
    // registo). PLATFORM_ADMIN cria types platform-level (workspaceId=null).
    const workspaceId = ownerId ? await this.resolveDefaultWorkspaceId(ownerId) : null;

    const existing = await this.prisma.userType.findFirst({
      where: { code, workspaceId },
    });
    if (existing) throw new ConflictException(`Código '${code}' já existe.`);

    const row = await this.prisma.userType.create({
      data: { code, label: dto.label, description: dto.description, ownerId, workspaceId },
      select: SELECT,
    });
    return this.toPublic(row, 0);
  }

  async update(publicId: string, dto: UpdateUserTypeDto, requestingUser: JwtPayload) {
    const item = await this.findOne(publicId, requestingUser);
    if (item.isSystem) {
      throw new AppException('CANNOT_EDIT_SYSTEM_TYPE', HttpStatus.CONFLICT);
    }
    const row = await this.prisma.userType.update({
      where: { id: item.id },
      data: dto,
      select: SELECT,
    });
    const usageCount = await this.countUsageScoped(row.id, row.workspaceId);
    return this.toPublic(row, usageCount);
  }

  /**
   * Remoção inteligente:
   * - System types não podem ser removidos (409 `CANNOT_DELETE_SYSTEM_TYPE`).
   * - Se nenhum membro/recurso está associado: HARD DELETE.
   * - Caso contrário: reassigna todas as referências para o "Sem Tipo" do mesmo
   *   workspace/owner (lazy-create) e HARD DELETE o tipo original. Tudo numa
   *   transacção.
   */
  async remove(publicId: string, requestingUser: JwtPayload) {
    const item = await this.findOne(publicId, requestingUser);
    if (item.isSystem) {
      throw new AppException('CANNOT_DELETE_SYSTEM_TYPE', HttpStatus.CONFLICT);
    }

    // Contagens scoped ao workspace do tipo — info criada num workspace fica
    // exclusiva a esse workspace (regra do utilizador, Mai 2026).
    const wsId = item.workspaceId;
    const total = await this.countUsageScoped(item.id, wsId);

    if (total === 0) {
      await this.prisma.userType.delete({ where: { id: item.id } });
      return { deleted: publicId, usageCount: 0, reassignedTo: null };
    }

    // Reassigna SÓ os membros/recursos do mesmo workspace para o "Sem Tipo".
    const noType = await this.getOrCreateSystemNoType(wsId, item.ownerId);
    if (noType.id === item.id) {
      throw new AppException('CANNOT_DELETE_SYSTEM_TYPE', HttpStatus.CONFLICT);
    }

    const userWhere = wsId !== null
      ? { userTypeId: item.id, workspaceMemberships: { some: { workspaceId: wsId } } }
      : { userTypeId: item.id };
    const wmWhere = wsId !== null
      ? { userTypeId: item.id, workspaceId: wsId }
      : { userTypeId: item.id };
    const projectWhereInner = wsId !== null ? { workspaceId: wsId } : {};
    // ProjectMember/TaskResource/TaskResourceNode todos têm relação directa
    // `project` — TaskResourceNode NÃO tem `resource` (a parent reference é
    // outra `TaskResourceNode` via `parent`).
    const projectFkWhere = wsId !== null
      ? { userTypeId: item.id, project: projectWhereInner }
      : { userTypeId: item.id };

    await this.prisma.$transaction([
      this.prisma.user.updateMany({ where: userWhere, data: { userTypeId: noType.id } }),
      this.prisma.workspaceMember.updateMany({ where: wmWhere, data: { userTypeId: noType.id } }),
      this.prisma.projectMember.updateMany({ where: projectFkWhere, data: { userTypeId: noType.id } }),
      this.prisma.taskResource.updateMany({ where: projectFkWhere, data: { userTypeId: noType.id } }),
      this.prisma.taskResourceNode.updateMany({ where: projectFkWhere, data: { userTypeId: noType.id } }),
      this.prisma.userType.delete({ where: { id: item.id } }),
    ]);

    return { deleted: publicId, usageCount: total, reassignedTo: noType.publicId };
  }

  // ── helpers ────────────────────────────────────────────────────────────

  /** Soma de referências em todas as relações que apontam para o `UserType`,
   *  scoped ao workspace do tipo. Garantia da invariante "info criada num
   *  workspace fica exclusiva a esse workspace". */
  private async countUsageScoped(userTypeId: number, workspaceId: number | null): Promise<number> {
    const userWhere = workspaceId !== null
      ? { userTypeId, workspaceMemberships: { some: { workspaceId } } }
      : { userTypeId };
    const wmWhere = workspaceId !== null
      ? { userTypeId, workspaceId }
      : { userTypeId };
    const projectScope = workspaceId !== null ? { workspaceId } : undefined;
    // ProjectMember/TaskResource/TaskResourceNode todos têm relação directa
    // `project` (TaskResourceNode NÃO passa por `resource`).
    const projectFkWhere = projectScope
      ? { userTypeId, project: projectScope }
      : { userTypeId };

    const [users, wm, pm, tr, trn] = await Promise.all([
      this.prisma.user.count({ where: userWhere }),
      this.prisma.workspaceMember.count({ where: wmWhere }),
      this.prisma.projectMember.count({ where: projectFkWhere }),
      this.prisma.taskResource.count({ where: projectFkWhere }),
      this.prisma.taskResourceNode.count({ where: projectFkWhere }),
    ]);
    return users + wm + pm + tr + trn;
  }

  /** Workspace default do owner (mais antigo). Alinhado com `WorkspacesService.getDefaultForUser`. */
  private async resolveDefaultWorkspaceId(ownerId: number): Promise<number | null> {
    const ws = await this.prisma.workspace.findFirst({
      where: { ownerId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return ws?.id ?? null;
  }

  /**
   * Devolve (criando se não existe) o tipo de sistema "Sem Tipo" para o
   * mesmo (workspaceId, ownerId). Esta entidade nunca aparece em listas
   * (filter `isSystem: false` em `findAll`) nem pode ser editada/eliminada
   * (`update`/`remove` rejeitam quando `isSystem: true`).
   *
   * Concurrency: usamos `findFirst` + `create` com try/catch sobre o unique
   * constraint `(code, workspaceId)` para resolver corridas (dois deletes
   * paralelos no mesmo workspace).
   */
  private async getOrCreateSystemNoType(workspaceId: number | null, ownerId: number | null) {
    const existing = await this.prisma.userType.findFirst({
      where: { code: SYSTEM_NO_TYPE_CODE, workspaceId, isSystem: true },
    });
    if (existing) return existing;

    try {
      return await this.prisma.userType.create({
        data: {
          code: SYSTEM_NO_TYPE_CODE,
          label: SYSTEM_NO_TYPE_LABEL,
          ownerId,
          workspaceId,
          isSystem: true,
          status: Status.ACTIVE,
        },
      });
    } catch (err) {
      // Race-condition fallback: outra request já criou nesse instante.
      const racy = await this.prisma.userType.findFirst({
        where: { code: SYSTEM_NO_TYPE_CODE, workspaceId, isSystem: true },
      });
      if (racy) return racy;
      throw err;
    }
  }

  private toPublic(
    row: {
      publicId: string;
      code: string;
      label: string;
      description: string | null;
      status: Status;
      isSystem: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    usageCount: number,
  ): PublicUserType {
    return {
      publicId: row.publicId,
      code: row.code,
      label: row.label,
      description: row.description,
      status: row.status,
      isSystem: row.isSystem,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      usageCount,
    };
  }
}
