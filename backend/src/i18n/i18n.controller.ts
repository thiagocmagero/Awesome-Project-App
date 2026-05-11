import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { I18nService } from './i18n.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProfilesGuard } from '../auth/guards/profiles.guard';
import { RequireProfiles } from '../auth/decorators/require-profiles.decorator';
import { Audit } from '../audit-log/decorators/audit.decorator';
import { CreateLocaleDto } from './dto/create-locale.dto';
import { UpdateLocaleDto } from './dto/update-locale.dto';
import { UpsertTranslationDto } from './dto/upsert-translation.dto';
import { CreateKeyDto } from './dto/create-key.dto';
import { ReportMissingDto } from './dto/report-missing.dto';
import { MissingQueryDto } from './dto/missing-query.dto';

@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  // ── 1. GET /locales/active — public ──────────────────────────────────────────
  // Skip-throttle + cache HTTP curto: o LanguageSelector chama isto ao montar
  // do AppLayout em todas as páginas; F5 spam saturava o throttler global.
  @SkipThrottle()
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
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

  // ── 7a. GET /backoffice/missing — PLATFORM_ADMIN ─────────────────────────────
  // Declarado ANTES de /backoffice/:namespace senão "missing" cairia em
  // getBackofficeNamespace('missing'). Lista chaves reportadas em runtime
  // (MissingTranslation), com filtros por resolved + namespace + paginação.
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Get('backoffice/missing')
  listMissing(@Query() query: MissingQueryDto) {
    return this.i18nService.listMissing({
      resolved: query.resolved,
      namespace: query.namespace,
      limit: query.limit,
      offset: query.offset,
    });
  }

  // ── 7b. GET /backoffice/missing/stats — PLATFORM_ADMIN ───────────────────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Get('backoffice/missing/stats')
  getMissingStats() {
    return this.i18nService.getMissingStats();
  }

  // ── 7c. POST /backoffice/missing/:publicId/promote — PLATFORM_ADMIN ──────────
  @UseGuards(JwtAuthGuard, ProfilesGuard)
  @RequireProfiles('PLATFORM_ADMIN')
  @Audit({
    action: 'I18N_MISSING_PROMOTED',
    resourceType: 'i18n_missing',
    resourceId: (req) => req.params.publicId,
  })
  @Post('backoffice/missing/:publicId/promote')
  promoteMissing(@Param('publicId') publicId: string) {
    return this.i18nService.promoteMissing(publicId);
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

  // ── 13. GET /:locale — public (bundle: todos os namespaces + ETag) ──────────
  // Declarado ANTES de /:locale/:namespace — NestJS respeita a ordem.
  // Um único request substitui os 22 anteriores. ETag + 304 garante que
  // re-loads sem mudanças não transferem bytes.
  @SkipThrottle()
  @Get(':locale')
  async getBundle(
    @Param('locale') locale: string,
    @Headers('if-none-match') ifNoneMatch: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const bundle = await this.i18nService.getBundle(locale);
    const etag = `"${bundle.version}"`;

    if (ifNoneMatch === etag) {
      res.status(304);
      return;
    }

    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return bundle;
  }

  // ── 14. GET /:locale/:namespace — public ─────────────────────────────────────
  // Mantido como fallback e para o backoffice. Cache alargado para 1h + SWR.
  @SkipThrottle()
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
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
