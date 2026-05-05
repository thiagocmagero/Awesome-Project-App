import { IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProjectRole } from '@prisma/client';

export class InviteMemberDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  email!: string;

  /** Papel no projeto — READER por defeito */
  @IsEnum(ProjectRole)
  @IsOptional()
  role?: ProjectRole;

  /** Equipa que o convidado irá integrar quando aceitar (publicId da equipa) */
  @IsUUID()
  @IsOptional()
  teamId?: string;
}
