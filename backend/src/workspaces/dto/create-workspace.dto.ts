import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
}
