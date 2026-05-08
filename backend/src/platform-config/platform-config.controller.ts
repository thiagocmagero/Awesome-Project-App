import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { PlatformConfigService } from './platform-config.service';
import { UpdateEmailConfigDto } from './dto/update-email-config.dto';
import { UpdatePlatformLimitsDto } from './dto/update-platform-limits.dto';
import { EmailService } from '../emails/email.service';
import { StorageService } from '../storage/storage.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';

/** Garante que apenas PLATFORM_ADMIN acede a estes endpoints */
function assertAdmin(user: JwtPayload) {
  if (user.profileCode !== 'PLATFORM_ADMIN') {
    throw new ForbiddenException('Acesso exclusivo a administradores de plataforma.');
  }
}

@Controller('platform-config')
@UseGuards(JwtAuthGuard)
export class PlatformConfigController {
  constructor(
    private readonly service: PlatformConfigService,
    private readonly emailService: EmailService,
    private readonly storageService: StorageService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  // ── Email ───────────────────────────────────────────────────────────────────

  /** Lê configuração de email — a password nunca é devolvida, apenas `hasPassword` */
  @Get('email')
  getEmail(@CurrentUser() user: JwtPayload) {
    assertAdmin(user);
    return this.service.getEmailConfig();
  }

  /**
   * Estado do transporter SMTP — usado pelo banner do EmailSettingsPage para
   * mostrar se as env vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`,
   * `SMTP_PASSWORD`) estão presentes no container backend.
   */
  @Get('email/smtp-status')
  getSmtpStatus(@CurrentUser() user: JwtPayload) {
    assertAdmin(user);
    return this.emailService.getStatus();
  }

  /**
   * Disponibilidade pública do canal email — qualquer user JWT pode ler.
   * Devolve apenas o booleano agregado (enabled + smtp_ready). NÃO expõe
   * `reason`, host, credenciais nem `fromEmail` — princípio: utilizador
   * final nunca vê motivos técnicos. Detalhes ficam no `getSmtpStatus`
   * (admin only).
   */
  @Get('email/availability')
  async getEmailAvailability() {
    const config = await this.service.getEmailConfig();
    if (!config.enabled) return { available: false };
    const smtp = this.emailService.getStatus();
    return { available: smtp.ready };
  }

  /** Cria ou actualiza configuração de email */
  @Patch('email')
  updateEmail(
    @Body() dto: UpdateEmailConfigDto,
    @CurrentUser() user: JwtPayload,
  ) {
    assertAdmin(user);
    return this.service.upsertEmailConfig(dto);
  }

  // ── Platform Limits ─────────────────────────────────────────────────────────

  /**
   * Lê limites globais. Acessível a qualquer user autenticado — o frontend
   * usa para validações de UX no TaskModal antes do submit.
   */
  @Get('limits')
  getLimits() {
    return this.service.getLimits();
  }

  /** Actualiza limites globais — apenas PLATFORM_ADMIN. */
  @Patch('limits')
  updateLimits(
    @Body() dto: UpdatePlatformLimitsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    assertAdmin(user);
    return this.service.upsertLimits(dto);
  }

  // ── Storage (AWS S3) ────────────────────────────────────────────────────────

  /**
   * Disponibilidade pública do canal storage — qualquer user JWT pode ler.
   * Usado pela `UserSettingsPage` para gating do botão "Alterar Imagem"
   * quando as env vars AWS_* não estão configuradas no container backend.
   *
   * Devolve apenas o booleano agregado. NÃO expõe `region`, `bucket` nem
   * env vars em falta — princípio: utilizador final nunca vê motivos
   * técnicos. Detalhes ficariam num endpoint admin separado se necessário.
   */
  @Get('storage/availability')
  getStorageAvailability() {
    return { available: this.storageService.isReady() };
  }

  /**
   * Disponibilidade pública da feature de uploads de ficheiros — combina
   * `storage.isReady()` com a feature flag `upload` resolvida para o user
   * autenticado. Usado pelo frontend para gating das tabs "Ficheiros"
   * (TaskModal e PlanningPage).
   *
   * Princípio: utilizador final nunca vê motivos. Devolve apenas
   * `{ available }` — admin tem `/storage/availability` e a página de
   * feature flags para diagnóstico.
   */
  @Get('uploads/availability')
  async getUploadsAvailability(@CurrentUser() user: JwtPayload) {
    if (!this.storageService.isReady()) return { available: false };
    const enabled = await this.featureFlags.isEnabled(user.sub, 'upload');
    return { available: enabled };
  }
}
