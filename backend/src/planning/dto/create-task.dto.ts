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

export class CreateTaskDto {
  @IsString()
  text!: string;

  /** Descrição rica/longa (opcional). */
  @IsOptional()
  @IsString()
  description?: string;

  /** "task" | "project" | "milestone" — padrão "task" */
  @IsOptional()
  @IsString()
  type?: string;

  /**
   * Formato Gantt: "DD-MM-YYYY HH:mm". Opcional — quando vazio/omitido o
   * service usa "hoje 00:00 UTC" (DAY) como default. A obrigatoriedade real
   * é decidida pelas regras de campos do estado destino (`TaskFieldKey.schedule`).
   */
  @IsOptional()
  @IsString()
  start_date?: string;

  /**
   * Duração em dias úteis (durationUnit=DAY, default) ou horas úteis
   * (durationUnit=HOUR). Milestone deve ser 0. Em HOUR aceita decimais
   * (0.25 = 15min, com `gantt.config.duration_step`).
   */
  @IsNumber()
  @Min(0)
  duration!: number;

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

  /** Array de IDs de TaskResource como strings */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  owner_id?: string[];

  /** ID da tarefa pai; 0 ou omitir = tarefa raiz */
  @IsOptional()
  @IsInt()
  parent?: number;

  /** publicId da tarefa pai (UUID v7) — alternativa ao `parent` numérico usado pelo board */
  @IsOptional()
  @IsString()
  @IsUUID('all')
  parentPublicId?: string;

  /** 0=Crítica, 1=Alta, 2=Média, 3=Baixa (legacy: 0 é valor válido) */
  @IsOptional()
  @IsInt()
  @Min(0)
  priority?: number;

  /** "asap" | "alap" | "snet" | "snlt" | "fnet" | "fnlt" | "mso" | "mfo" */
  @IsOptional()
  @IsString()
  constraint_type?: string;

  /** Formato Gantt: "DD-MM-YYYY HH:mm" — obrigatório para snet/snlt/fnet/fnlt/mso/mfo */
  @IsOptional()
  @IsString()
  constraint_date?: string;

  /** "inclusive" | "exclusive" — modo de data de fim activo no cliente */
  @IsOptional()
  @IsString()
  endDateMode?: string;

  /**
   * publicIds (UUID v7) de tags **existentes** no workspace para aplicar a esta task.
   * O backend ignora tags que não pertençam ao workspace do projecto.
   */
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  tagPublicIds?: string[];

  /**
   * Nomes de tags **novas** para criar inline no workspace e aplicar a esta task.
   * Cada nome é normalizado para MAIÚSCULAS. Duplicados (case-insensitive) ou
   * colisões com tags existentes são tratados como upsert — não há erro.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  newTagNames?: string[];
}
