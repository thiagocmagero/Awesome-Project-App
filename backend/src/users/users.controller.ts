import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Status } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMyTimezoneDto } from './dto/update-my-timezone.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** Lista utilizadores — PLATFORM_ADMIN: todos; BASIC_USER: apenas os seus */
  @Get()
  findAll(
    @CurrentUser() currentUser: JwtPayload,
    @Query('status') status?: Status,
  ) {
    return this.usersService.findAll(currentUser, status ? { status } : undefined);
  }

  /** Detalhe de utilizador — PLATFORM_ADMIN: qualquer; BASIC_USER: apenas os seus */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.findOne(publicId, currentUser);
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

  /** Atualiza utilizador — validação de ownership no service */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.update(publicId, dto, currentUser);
  }

  /** Soft delete — validação de ownership no service */
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.usersService.remove(publicId, currentUser);
  }
}
