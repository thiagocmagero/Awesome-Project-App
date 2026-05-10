import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Status, SubscriptionStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { AppException } from '../common/exceptions/app.exception';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMyTimezoneDto } from './dto/update-my-timezone.dto';
import { UpdateMyLocaleDto } from './dto/update-my-locale.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UpdateMyPasswordDto } from './dto/update-my-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Lista utilizadores — PLATFORM_ADMIN: todos; BASIC_USER: apenas os seus.
   *
   * Query params (todos opcionais; combinam-se com AND):
   *   - `status`             — filtra User.status (ACTIVE/INACTIVE/...)
   *   - `planId`             — Plan.publicId; filtra users cujo workspace tem
   *                            subscrição com este plano. Apenas PLATFORM_ADMIN
   *                            (silenciosamente ignorado para BASIC_USER).
   *   - `subscriptionStatus` — SubscriptionStatus (ACTIVE/TRIALING/PAST_DUE/...).
   *                            Mesmo gate de PLATFORM_ADMIN.
   */
  @Get()
  findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query('status') status?: Status,
    @Query('planId') planId?: string,
    @Query('subscriptionStatus') subscriptionStatus?: SubscriptionStatus,
  ) {
    const filters: {
      status?: Status;
      planPublicId?: string;
      subscriptionStatus?: SubscriptionStatus;
    } = {};
    if (status) filters.status = status;
    if (planId) filters.planPublicId = planId;
    if (subscriptionStatus) filters.subscriptionStatus = subscriptionStatus;
    return this.usersService.findAll(
      currentUser,
      Object.keys(filters).length ? filters : undefined,
    );
  }

  /** Detalhe de utilizador — PLATFORM_ADMIN: qualquer; BASIC_USER: apenas os seus */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.findOne(publicId, currentUser);
  }

  /**
   * Estatísticas quantitativas do workspace dum cliente. Apenas PLATFORM_ADMIN.
   * Devolve contadores agregados (projectos, equipas, membros, tasks, subtasks,
   * ficheiros, feriados, storage) — usado pela vista de detalhe em /clients.
   * Nunca expõe nomes/conteúdo: apenas números.
   */
  @Get(':id/stats')
  getStats(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.getStats(publicId, currentUser);
  }

  /** Cria utilizador — autenticados; BASIC_USER cria no seu workspace */
  @Post()
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.create(dto, currentUser);
  }

  /**
   * Actualiza apenas a timezone do próprio user — usado pela detecção do
   * browser na primeira sessão e pela aba Região e Idioma. Tem que estar
   * declarado ANTES de @Patch(':id') no controller para que o pattern
   * matching das rotas funcione (3 segments vs 2).
   */
  @Patch('me/timezone')
  updateMyTimezone(
    @Body() dto: UpdateMyTimezoneDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.updateMyTimezone(currentUser.sub, dto.timezone ?? null);
  }

  /**
   * Actualiza apenas o locale (idioma) do próprio user. Usado por:
   * - LanguageSelector no header (autenticado).
   * - Aba "Região e Idioma" da UserSettingsPage.
   * - AppLayout sync effect na primeira sessão.
   * Tem que estar declarado ANTES de @Patch(':id') por causa do pattern
   * matching das rotas (3 segments vs 2).
   */
  @Patch('me/locale')
  updateMyLocale(
    @Body() dto: UpdateMyLocaleDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.updateMyLocale(currentUser.sub, dto.locale ?? null);
  }

  /**
   * Actualiza o perfil do próprio user (name, phone, website, address).
   * Sem checks de ownership — o user edita os seus próprios dados.
   * Tem que estar declarado ANTES de @Patch(':id').
   */
  @Patch('me/profile')
  updateMyProfile(
    @Body() dto: UpdateMyProfileDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.updateMyProfile(currentUser.sub, dto);
  }

  /**
   * Altera a password do próprio user. Valida a password actual antes de actualizar.
   * Tem que estar declarado ANTES de @Patch(':id').
   */
  @Patch('me/password')
  updateMyPassword(
    @Body() dto: UpdateMyPasswordDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.updateMyPassword(currentUser.sub, dto);
  }

  /**
   * Upload de avatar do próprio user — multipart/form-data, campo `file`.
   *
   * Pipeline: Multer memory storage (5 MB hard limit) → file-type magic bytes
   * validation → sharp re-encode (256×256 cover, WebP q=85, strip metadata)
   * → S3 PutObject no bucket público (`avatars/{publicId}.webp`).
   *
   * Tem que estar declarado ANTES de @Patch(':id').
   */
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async updateMyAvatar(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    if (!file) {
      throw new AppException('AVATAR_FILE_MISSING', HttpStatus.BAD_REQUEST);
    }
    return this.usersService.updateMyAvatar(currentUser.sub, file.buffer);
  }

  /**
   * Remove o avatar do próprio user (S3 + BD). Volta a render iniciais na UI.
   * Tem que estar declarado ANTES de @Delete(':id').
   */
  @Delete('me/avatar')
  deleteMyAvatar(@CurrentUser() currentUser: JwtPayload) {
    return this.usersService.deleteMyAvatar(currentUser.sub);
  }

  /** Atualiza utilizador — validação de ownership no service */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.update(publicId, dto, currentUser);
  }

  /**
   * Remove utilizador.
   * - Default (sem `?hard=true`): soft delete (status=INACTIVE), validação de ownership.
   * - `?hard=true`: hard delete recursivo. Apenas PLATFORM_ADMIN. Apaga tudo
   *   o que está associado ao utilizador (cascade do schema) e avatar S3.
   *   Acção irreversível.
   */
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
    @Query('hard') hard?: string,
  ) {
    if (hard === 'true' || hard === '1') {
      return this.usersService.removeHard(publicId, currentUser);
    }
    return this.usersService.remove(publicId, currentUser);
  }
}
