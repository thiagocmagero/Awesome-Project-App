import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body do `PATCH /api/projects/:id/files/:fileId` — apenas renomeia o
 * `originalName` exibido. O bucket key e os bytes ficam intactos.
 *
 * - `originalName`: 1..255 chars (limite Postgres String). Validação extra
 *   no service: rejeita strings só com whitespace.
 */
export class RenameFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  originalName!: string;
}
