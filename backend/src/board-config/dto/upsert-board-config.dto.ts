import { IsObject, IsOptional } from 'class-validator';

export class UpsertBoardConfigDto {
  /** Densidade, cor primária, accent e estilo de prioridade do widget */
  @IsOptional()
  @IsObject()
  visual?: Record<string, unknown>;

  /** Toggles de comportamento (showSubtasks, showProgress, showDates, etc.) */
  @IsOptional()
  @IsObject()
  behavior?: Record<string, unknown>;

  /** Cores customizadas (ex: { priority: { high, medium, low, none } }) */
  @IsOptional()
  @IsObject()
  colors?: Record<string, unknown>;
}
