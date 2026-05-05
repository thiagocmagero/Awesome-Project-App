import { IsEnum } from 'class-validator';
import { ProjectRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(ProjectRole)
  role!: ProjectRole;
}
