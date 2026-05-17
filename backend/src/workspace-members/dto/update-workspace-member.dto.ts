import { IsIn, IsOptional, IsUUID, ValidateIf } from 'class-validator';

export class UpdateWorkspaceMemberDto {
  @IsOptional()
  @IsIn(['BASIC', 'LICENSED'])
  memberType?: 'BASIC' | 'LICENSED';

  /**
   * Tipo funcional default no workspace. `null` para limpar, `undefined` para
   * não tocar. Tem de pertencer ao mesmo workspace ou ser platform-level
   * (`workspaceId: null`).
   */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  userTypePublicId?: string | null;
}
