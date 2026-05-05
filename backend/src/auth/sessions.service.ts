import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import type { Session } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { parseExpiresInToMs } from './cookies.util';

const REFRESH_TOKEN_BYTES = 48;
const SESSION_CACHE_TTL_MS = 30_000;
const TOUCH_DEBOUNCE_MS = 60_000;

export type RevokedReason =
  | 'LOGOUT'
  | 'REVOKED_BY_USER'
  | 'ROTATION'
  | 'EXPIRED'
  | 'ADMIN'
  | 'PASSWORD_RESET'
  | 'MFA_CHANGE'
  | 'FORCED_LOGOUT'
  | 'RISK_DETECTED';

export interface CreateSessionMeta {
  ua?: string;
  ip?: string;
}

export interface SessionCreationResult {
  sessionId: number;
  sessionPublicId: string;
  refreshToken: string;
  expiresAt: Date;
}

@Injectable()
export class SessionsService {
  private readonly sessionCache = new Map<string, { session: Session; cachedAt: number }>();
  private readonly lastTouchAt = new Map<number, number>();

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────────
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }

  private refreshTtlMs(): number {
    return parseExpiresInToMs(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 86_400_000);
  }

  private invalidateCache(publicId: string): void {
    this.sessionCache.delete(publicId);
  }

  // ─── Criação / rotação ────────────────────────────────────────
  async createSession(userId: number, meta: CreateSessionMeta): Promise<SessionCreationResult> {
    const refreshToken = this.generateRefreshToken();
    const refreshTokenHash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlMs());

    const created = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        userAgent: meta.ua?.slice(0, 512) ?? null,
        ip: meta.ip ?? null,
        lastUsedIp: meta.ip ?? null,
        expiresAt,
      },
      select: { id: true, publicId: true, expiresAt: true },
    });

    return {
      sessionId: created.id,
      sessionPublicId: created.publicId,
      refreshToken,
      expiresAt: created.expiresAt,
    };
  }

  async validateRefreshToken(token: string): Promise<Session | null> {
    if (!token) return null;
    const hash = this.hashToken(token);
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    if (!session) return null;
    if (session.revokedAt) return null;
    if (session.expiresAt < new Date()) return null;
    return session;
  }

  /**
   * Rotaciona refresh token. Revoga o antigo (ROTATION) e cria novo.
   * Detecção de replay: se o token recebido já foi usado numa rotação anterior,
   * revoga TODA a cadeia do user (assume compromisso).
   */
  async rotateSession(
    oldToken: string,
    meta: CreateSessionMeta,
  ): Promise<SessionCreationResult | null> {
    const oldSession = await this.validateRefreshToken(oldToken);

    if (!oldSession) {
      // Replay? Token existe mas está revogado com reason ROTATION
      const hash = this.hashToken(oldToken);
      const existing = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
      if (existing && existing.revokedReason === 'ROTATION') {
        await this.revokeAllForUser(existing.userId, 'RISK_DETECTED');
      }
      return null;
    }

    return this.prisma.$transaction(async (tx) => {
      const refreshToken = this.generateRefreshToken();
      const refreshTokenHash = this.hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + this.refreshTtlMs());

      const newSession = await tx.session.create({
        data: {
          userId: oldSession.userId,
          refreshTokenHash,
          userAgent: meta.ua?.slice(0, 512) ?? oldSession.userAgent,
          ip: meta.ip ?? oldSession.ip,
          lastUsedIp: meta.ip ?? oldSession.lastUsedIp,
          expiresAt,
        },
        select: { id: true, publicId: true, expiresAt: true },
      });

      await tx.session.update({
        where: { id: oldSession.id },
        data: {
          revokedAt: new Date(),
          revokedReason: 'ROTATION',
          replacedById: newSession.id,
        },
      });

      this.invalidateCache(oldSession.publicId);

      return {
        sessionId: newSession.id,
        sessionPublicId: newSession.publicId,
        refreshToken,
        expiresAt: newSession.expiresAt,
      };
    });
  }

  // ─── Revogação ────────────────────────────────────────────────
  async revokeSessionByPublicId(
    publicId: string,
    userId: number,
    reason: RevokedReason,
  ): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: { publicId, userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    if (result.count > 0) this.invalidateCache(publicId);
    return result.count > 0;
  }

  async revokeOthersForUser(
    userId: number,
    exceptSessionId: number,
    reason: RevokedReason,
  ): Promise<number> {
    const affected = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, id: { not: exceptSessionId } },
      select: { publicId: true },
    });
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null, id: { not: exceptSessionId } },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    affected.forEach((s) => this.invalidateCache(s.publicId));
    return affected.length;
  }

  async revokeAllForUser(userId: number, reason: RevokedReason): Promise<number> {
    const affected = await this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      select: { publicId: true },
    });
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    affected.forEach((s) => this.invalidateCache(s.publicId));
    return affected.length;
  }

  // ─── Leitura (com cache) ──────────────────────────────────────
  async findActiveByPublicId(publicId: string): Promise<Session | null> {
    const cached = this.sessionCache.get(publicId);
    if (cached && Date.now() - cached.cachedAt < SESSION_CACHE_TTL_MS) {
      if (cached.session.revokedAt) return null;
      if (cached.session.expiresAt < new Date()) return null;
      return cached.session;
    }

    const session = await this.prisma.session.findUnique({ where: { publicId } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      this.sessionCache.delete(publicId);
      return null;
    }
    this.sessionCache.set(publicId, { session, cachedAt: Date.now() });
    return session;
  }

  async listActiveForUser(userId: number): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  // ─── Actividade (throttled — 1×/60s por sessão) ───────────────
  touchSession(sessionId: number, ip?: string): void {
    const now = Date.now();
    const last = this.lastTouchAt.get(sessionId) ?? 0;
    if (now - last < TOUCH_DEBOUNCE_MS) return;
    this.lastTouchAt.set(sessionId, now);

    // fire-and-forget
    this.prisma.session
      .update({
        where: { id: sessionId },
        data: { lastUsedAt: new Date(), ...(ip ? { lastUsedIp: ip } : {}) },
      })
      .catch(() => {
        // Silencioso: se a sessão foi revogada entretanto, não queremos partir o request.
      });
  }
}
