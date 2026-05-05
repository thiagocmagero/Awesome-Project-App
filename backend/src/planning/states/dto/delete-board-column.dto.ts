import { IsOptional, IsUUID } from 'class-validator';

export class DeleteBoardColumnDto {
  /**
   * publicId da coluna de destino para as tarefas existentes.
   * Obrigatório se a coluna tiver tarefas associadas.
   */
  @IsOptional()
  @IsUUID()
  targetColumnPublicId?: string;
}
