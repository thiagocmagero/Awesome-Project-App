import { IsInt, IsOptional, IsUUID, Min, ValidateIf } from 'class-validator';

export class MoveCardDto {
  /** publicId da coluna de destino — null para mover para "sem coluna" */
  @IsOptional()
  @IsUUID()
  columnPublicId?: string | null;

  /** Posição dentro da coluna (0-based) */
  @IsInt()
  @Min(0)
  position!: number;

  /**
   * publicId da swimlane de destino.
   * - Omitido (undefined) = manter swimlane actual
   * - null = swimlane default (sem swimlane)
   * - string UUID = swimlane específica
   */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID()
  swimlanePublicId?: string | null;
}
