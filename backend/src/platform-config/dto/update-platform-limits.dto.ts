import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Body do PATCH /platform-config/limits — apenas PLATFORM_ADMIN.
 * Cap de duração (dias úteis) entre 1 e 99999. O cap "soft" recomendado
 * é 1300 (~5 anos calendário); valores acima de 5200 (~20 anos) são
 * possíveis mas não recomendados pela docs.
 * Ver docs/claude/tools/gantt/data-model.md.
 */
export class UpdatePlatformLimitsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99999)
  maxTaskBusinessDays?: number;
}
