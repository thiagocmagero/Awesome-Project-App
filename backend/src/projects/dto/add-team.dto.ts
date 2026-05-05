import { IsString, IsUUID } from 'class-validator';

export class AddTeamDto {
  @IsString()
  @IsUUID()
  teamId!: string;
}
