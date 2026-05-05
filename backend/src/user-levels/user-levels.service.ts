import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserLevelDto } from './dto/create-user-level.dto';
import { UpdateUserLevelDto } from './dto/update-user-level.dto';

const SELECT = { id: true, publicId: true, code: true, label: true, order: true, status: true, createdAt: true, updatedAt: true } as const;

@Injectable()
export class UserLevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.userLevel.findMany({
      where: { status: { not: Status.ARCHIVED } },
      orderBy: { order: 'asc' },
      select: SELECT,
    });
  }

  async findOne(publicId: string) {
    const item = await this.prisma.userLevel.findUnique({ where: { publicId }, select: SELECT });
    if (!item) throw new NotFoundException(`UserLevel '${publicId}' não encontrado.`);
    return item;
  }

  async create(dto: CreateUserLevelDto) {
    const code = dto.code.toUpperCase().replace(/\s+/g, '_');
    const existing = await this.prisma.userLevel.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`Código '${code}' já existe.`);

    return this.prisma.userLevel.create({
      data: { code, label: dto.label, order: dto.order ?? 0 },
      select: SELECT,
    });
  }

  async update(publicId: string, dto: UpdateUserLevelDto) {
    const item = await this.findOne(publicId);
    return this.prisma.userLevel.update({ where: { id: item.id }, data: dto, select: SELECT });
  }

  async remove(publicId: string) {
    const item = await this.findOne(publicId);
    return this.prisma.userLevel.update({
      where: { id: item.id },
      data: { status: Status.INACTIVE },
      select: SELECT,
    });
  }
}
