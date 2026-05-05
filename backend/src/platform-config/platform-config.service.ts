import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmailConfigDto } from './dto/update-email-config.dto';
import { UpdatePlatformLimitsDto } from './dto/update-platform-limits.dto';

/** Default singleton para PlatformLimits (id=1). Cap default 5 anos. */
const DEFAULT_MAX_TASK_BUSINESS_DAYS = 1300;

@Injectable()
export class PlatformConfigService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Email Config ────────────────────────────────────────────────────────────

  /** Retorna a configuração de email (registo singleton id=1).
   *  Nunca expõe a palavra-passe no GET — devolve boolean `hasPassword`. */
  async getEmailConfig() {
    const config = await this.prisma.emailConfig.findUnique({ where: { id: 1 } });
    if (!config) return this.defaultEmailConfig();

    const { password, ...safe } = config;
    return { ...safe, hasPassword: !!password };
  }

  /** Cria ou actualiza a configuração de email (upsert no id=1). */
  async upsertEmailConfig(dto: UpdateEmailConfigDto) {
    const data: Record<string, unknown> = {};

    if (dto.enabled   !== undefined) data.enabled   = dto.enabled;
    if (dto.host      !== undefined) data.host      = dto.host || null;
    if (dto.port      !== undefined) data.port      = dto.port;
    if (dto.secure    !== undefined) data.secure    = dto.secure;
    if (dto.username  !== undefined) data.username  = dto.username || null;
    if (dto.fromEmail !== undefined) data.fromEmail = dto.fromEmail || null;
    if (dto.fromName  !== undefined) data.fromName  = dto.fromName || null;

    // Só actualiza a password se for enviada (string não vazia)
    if (dto.password !== undefined) {
      data.password = dto.password.trim() || null;
    }

    const config = await this.prisma.emailConfig.upsert({
      where:  { id: 1 },
      create: { id: 1, enabled: false, port: 587, secure: false, ...data },
      update: data,
    });

    const { password, ...safe } = config;
    return { ...safe, hasPassword: !!password };
  }

  // ── Platform Limits ─────────────────────────────────────────────────────────

  /**
   * Lê os limites globais (singleton id=1). Acessível a qualquer user
   * autenticado — nenhum dado sensível, só caps de validação. O frontend
   * usa para mostrar mensagens de UX antes do submit (TaskModal).
   */
  async getLimits() {
    const config = await this.prisma.platformLimits.findUnique({ where: { id: 1 } });
    if (!config) {
      return {
        id: 1,
        maxTaskBusinessDays: DEFAULT_MAX_TASK_BUSINESS_DAYS,
        updatedAt: new Date(),
      };
    }
    return config;
  }

  /**
   * Devolve só `maxTaskBusinessDays` — usado pelos services internos (helper
   * `assertTaskDurationWithinLimit`) sem expor o resto do registo.
   */
  async getMaxTaskBusinessDays(): Promise<number> {
    const config = await this.prisma.platformLimits.findUnique({
      where: { id: 1 },
      select: { maxTaskBusinessDays: true },
    });
    return config?.maxTaskBusinessDays ?? DEFAULT_MAX_TASK_BUSINESS_DAYS;
  }

  /** Upsert id=1 — apenas PLATFORM_ADMIN (controller assert). */
  async upsertLimits(dto: UpdatePlatformLimitsDto) {
    const data: Record<string, unknown> = {};
    if (dto.maxTaskBusinessDays !== undefined) {
      data.maxTaskBusinessDays = dto.maxTaskBusinessDays;
    }
    return this.prisma.platformLimits.upsert({
      where:  { id: 1 },
      create: { id: 1, maxTaskBusinessDays: DEFAULT_MAX_TASK_BUSINESS_DAYS, ...data },
      update: data,
    });
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private defaultEmailConfig() {
    return {
      id: 1,
      enabled: false,
      host: null,
      port: 587,
      secure: false,
      username: null,
      fromEmail: null,
      fromName: null,
      hasPassword: false,
      updatedAt: new Date(),
    };
  }
}
