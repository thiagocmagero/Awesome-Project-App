import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma, Tag } from '@prisma/client';
import { AppException } from '../common/exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';

const TAG_NAME_MIN = 1;
const TAG_NAME_MAX = 50;
const TAG_NAME_REGEX = /^[\p{L}\p{N}\s\-_.]+$/u;

export interface TagResponse {
  publicId: string;
  name: string;
}

/** Cliente Prisma normal ou dentro de transacção. */
type PrismaLike = PrismaService | Prisma.TransactionClient;

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normaliza um nome de tag: trim + UPPERCASE.
   * Valida tamanho e charset. Lança 400 em caso de violação.
   */
  normalize(name: string): string {
    if (typeof name !== 'string') {
      throw new AppException('TAG_NAME_INVALID', HttpStatus.BAD_REQUEST);
    }
    const trimmed = name.trim();
    if (trimmed.length < TAG_NAME_MIN) {
      throw new AppException('TAG_NAME_TOO_SHORT', HttpStatus.BAD_REQUEST);
    }
    if (trimmed.length > TAG_NAME_MAX) {
      throw new AppException('TAG_NAME_TOO_LONG', HttpStatus.BAD_REQUEST);
    }
    if (!TAG_NAME_REGEX.test(trimmed)) {
      throw new AppException('TAG_NAME_INVALID_CHARS', HttpStatus.BAD_REQUEST);
    }
    return trimmed.toUpperCase();
  }

  /** Lista tags ACTIVE do workspace, ordenadas por nome. */
  async listForWorkspace(workspaceId: number): Promise<TagResponse[]> {
    const tags = await this.prisma.tag.findMany({
      where: { workspaceId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { publicId: true, name: true },
    });
    return tags;
  }

  /**
   * Para cada nome bruto, normaliza e faz upsert no workspace. Devolve as tags
   * persistidas (existentes ou recém-criadas). Idempotente, race-safe pela
   * unique constraint `[workspaceId, name]`.
   */
  async resolveOrCreate(
    workspaceId: number,
    rawNames: string[],
    createdById: number | null,
    client: PrismaLike = this.prisma,
  ): Promise<Tag[]> {
    if (!rawNames || rawNames.length === 0) return [];

    // Dedupe normalized names
    const normalized = Array.from(new Set(rawNames.map((n) => this.normalize(n))));

    const result: Tag[] = [];
    for (const name of normalized) {
      const tag = await client.tag.upsert({
        where: { workspaceId_name: { workspaceId, name } },
        create: { workspaceId, name, createdById },
        update: {},
      });
      result.push(tag);
    }
    return result;
  }

  /**
   * Substitui o conjunto de tags duma task. Resolve publicIds → ids,
   * verifica que todas as tags pertencem ao `workspaceId` esperado (defesa
   * contra cross-workspace), e replaceia o set num único transação.
   */
  async setTaskTags(
    taskId: number,
    workspaceId: number,
    tagPublicIds: string[],
    client: PrismaLike = this.prisma,
  ): Promise<void> {
    let tagIds: number[] = [];
    if (tagPublicIds.length > 0) {
      const unique = Array.from(new Set(tagPublicIds));
      const tags = await client.tag.findMany({
        where: { publicId: { in: unique }, workspaceId },
        select: { id: true },
      });
      if (tags.length !== unique.length) {
        throw new AppException('TAG_NOT_FOUND', HttpStatus.BAD_REQUEST);
      }
      tagIds = tags.map((t) => t.id);
    }

    await client.taskTag.deleteMany({ where: { taskId } });
    if (tagIds.length > 0) {
      await client.taskTag.createMany({
        data: tagIds.map((tagId) => ({ taskId, tagId })),
        skipDuplicates: true,
      });
    }
  }

  /**
   * Helper end-to-end usado pelo PlanningService: resolve `newNames` (criação
   * inline), une com `existingPublicIds`, e aplica à task. Tudo num único
   * `prisma.$transaction` para garantir atomicidade.
   *
   * Devolve as tags efectivas aplicadas, prontas a serializar na resposta.
   */
  async applyTagsToTask(
    taskId: number,
    workspaceId: number,
    existingPublicIds: string[],
    newNames: string[],
    createdById: number | null,
  ): Promise<TagResponse[]> {
    return this.prisma.$transaction(async (tx) => {
      const created = await this.resolveOrCreate(workspaceId, newNames, createdById, tx);
      const allPublicIds = [
        ...existingPublicIds,
        ...created.map((t) => t.publicId),
      ];
      await this.setTaskTags(taskId, workspaceId, allPublicIds, tx);

      const tags = await tx.tag.findMany({
        where: { tasks: { some: { taskId } } },
        orderBy: { name: 'asc' },
        select: { publicId: true, name: true },
      });
      return tags;
    });
  }

  /** Devolve as tags actuais da task (ordenadas por nome). */
  async getTagsForTask(taskId: number): Promise<TagResponse[]> {
    const tags = await this.prisma.tag.findMany({
      where: { tasks: { some: { taskId } } },
      orderBy: { name: 'asc' },
      select: { publicId: true, name: true },
    });
    return tags;
  }
}
