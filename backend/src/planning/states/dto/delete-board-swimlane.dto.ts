import { IsOptional, IsUUID } from 'class-validator';

export class DeleteBoardSwimlaneDto {
  /**
   * publicId da swimlane destino para as tarefas existentes.
   * Se omitido e a swimlane tiver tarefas, estas ficam com `boardSwimlaneId = null` (swimlane default).
   */
  @IsOptional()
  @IsUUID()
  targetSwimlanePublicId?: string;
}
