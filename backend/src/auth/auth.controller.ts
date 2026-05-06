import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { ResendConfirmationDto } from './dto/resend-confirmation.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { CreateAccountFromInviteDto } from './dto/create-account-from-invite.dto';
import type { JwtPayload } from './jwt.strategy';
import { UsersService } from '../users/users.service';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';
import { SkipCsrf } from '../common/csrf/skip-csrf.decorator';

type AuthRequest = Request & {
  user: JwtPayload & { internalSessionId: number };
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @SkipCsrf()
  @Throttle({ default: { limit: 3, ttl: 3_600_000 } })
  @Post('register')
  register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.register(body, req, res);
  }

  @SkipCsrf()
  @UseGuards(LoginThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(body.email, body.password, req, res);
  }

  /** Rotation do refresh token. CSRF é exigido (utilizador já tem cookie csrf). */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const ok = await this.authService.refresh(req, res);
    if (!ok) throw new UnauthorizedException('REFRESH_INVALID');
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(req.user.sid, req.user.sub, res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() request: AuthRequest) {
    const user = await this.usersService.findByEmail(request.user.email);
    if (!user) return { ...request.user, currentSessionPublicId: request.user.sid };

    return {
      ...user,
      planCode: (user as any).userPlans?.[0]?.plan?.code ?? null,
      planName: (user as any).userPlans?.[0]?.plan?.name ?? null,
      currentSessionPublicId: request.user.sid,
    };
  }

  @SkipCsrf()
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @Post('confirm-email')
  @HttpCode(HttpStatus.OK)
  confirmEmail(@Body() dto: ConfirmEmailDto) {
    return this.authService.confirmEmail(dto.token);
  }

  @SkipCsrf()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post('resend-confirmation')
  @HttpCode(HttpStatus.OK)
  resendConfirmation(@Body() dto: ResendConfirmationDto) {
    return this.authService.resendConfirmation(dto.email);
  }

  @SkipCsrf()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @SkipCsrf()
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.resetPassword(dto.token, dto.password, res);
  }

  @SkipCsrf()
  @Throttle({ default: { limit: 20, ttl: 600_000 } })
  @Get('token-check')
  @HttpCode(HttpStatus.OK)
  tokenCheck(
    @Query('token') token: string,
    @Query('type') type: string,
  ) {
    return this.authService.tokenCheck(token, type);
  }

  @SkipCsrf()
  @Throttle({ default: { limit: 20, ttl: 600_000 } })
  @Get('invite-check')
  @HttpCode(HttpStatus.OK)
  inviteCheck(@Query('token') token: string) {
    return this.authService.inviteCheck(token);
  }

  @SkipCsrf()
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @Post('create-account-from-invite')
  @HttpCode(HttpStatus.CREATED)
  createAccountFromInvite(
    @Body() dto: CreateAccountFromInviteDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.createAccountFromInvite(dto, req, res);
  }
}
