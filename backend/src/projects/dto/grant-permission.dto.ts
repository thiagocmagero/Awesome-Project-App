import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class GrantPermissionDto {
  @IsString()
  action!: string;

  /** Conceder a um role (CONTRIBUTOR ou READER) */
  @IsString()
  @IsOptional()
  grantedToRole?: string;

  /** Conceder a um membro individual (publicId do user) */
  @IsUUID()
  @IsOptional()
  grantedToUserPublicId?: string;
}
