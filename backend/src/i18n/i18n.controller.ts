import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { I18nService } from './i18n.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfilesGuard } from '../auth/guards/profiles.guard';
import { RequireProfiles } from '../auth/decorators/require-profiles.decorator';
import { CreateLocaleDto } from './dto/create-locale.dto';
import { UpdateLocaleDto } from './dto/update-locale.dto';
import { UpsertTranslationDto } from './dto/upsert-translation.dto';
import { CreateKeyDto } from './dto/create-key.dto';
import { ReportMissingDto } from './dto/report-missing.dto';

@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  // ── 1. GET /locales/active — public ──────────────────────────────────────────
  // Skip-throttle + cache HTTP curto: o LanguageSelector chama isto ao montar
  // do AppLayout em todas as páginas; F5 spam saturava o throttler global.
  @SkipThrottle()
  @Header('Cache-Control', 'public, max-age=60')
  @Get('locales/active')
  getActiveLocales() {
    return this.i18nService.getActiveLocales();
  }

  // ── 2. GET /locales — PLATFORM_ADMIN ─────────────────────────────────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Get('locales')
  getAllLocales() {
    return this.i18nService.getAllLocales();
  }

  // ── 3. POST /locales — PLATFORM_ADMIN ────────────────────────────────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Post('locales')
  createLocale(@Body() dto: CreateLocaleDto) {
    return this.i18nService.createLocale(dto);
  }

  // ── 4. PATCH /locales/:code — PLATFORM_ADMIN ─────────────────────────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Patch('locales/:code')
  updateLocale(@Param('code') code: string, @Body() dto: UpdateLocaleDto) {
    return this.i18nService.updateLocale(code, dto);
  }

  // ── 5. DELETE /locales/:code — PLATFORM_ADMIN ────────────────────────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Delete('locales/:code')
  deleteLocale(@Param('code') code: string) {
    return this.i18nService.deleteLocale(code);
  }

  // ── 6. GET /export — PLATFORM_ADMIN ──────────────────────────────────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Get('export')
  exportSeed() {
    return this.i18nService.exportSeed();
  }

  // ── 7. GET /backoffice/stats — PLATFORM_ADMIN ────────────────────────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Get('backoffice/stats')
  getStats() {
    return this.i18nService.getStats();
  }

  // ── 8. GET /backoffice/:namespace — PLATFORM_ADMIN ───────────────────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Get('backoffice/:namespace')
  getBackofficeNamespace(@Param('namespace') namespace: string) {
    return this.i18nService.getBackofficeNamespace(namespace);
  }

  // ── 9. PATCH /backoffice/:namespace/approve — PLATFORM_ADMIN ─────────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Patch('backoffice/:namespace/approve')
  approveAll(@Param('namespace') namespace: string) {
    return this.i18nService.approveAll(namespace);
  }

  // ── 10. POST /backoffice/:namespace/keys — PLATFORM_ADMIN ────────────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Post('backoffice/:namespace/keys')
  createKey(@Param('namespace') namespace: string, @Body() dto: CreateKeyDto) {
    return this.i18nService.createKey(namespace, dto);
  }

  // ── 11. DELETE /backoffice/:namespace/keys/:key — PLATFORM_ADMIN ─────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Delete('backoffice/:namespace/keys/:key(*)')
  deleteKey(@Param('namespace') namespace: string, @Param('key') key: string) {
    return this.i18nService.deleteKey(namespace, key);
  }

  // ── 12. POST /missing — JWT (sem throttle — i18next pode fazer spike durante nav) ──
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @Post('missing')
  reportMissing(@Body() dto: ReportMissingDto) {
    return this.i18nService.reportMissing(dto);
  }

  // ── 13. GET /:locale/:namespace — public ─────────────────────────────────────
  // Skip-throttle + cache HTTP: o i18next-http-backend faz fan-out de ~17
  // requests em paralelo no boot/F5 (um por namespace registado) e isto
  // saturava rapidamente o limit global de 300/min — sobretudo com múltiplas
  // tabs ou hot-reload em dev. Como é read-only puro, o cache de 60s é seguro;
  // edições no backoffice ficam visíveis em ≤60s.
  @SkipThrottle()
  @Header('Cache-Control', 'public, max-age=60')
  @Get(':locale/:namespace')
  getNamespace(
    @Param('locale') locale: string,
    @Param('namespace') namespace: string,
  ) {
    return this.i18nService.getNamespace(locale, namespace);
  }

  // ── 14. PATCH /:locale/:namespace/:key — PLATFORM_ADMIN ──────────────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Patch(':locale/:namespace/:key(*)')
  upsertTranslation(
    @Param('locale') locale: string,
    @Param('namespace') namespace: string,
    @Param('key') key: string,
    @Body() dto: UpsertTranslationDto,
  ) {
    return this.i18nService.upsertTranslation(locale, namespace, key, dto);
  }
}
