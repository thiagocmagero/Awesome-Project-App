import { IsIn } from 'class-validator';

export class UpdateWorkspaceMemberDto {
  @IsIn(['BASIC', 'LICENSED'])
  memberType!: 'BASIC' | 'LICENSED';
}
