import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * Tracker por (IP + email) — evita lockout de IPs partilhados e mantém protecção
 * contra brute-force quando um atacante alterna emails no mesmo IP.
 */
@Injectable()
export class LoginThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const body = (req.body ?? {}) as { email?: unknown };
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const ip = req.ip ?? (Array.isArray(req.ips) ? req.ips[0] : undefined) ?? 'unknown';
    return `${ip}:${email}`;
  }
}
