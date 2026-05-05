import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
@UseGuards(JwtAuthGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /** Convites pendentes para o utilizador autenticado */
  @Get('pending')
  getPending(@CurrentUser() currentUser: JwtPayload) {
    return this.invitationsService.getPending(currentUser);
  }

  /** Todos os convites recebidos (histórico) */
  @Get()
  getAll(@CurrentUser() currentUser: JwtPayload) {
    return this.invitationsService.getAll(currentUser);
  }

  /** Aceitar convite */
  @Post(':id/accept')
  accept(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invitationsService.accept(publicId, currentUser);
  }

  /** Recusar convite */
  @Post(':id/decline')
  decline(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invitationsService.decline(publicId, currentUser);
  }

  /** Reenviar convite — apenas quem convidou ou PLATFORM_ADMIN */
  @Post(':id/resend')
  resend(
    @Param('id', ParseUUIDPipe) publicId: string,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.invitationsService.resend(publicId, currentUser);
  }
}
