import { IsArray, IsIn, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ProjectAssignmentDto {
  @IsString()
  projectPublicId!: string;

  @IsIn(['OWNER', 'CONTRIBUTOR', 'READER'])
  role!: 'OWNER' | 'CONTRIBUTOR' | 'READER';
}

export class SetWorkspaceMemberProjectsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectAssignmentDto)
  assignments!: ProjectAssignmentDto[];
}
