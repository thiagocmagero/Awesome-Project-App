import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * Body do PATCH /platform-config/limits — apenas PLATFORM_ADMIN.
 *
 * - `maxTaskBusinessDays`: cap de duração de GanttTask (1..99999, soft 1300).
 *   Ver docs/claude/tools/gantt/data-model.md.
 * - `maxUploadSizeMb`: cap absoluto da plataforma para single file upload
 *   (1..2048). Qualquer plano só pode oferecer ≤ a este valor.
 * - `allowedMimeTypes`: allowlist de MIME types aceites (máx 100 entradas).
 *   Validado em runtime contra magic bytes (file-type) — Content-Type
 *   declarado é ignorado. Ver docs/claude/tools/files/overview.md.
 */
export class UpdatePlatformLimitsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(99999)
  maxTaskBusinessDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2048)
  maxUploadSizeMb?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  /** Cada entry é um MIME type válido `type/subtype`, lowercase. */
  @Matches(/^[a-z0-9!#$&^_+\-.]+\/[a-z0-9!#$&^_+\-.]+$/, {
    each: true,
    message: 'Each MIME must match the pattern type/subtype.',
  })
  allowedMimeTypes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  /**
   * Cada entry é uma extensão (com ou sem ponto inicial). Service normaliza:
   * strip dot, lowercase, trim. Regex permissiva — restringe a alfanuméricos
   * até 16 chars (cobre "tar.gz" → "tar.gz" como entry única se necessário).
   */
  @Matches(/^\.?[a-zA-Z0-9.]{1,16}$/, {
    each: true,
    message: 'Each extension must be alphanumeric (optionally with leading dot).',
  })
  allowedFileExtensions?: string[];
}
