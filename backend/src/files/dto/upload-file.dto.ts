import { IsOptional, IsUUID } from 'class-validator';

/**
 * Body multipart do `POST /api/projects/:id/files`. O ficheiro vem no campo
 * `file` (Multer FileInterceptor). Os campos textuais abaixo são opcionais.
 *
 * - `taskPublicId`: se fornecido, anexa o ficheiro a uma task; ausência = project-level.
 *   Validamos como UUID — o backend resolve para `task.id` interno.
 */
export class UploadFileDto {
  @IsOptional()
  @IsUUID()
  taskPublicId?: string;
}
