import { IsInt, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';

export class MoveTaskStateDto {
  /** publicId do estado de destino — null para remover estado */
  @IsOptional()
  @IsUUID()
  stateId?: string | null;

  /** Posição dentro do estado (0-based). Se omitido, fica no fim. */
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  /**
   * publicId da swimlane de destino (opcional).
   * - undefined = manter swimlane actual
   * - null = mover para swimlane default (sem swimlane)
   * - string UUID = swimlane específica
   */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  swimlaneId?: string | null;
}
