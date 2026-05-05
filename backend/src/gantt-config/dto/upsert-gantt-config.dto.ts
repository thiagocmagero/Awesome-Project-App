import { IsObject, IsOptional } from 'class-validator';

export class UpsertGanttConfigDto {
  @IsObject()
  columns!: {
    start_date: boolean;
    end_date: boolean;
    owner: boolean;
    duration: boolean;
    priority?: boolean;
  };

  @IsOptional()
  @IsObject()
  colors?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  behavior?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  defaults?: Record<string, unknown>;
}
