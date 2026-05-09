import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { TaskDurationUnit } from '@prisma/client';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  text?: string;

  /** Descrição rica/longa (opcional). String vazia limpa o valor. */
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;

  /** Formato Gantt: "DD-MM-YYYY HH:mm" */
  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  /**
   * Unidade da duração. Default DAY (retrocompat).
   * Ver docs/claude/tools/gantt/data-model.md.
   */
  @IsOptional()
  @IsEnum(TaskDurationUnit)
  durationUnit?: TaskDurationUnit;

  @IsOptional()
  @IsNumber()
  @Min(0)
  progress?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  owner_id?: string[];

  @IsOptional()
  @IsInt()
  parent?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  priority?: number;

  @IsOptional()
  @IsString()
  constraint_type?: string;

  @IsOptional()
  @IsString()
  constraint_date?: string;

  /** "inclusive" | "exclusive" — modo de data de fim activo no cliente */
  @IsOptional()
  @IsString()
  endDateMode?: string;
}
