import { IsObject, IsOptional } from 'class-validator';

export class UpsertCalendarConfigDto {
  /** Toggles de visibilidade das fontes do calendário (sources panel) */
  @IsOptional()
  @IsObject()
  sources?: Record<string, unknown>;

  /** Visão default ("dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek") */
  @IsOptional()
  view?: string;

  /** Primeiro dia da semana — 0=Dom, 1=Seg */
  @IsOptional()
  firstDay?: number;
}
