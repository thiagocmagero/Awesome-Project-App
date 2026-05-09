import { HttpStatus, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { TokenType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';

export interface CreateTokenOptions {
  userId?: number;
  email?: string;
  expiresInMs: number;
}

@Injectable()
export class EmailTokenService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ────────────────────────────────────────────────────────────────

  async createToken(type: TokenType, opts: CreateTokenOptions): Promise<string> {
    const token = randomBytes(32).toString('hex'); // 64 hex chars (OWASP)
    const expiresAt = new Date(Date.now() + opts.expiresInMs);

    await this.prisma.emailToken.create({
      data: {
        token,
        type,
        userId: opts.userId ?? null,
        email: opts.email ?? null,
        expiresAt,
      },
    });

    return token;
  }

  // ─── Validate (non-consuming) ──────────────────────────────────────────────

  async validateToken(token: string, type: TokenType) {
    const record = await this.prisma.emailToken.findUnique({ where: { token } });

    if (!record || record.type !== type || record.used || record.expiresAt < new Date()) {
      // Generic error — never reveal if token doesn't exist vs. expired vs. used (OWASP)
      throw new AppException('INVALID_OR_EXPIRED_TOKEN', HttpStatus.BAD_REQUEST);
    }

    return record;
  }

  // ─── Consume (mark used) ───────────────────────────────────────────────────

  async consumeToken(id: number): Promise<void> {
    await this.prisma.emailToken.update({
      where: { id },
      data: { used: true },
    });
  }

  // ─── Revoke all unused tokens of a given type for a user ──────────────────

  async revokeExistingTokensForUser(userId: number, type: TokenType): Promise<void> {
    await this.prisma.emailToken.updateMany({
      where: { userId, type, used: false },
      data: { used: true },
    });
  }

  // ─── Per-email rate limiting via DB count ─────────────────────────────────

  async checkEmailRateLimit(
    email: string,
    type: TokenType,
    maxCount: number,
    windowMs: number,
  ): Promise<void> {
    const since = new Date(Date.now() - windowMs);
    const count = await this.prisma.emailToken.count({
      where: {
        email,
        type,
        createdAt: { gte: since },
      },
    });

    if (count >= maxCount) {
      throw new AppException('TOO_MANY_REQUESTS', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  // ─── Per-userId rate limiting via DB count ────────────────────────────────

  async checkUserRateLimit(
    userId: number,
    type: TokenType,
    maxCount: number,
    windowMs: number,
  ): Promise<void> {
    const since = new Date(Date.now() - windowMs);
    const count = await this.prisma.emailToken.count({
      where: {
        userId,
        type,
        createdAt: { gte: since },
      },
    });

    if (count >= maxCount) {
      throw new AppException('TOO_MANY_REQUESTS', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  // ─── Check without consuming (distinguishes used from expired) ───────────

  async checkToken(token: string, type: TokenType): Promise<{ valid: true }> {
    const record = await this.prisma.emailToken.findUnique({ where: { token } });

    if (!record || record.type !== type) {
      throw new AppException('INVALID_OR_EXPIRED_TOKEN', HttpStatus.BAD_REQUEST);
    }

    if (record.used) {
      throw new AppException('TOKEN_ALREADY_USED', HttpStatus.BAD_REQUEST);
    }

    if (record.expiresAt < new Date()) {
      throw new AppException('INVALID_OR_EXPIRED_TOKEN', HttpStatus.BAD_REQUEST);
    }

    return { valid: true };
  }

  // ─── Cleanup stale PENDING tokens ─────────────────────────────────────────

  async cleanupExpiredTokensForEmail(email: string, type: TokenType): Promise<void> {
    // Defensive guard: ensure email is a plain string before using as a filter value.
    // Prisma + PostgreSQL is parameterized SQL (not NoSQL), but this guards against
    // unexpected object injection if the call-site ever bypasses TypeScript types.
    if (typeof email !== 'string' || !email.trim()) return;

    await this.prisma.emailToken.deleteMany({
      where: {
        email: String(email),
        type,
        expiresAt: { lt: new Date() },
      },
    });
  }
}
