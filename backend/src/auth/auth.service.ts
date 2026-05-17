import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { TokenType } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { SessionsService } from './sessions.service';
import { EmailTokenService } from './email-token.service';
import { EmailService } from '../emails/email.service';
import { setAuthCookies, clearAuthCookies, parseExpiresInToMs } from './cookies.util';
import { generateCsrfNonce } from '../common/csrf/csrf.util';
import { createDefaultBilling, upsertWorkspaceMemberFromProjectAccept } from '../users/billing-helpers';

const CONFIRMATION_TOKEN_MS = 24 * 60 * 60_000;   // 24h
const PASSWORD_RESET_TOKEN_MS = 15 * 60_000;       // 15 min
const INVITE_TOKEN_MS = 72 * 60 * 60_000;          // 72h

const DEFAULT_ACCESS_MS = 15 * 60_000;
const DEFAULT_REFRESH_MS = 7 * 86_400_000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly emailTokens: EmailTokenService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Session + cookies helper ──────────────────────────────────
  private async issueSessionAndCookies(
    userId: number,
    email: string,
    profileCode: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    const ua = req.headers['user-agent'];
    const ip = req.ip;
    const { sessionPublicId, refreshToken } = await this.sessions.createSession(userId, {
      ua: typeof ua === 'string' ? ua : undefined,
      ip,
    });

    const accessToken = await this.jwtService.signAsync({
      sub: userId,
      email,
      profileCode,
      sid: sessionPublicId,
    });

    const csrfToken = generateCsrfNonce();

    setAuthCookies(
      res,
      {
        accessToken,
        refreshToken,
        csrfToken,
        accessMaxAgeMs: parseExpiresInToMs(process.env.JWT_ACCESS_EXPIRES_IN, DEFAULT_ACCESS_MS),
        refreshMaxAgeMs: parseExpiresInToMs(process.env.JWT_REFRESH_EXPIRES_IN, DEFAULT_REFRESH_MS),
      },
      this.configService,
    );
  }

  // ─── Register ──────────────────────────────────────────────────
  async register(
    input: { email: string; name: string; password: string },
    req: Request,
    res: Response,
  ) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await this.usersService.findByEmailWithPassword(normalizedEmail);

    // CASE 1: already self-registered and ACTIVE — hard conflict
    if (existing?.selfRegistered && existing.status === 'ACTIVE') {
      throw new AppException('EMAIL_ALREADY_EXISTS', HttpStatus.CONFLICT);
    }

    // CASE 2: PENDING with a valid (unexpired) confirmation token — still waiting
    if (existing?.status === 'PENDING') {
      const hasValidToken = await this.prisma.emailToken.count({
        where: {
          userId: existing.id,
          type: TokenType.EMAIL_CONFIRMATION,
          used: false,
          expiresAt: { gt: new Date() },
        },
      });
      if (hasValidToken > 0) {
        throw new AppException('CONFIRMATION_EMAIL_ALREADY_SENT', HttpStatus.CONFLICT);
      }
      // Token expired — clean up the stale PENDING user so we can start fresh
      await this.prisma.user.delete({ where: { id: existing.id } });
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    // CASE 3: Pre-invited user (selfRegistered=false, ACTIVE) — activate directly (no PENDING)
    if (existing && !existing.selfRegistered && existing.status === 'ACTIVE') {
      const user = await this.usersService.activateInvitedUser(existing.id, {
        name: input.name,
        passwordHash,
      });

      await this.prisma.projectMember.updateMany({
        where: { email: normalizedEmail, userId: null },
        data: { userId: user.id },
      });

      await this.issueSessionAndCookies(user.id, user.email, user.profile.code, req, res);

      const { id: _id, ...safeUser } = user;
      return {
        user: {
          ...safeUser,
          planCode: (safeUser as any).subscription?.plan?.code ?? null,
          planName: (safeUser as any).subscription?.plan?.name ?? null,
        },
      };
    }

    // CASE 4: New registration — create PENDING user and send confirmation email
    const basicUserProfile = await this.prisma.profile.findUnique({
      where: { code: 'BASIC_USER' },
    });
    if (!basicUserProfile) {
      throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const pendingUser = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: input.name,
        passwordHash,
        profileId: basicUserProfile.id,
        selfRegistered: true,
        status: 'PENDING',
        emailVerified: false,
        // Auto-cria 1 Workspace por User (V1 invariant: 1:1).
        workspaces: {
          create: { name: `${input.name}'s Workspace` },
        },
      },
      select: { id: true, email: true, name: true, locale: true },
    });

    // Cria Subscription default no workspace recém-criado.
    await createDefaultBilling(this.prisma, pendingUser.id);

    const token = await this.emailTokens.createToken(TokenType.EMAIL_CONFIRMATION, {
      userId: pendingUser.id,
      expiresInMs: CONFIRMATION_TOKEN_MS,
    });

    // Locale canónico para conteúdo do email + lowercase no path do URL
    // (alinhado com a convenção da app: `/<locale-lowercase>/...`).
    const recipientLocale = pendingUser.locale ?? 'pt-PT';
    const confirmUrl = `${this.emailService.appUrl}/${recipientLocale.toLowerCase()}/confirm-email?token=${token}`;
    this.emailService.sendEmailConfirmationEmail({
      recipientEmail: pendingUser.email,
      recipientName: pendingUser.name,
      confirmUrl,
      locale: pendingUser.locale,
    }).catch(() => {});

    return { requiresConfirmation: true };
  }

  // ─── Confirm Email ──────────────────────────────────────────────
  async confirmEmail(token: string): Promise<{ success: true }> {
    const record = await this.emailTokens.validateToken(token, TokenType.EMAIL_CONFIRMATION);

    await this.prisma.user.update({
      where: { id: record.userId! },
      data: { status: 'ACTIVE', emailVerified: true },
    });

    // Link any pending project members with this email
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: record.userId! },
      select: { email: true },
    });
    await this.prisma.projectMember.updateMany({
      where: { email: user.email, userId: null },
      data: { userId: record.userId! },
    });

    await this.emailTokens.consumeToken(record.id);
    return { success: true };
  }

  // ─── Resend Confirmation ────────────────────────────────────────
  async resendConfirmation(email: string): Promise<{ success: true }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Always neutral response (OWASP — don't reveal if email is registered)
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, status: true, locale: true },
    });

    if (user?.status === 'PENDING') {
      // DB rate limit: max 3 emails per hour
      await this.emailTokens.checkUserRateLimit(
        user.id,
        TokenType.EMAIL_CONFIRMATION,
        3,
        60 * 60_000,
      );

      const token = await this.emailTokens.createToken(TokenType.EMAIL_CONFIRMATION, {
        userId: user.id,
        expiresInMs: CONFIRMATION_TOKEN_MS,
      });

      const recipientLocale = user.locale ?? 'pt-PT';
      const confirmUrl = `${this.emailService.appUrl}/${recipientLocale.toLowerCase()}/confirm-email?token=${token}`;
      this.emailService.sendEmailConfirmationEmail({
        recipientEmail: user.email,
        recipientName: user.name,
        confirmUrl,
        locale: user.locale,
      }).catch(() => {});
    }

    return { success: true };
  }

  // ─── Login ─────────────────────────────────────────────────────
  async login(email: string, password: string, req: Request, res: Response) {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      throw new AppException('INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppException('INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED);
    }

    // PENDING = registered but email not yet confirmed
    if (user.status === 'PENDING') {
      throw new AppException('EMAIL_NOT_CONFIRMED', HttpStatus.FORBIDDEN);
    }

    if (user.status !== 'ACTIVE') {
      throw new AppException('INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED);
    }

    await this.issueSessionAndCookies(user.id, user.email, user.profile.code, req, res);

    const { passwordHash: _ph, id: _id, selfRegistered: _sr, ...rest } = user;
    // Converte `avatarKey` interno em `avatarUrl` público antes de devolver.
    const safeUser = this.usersService.toPublicResponse(rest as Record<string, unknown>) as any;

    return {
      user: {
        ...safeUser,
        planCode: (safeUser as any).userPlans?.[0]?.plan?.code ?? null,
        planName: (safeUser as any).userPlans?.[0]?.plan?.name ?? null,
      },
    };
  }

  // ─── Forgot Password ────────────────────────────────────────────
  async forgotPassword(email: string): Promise<{ success: true }> {
    const normalizedEmail = email.toLowerCase().trim();

    // Always neutral response (OWASP)
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, status: true, locale: true },
    });

    if (user?.status === 'ACTIVE') {
      // DB rate limit: max 3 emails per 15 min per email address
      const since = new Date(Date.now() - 15 * 60_000);
      const count = await this.prisma.emailToken.count({
        where: {
          userId: user.id,
          type: TokenType.PASSWORD_RESET,
          createdAt: { gte: since },
        },
      });
      if (count < 3) {
        // Revoke previous unused reset tokens
        await this.emailTokens.revokeExistingTokensForUser(user.id, TokenType.PASSWORD_RESET);

        const token = await this.emailTokens.createToken(TokenType.PASSWORD_RESET, {
          userId: user.id,
          expiresInMs: PASSWORD_RESET_TOKEN_MS,
        });

        const recipientLocale = user.locale ?? 'pt-PT';
        const resetUrl = `${this.emailService.appUrl}/${recipientLocale.toLowerCase()}/reset-password?token=${token}`;
        this.emailService.sendPasswordResetEmail({
          recipientEmail: user.email,
          recipientName: user.name,
          resetUrl,
          locale: user.locale,
        }).catch(() => {});
      }
    }

    return { success: true };
  }

  // ─── Reset Password ─────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string, res: Response): Promise<{ success: true }> {
    const record = await this.emailTokens.validateToken(token, TokenType.PASSWORD_RESET);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: record.userId! },
      select: { id: true, passwordHash: true },
    });

    // Prevent reuse of the same password
    const isSame = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSame) {
      throw new AppException('SAME_PASSWORD', HttpStatus.BAD_REQUEST);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke all sessions
    await this.sessions.revokeAllForUser(user.id, 'PASSWORD_RESET');

    await this.emailTokens.consumeToken(record.id);

    clearAuthCookies(res, this.configService);
    return { success: true };
  }

  // ─── Invite Check ───────────────────────────────────────────────
  async inviteCheck(token: string): Promise<{ requiresAccount: boolean }> {
    const record = await this.emailTokens.validateToken(token, TokenType.ACCOUNT_INVITE);
    // Never return email or project details (OWASP)
    return { requiresAccount: record.userId === null };
  }

  // ─── Create Account From Invite ─────────────────────────────────
  async createAccountFromInvite(
    input: { token: string; name: string; password: string },
    req: Request,
    res: Response,
  ) {
    const record = await this.emailTokens.validateToken(input.token, TokenType.ACCOUNT_INVITE);

    if (record.userId !== null) {
      // Account already exists — they should log in instead
      throw new AppException('ACCOUNT_ALREADY_EXISTS', HttpStatus.CONFLICT);
    }

    if (!record.email) {
      throw new AppException('INVALID_OR_EXPIRED_TOKEN', HttpStatus.BAD_REQUEST);
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: record.email },
      select: { id: true },
    });
    if (existingByEmail) {
      throw new AppException('ACCOUNT_ALREADY_EXISTS', HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const basicUserProfile = await this.prisma.profile.findUnique({
      where: { code: 'BASIC_USER' },
    });
    if (!basicUserProfile) {
      throw new AppException('NOT_FOUND', HttpStatus.NOT_FOUND);
    }

    const newUser = await this.prisma.user.create({
      data: {
        email: record.email,
        name: input.name,
        passwordHash,
        profileId: basicUserProfile.id,
        selfRegistered: true,
        status: 'ACTIVE',
        emailVerified: true,
        // Auto-cria 1 Workspace por User (V1 invariant: 1:1).
        workspaces: {
          create: { name: `${input.name}'s Workspace` },
        },
      },
      select: { id: true, email: true, name: true, locale: true },
    });

    // Cria Subscription default no workspace recém-criado.
    await createDefaultBilling(this.prisma, newUser.id);

    // Link pending ProjectMember records with this email
    await this.prisma.projectMember.updateMany({
      where: { email: record.email, userId: null },
      data: { userId: newUser.id },
    });

    // Phase 6: also accept any direct WorkspaceMember invites with this email
    // (workspace-level invites that don't go through ProjectMember).
    await this.prisma.workspaceMember.updateMany({
      where: { email: record.email, status: 'INVITED' },
      data: { userId: newUser.id, status: 'ACCEPTED', acceptedAt: new Date() },
    });

    // Phase 3 dual-write: also create WorkspaceMember(BASIC, ACCEPTED) for each
    // accepted project membership belonging to this newly-created user.
    // NB: at this point the project invite token may not yet be ACCEPTED — the
    // user accesses the project via /invitations/:id/accept later. But if the
    // invite was bypassed (status='ACCEPTED' set elsewhere), we cover that here.
    const linkedAccepted = await this.prisma.projectMember.findMany({
      where: { userId: newUser.id, status: 'ACCEPTED' },
      select: {
        email: true,
        name: true,
        invitedById: true,
        project: { select: { ownerId: true } },
      },
    });
    for (const pm of linkedAccepted) {
      if (pm.project.ownerId == null) continue;
      await upsertWorkspaceMemberFromProjectAccept(this.prisma, {
        ownerId: pm.project.ownerId,
        userId: newUser.id,
        email: pm.email,
        name: pm.name,
        invitedById: pm.invitedById,
      });
    }

    await this.emailTokens.consumeToken(record.id);

    // Auto-login
    const fullUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: newUser.id },
      include: {
        profile: true,
        workspaces: {
          take: 1,
          include: { subscription: { include: { plan: true } } },
        },
      },
    });

    await this.issueSessionAndCookies(newUser.id, newUser.email, fullUser.profile.code, req, res);

    const subscription = fullUser.workspaces[0]?.subscription ?? null;
    const { passwordHash: _ph, id: _id, workspaces: _ws, ...rest } = fullUser as any;
    // Converte `avatarKey` interno em `avatarUrl` público.
    const safeUser = this.usersService.toPublicResponse(rest as Record<string, unknown>) as any;
    return {
      user: {
        ...safeUser,
        planCode: subscription?.plan?.code ?? null,
        planName: subscription?.plan?.name ?? null,
      },
    };
  }

  // ─── Token Check (validate without consuming) ─────────────────
  async tokenCheck(token: string, type: string): Promise<{ valid: true }> {
    const ALLOWED: Record<string, TokenType> = {
      PASSWORD_RESET: TokenType.PASSWORD_RESET,
      EMAIL_CONFIRMATION: TokenType.EMAIL_CONFIRMATION,
    };
    const tokenType = ALLOWED[type];
    if (!tokenType) {
      throw new AppException('INVALID_TOKEN_TYPE', HttpStatus.BAD_REQUEST);
    }
    return this.emailTokens.checkToken(token, tokenType);
  }

  // ─── Logout (revoga só a sessão actual) ────────────────────────
  async logout(sessionPublicId: string | undefined, userId: number, res: Response): Promise<void> {
    if (sessionPublicId) {
      await this.sessions.revokeSessionByPublicId(sessionPublicId, userId, 'LOGOUT');
    }
    clearAuthCookies(res, this.configService);
  }

  // ─── Refresh (rotation + nova CSRF) ────────────────────────────
  async refresh(req: Request & { cookies?: Record<string, string> }, res: Response): Promise<boolean> {
    const oldRefresh = req.cookies?.refresh_token;
    if (!oldRefresh) return false;

    const ua = req.headers['user-agent'];
    const result = await this.sessions.rotateSession(oldRefresh, {
      ua: typeof ua === 'string' ? ua : undefined,
      ip: req.ip,
    });
    if (!result) {
      clearAuthCookies(res, this.configService);
      return false;
    }

    const session = await this.prisma.session.findUnique({
      where: { id: result.sessionId },
      include: { user: { include: { profile: true } } },
    });
    if (!session) {
      clearAuthCookies(res, this.configService);
      return false;
    }

    const accessToken = await this.jwtService.signAsync({
      sub: session.userId,
      email: session.user.email,
      profileCode: session.user.profile.code,
      sid: result.sessionPublicId,
    });
    const csrfToken = generateCsrfNonce();

    setAuthCookies(
      res,
      {
        accessToken,
        refreshToken: result.refreshToken,
        csrfToken,
        accessMaxAgeMs: parseExpiresInToMs(process.env.JWT_ACCESS_EXPIRES_IN, DEFAULT_ACCESS_MS),
        refreshMaxAgeMs: parseExpiresInToMs(process.env.JWT_REFRESH_EXPIRES_IN, DEFAULT_REFRESH_MS),
      },
      this.configService,
    );

    return true;
  }
}
