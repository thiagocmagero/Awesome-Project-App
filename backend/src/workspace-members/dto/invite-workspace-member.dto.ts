import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

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
}
