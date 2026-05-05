import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { SessionsService } from './sessions.service';
import { setAuthCookies, clearAuthCookies, parseExpiresInToMs } from './cookies.util';
import { generateCsrfNonce } from '../common/csrf/csrf.util';

const DEFAULT_ACCESS_MS = 15 * 60_000;
const DEFAULT_REFRESH_MS = 7 * 86_400_000;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
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
    const existing = await this.usersService.findByEmailWithPassword(input.email);

    if (existing?.selfRegistered) {
      throw new AppException('EMAIL_ALREADY_EXISTS', HttpStatus.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    let user: { id: number; email: string; profile: { code: string }; userPlans: any[]; [key: string]: any };

    if (existing && !existing.selfRegistered) {
      user = await this.usersService.activateInvitedUser(existing.id, {
        name: input.name,
        passwordHash,
      });
    } else {
      user = await this.usersService.createWithDefaultProfile({
        email: input.email,
        name: input.name,
        passwordHash,
      });
    }

    await this.prisma.projectMember.updateMany({
      where: { email: input.email, userId: null },
      data: { userId: user.id },
    });

    await this.issueSessionAndCookies(user.id, user.email, user.profile.code, req, res);

    const { id: _id, ...safeUser } = user;

    return {
      user: {
        ...safeUser,
        planCode: (safeUser as any).userPlans?.[0]?.plan?.code ?? null,
        planName: (safeUser as any).userPlans?.[0]?.plan?.name ?? null,
      },
    };
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

    if (user.status !== 'ACTIVE') {
      throw new AppException('INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED);
    }

    await this.issueSessionAndCookies(user.id, user.email, user.profile.code, req, res);

    const { passwordHash: _ph, id: _id, selfRegistered: _sr, ...safeUser } = user;

    return {
      user: {
        ...safeUser,
        planCode: (safeUser as any).userPlans?.[0]?.plan?.code ?? null,
        planName: (safeUser as any).userPlans?.[0]?.plan?.name ?? null,
      },
    };
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
