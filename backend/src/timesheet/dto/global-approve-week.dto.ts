import { IsISO8601, IsUUID } from 'class-validator';

/** Global controller: precisa de saber qual o projecto, daí incluir projectPublicId. */
export class GlobalApproveWeekDto {
  @IsUUID()
  projectPublicId!: string;

  @IsUUID()
  userPublicId!: string;

  @IsISO8601({ strict: true })
  weekStart!: string;
}
