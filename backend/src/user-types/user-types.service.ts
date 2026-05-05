import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Status } from '@prisma/client';
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
  createdAt: true,
  updatedAt: true,
} as const;

const IS_ADMIN = (u: JwtPayload) => u.profileCode === 'PLATFORM_ADMIN';

@Injectable()
export class UserTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(requestingUser: JwtPayload) {
    const where = IS_ADMIN(requestingUser)
      ? { status: { not: Status.ARCHIVED } }
      : { status: { not: Status.ARCHIVED }, ownerId: requestingUser.sub };

    return this.prisma.userType.findMany({
      where,
      orderBy: { id: 'asc' },
      select: SELECT,
    });
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
    const ownerId = IS_ADMIN(requestingUser) ? null : requestingUser.sub;

    // Uniqueness is (code, ownerId) — DB constraint handles this,
    // but we provide a friendly error message
    const existing = await this.prisma.userType.findFirst({
      where: {
        code,
        ownerId: ownerId ?? null,
      },
    });
    if (existing) throw new ConflictException(`Código '${code}' já existe.`);

    return this.prisma.userType.create({
      data: {
        code,
        label: dto.label,
        description: dto.description,
        ownerId,
      },
      select: SELECT,
    });
  }

  async update(publicId: string, dto: UpdateUserTypeDto, requestingUser: JwtPayload) {
    const item = await this.findOne(publicId, requestingUser); // validates ownership
    return this.prisma.userType.update({ where: { id: item.id }, data: dto, select: SELECT });
  }

  /** Soft delete */
  async remove(publicId: string, requestingUser: JwtPayload) {
    const item = await this.findOne(publicId, requestingUser); // validates ownership
    return this.prisma.userType.update({
      where: { id: item.id },
      data: { status: Status.INACTIVE },
      select: SELECT,
    });
  }
}
