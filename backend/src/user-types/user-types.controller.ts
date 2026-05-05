import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { UserTypesService } from './user-types.service';
import { CreateUserTypeDto } from './dto/create-user-type.dto';
import { UpdateUserTypeDto } from './dto/update-user-type.dto';

@Controller('user-types')
@UseGuards(JwtAuthGuard)
export class UserTypesController {
  constructor(private readonly userTypesService: UserTypesService) {}

  /** Lista tipos — PLATFORM_ADMIN: todos; BASIC_USER: apenas os seus */
  @Get()
  findAll(@CurrentUser() currentUser: JwtPayload) {
    return this.userTypesService.findAll(currentUser);
  }

  /** Detalhe — validação de ownership no service */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.userTypesService.findOne(publicId, currentUser);
  }

  /** Cria tipo — autenticados; ownerId é definido automaticamente no service */
  @Post()
  create(
    @Body() dto: CreateUserTypeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.userTypesService.create(dto, currentUser);
  }

  /** Atualiza tipo — validação de ownership no service */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) publicId: string,
    @Body() dto: UpdateUserTypeDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.userTypesService.update(publicId, dto, currentUser);
  }

  /** Soft delete — validação de ownership no service */
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.userTypesService.remove(publicId, currentUser);
  }
}
