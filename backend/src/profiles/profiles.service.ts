import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.profile.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { id: 'asc' },
      select: { id: true, publicId: true, code: true, label: true, description: true, status: true },
    });
  }

  async findOne(publicId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { publicId },
      select: { id: true, publicId: true, code: true, label: true, description: true, status: true },
    });
    if (!profile) throw new NotFoundException(`Profile '${publicId}' não encontrado.`);
    return profile;
  }
}
