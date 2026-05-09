import {
  Body,
  Controller,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { AppException } from '../common/exceptions/app.exception';
import { FilesService } from './files.service';

/**
 * Endpoints admin-only para developer tooling. Não fazem parte da API
 * pública — destinados a iteração local quando AWS GuardDuty não está
 * acessível (sem tunnel) ou para acelerar testes do flow `recordScanResult`.
 *
 * **Apenas PLATFORM_ADMIN.** Em produção, manter este controller
 * registado é seguro porque o gate de perfil é estrito; mas o uso real
 * é dev-mode + smoke testing.
 */
@Controller('admin/files')
@UseGuards(JwtAuthGuard)
export class FilesAdminController {
  private readonly logger = new Logger(FilesAdminController.name);

  constructor(private readonly files: FilesService) {}

  /**
   * Simula um verdict do GuardDuty para um ficheiro existente. Bypassa o
   * webhook SNS (signature) — útil para testar `recordScanResult` sem
   * configurar tunnel + AWS GuardDuty.
   *
   *   POST /api/v1/admin/files/test-scan-result
   *   Body: { "bucketKey": "uploads/secured/.../uuid.ext", "verdict": "CLEAN" | "INFECTED" }
   *
   * Comportamento espelha exactamente o webhook real:
   *  - INFECTED → apaga bytes do bucket, marca scanStatus, cria notificação.
   *  - CLEAN    → marca scanStatus, sem efeitos colaterais.
   */
  @Post('test-scan-result')
  async testScanResult(
    @CurrentUser() user: JwtPayload,
    @Body() body: { bucketKey?: string; verdict?: string },
  ) {
    if (user.profileCode !== 'PLATFORM_ADMIN') {
      throw new AppException('FORBIDDEN', HttpStatus.FORBIDDEN);
    }
    const bucketKey = body?.bucketKey?.trim();
    const verdict = body?.verdict?.toUpperCase();
    if (!bucketKey) {
      throw new AppException('BUCKET_KEY_REQUIRED', HttpStatus.BAD_REQUEST);
    }
    if (verdict !== 'CLEAN' && verdict !== 'INFECTED') {
      throw new AppException('INVALID_VERDICT', HttpStatus.BAD_REQUEST);
    }
    await this.files.recordScanResult(bucketKey, verdict as 'CLEAN' | 'INFECTED');
    this.logger.log(
      `[ADMIN] Simulated GuardDuty verdict ${verdict} for ${bucketKey} (actor=${user.sub})`,
    );
    return { ok: true, bucketKey, verdict };
  }
}
