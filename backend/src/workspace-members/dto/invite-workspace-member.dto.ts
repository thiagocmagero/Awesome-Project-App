import {
  ArrayMaxSize,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Atribuição opcional de projecto enviada juntamente com o convite ao workspace.
 *
 * Quando presente, o `inviteMember` do `WorkspaceMembersService` cria também as
 * linhas `ProjectMember` (status `INVITED`) para os projectos seleccionados,
 * tudo na mesma transacção do `WorkspaceMember`. O mesmo token
 * `ACCOUNT_INVITE` cobre o workspace e os projectos — o flow
 * `createAccountFromInvite` faz match por email no acceptance.
 */
export class InviteProjectAssignmentDto {
  @IsUUID()
  projectPublicId!: string;

  @IsIn(['CONTRIBUTOR', 'READER'])
  role!: 'CONTRIBUTOR' | 'READER';
}

export class InviteWorkspaceMemberDto {
  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  /** Nível inicial. Default BASIC se omitido. LICENSED valida seats antes de criar. */
  @IsOptional()
  @IsIn(['BASIC', 'LICENSED'])
  memberType?: 'BASIC' | 'LICENSED';

  /**
   * Tipo funcional desempenhado pelo convidado em cada projecto seleccionado
   * (DEVELOPER, QA, etc.). Aplicado a TODAS as linhas `ProjectMember` criadas
   * neste convite. O UserType tem de pertencer ao mesmo workspace ou ser
   * platform-level (`workspaceId: null`). Ignorado se `projects` está vazio.
   */
  @IsOptional()
  @IsUUID()
  userTypePublicId?: string;

  /**
   * Lista opcional de projectos a anexar ao convite. Para emails sem conta,
   * as `ProjectMember` rows são criadas com `userId: null` e são linkadas
   * automaticamente em `auth/create-account-from-invite` por match de email.
   */
  @IsOptional()
  @ValidateNested({ each: true })
  @ArrayMaxSize(50)
  @Type(() => InviteProjectAssignmentDto)
  projects?: InviteProjectAssignmentDto[];
}
