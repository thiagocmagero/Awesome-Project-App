import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
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

  /** 0=Crítica, 1=Alta, 2=Média, 3=Baixa (legacy: 0 é valor válido) */
  @IsOptional()
  @IsInt()
  @Min(0)
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

  /**
   * publicIds (UUID v7) de tags existentes para aplicar a esta task. Substitui
   * o conjunto actual (array vazio = remove todas).
   */
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  tagPublicIds?: string[];

  /** Nomes de tags novas para criar inline (ver CreateTaskDto.newTagNames). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  newTagNames?: string[];
}
