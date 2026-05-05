import { IsEnum, IsOptional } from 'class-validator';
import { ProjectRole } from '@prisma/client';

export class UpdateMemberDto {
  /** Novo papel do membro no projeto (CONTRIBUTOR ou READER) */
  @IsEnum(ProjectRole)
  @IsOptional()
  role?: ProjectRole;
}
