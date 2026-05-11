import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

interface HandshakeJwtPayload {
  sub: number;
  email?: string;
  profileCode?: string;
  sid?: string;
}

/**
 * Gateway Socket.io para push de notificações em tempo real.
 *
 * - Namespace: `/notifications`
 * - Auth: cookie `access_token` lido no handshake (mesmo mecanismo do JwtStrategy)
 * - Rooms: `user:{internalUserId}` — o id numérico interno nunca é exposto ao cliente,
 *   serve apenas para roteamento server-side
 *
 * Escalável: para adicionar novos eventos noutras tools, criar gateways
 * paralelos com namespaces dedicados (`/board`, `/planning`, etc.) ou
 * estender este com mais métodos `emitToUser(userId, 'event-name', payload)`.
 */
@WebSocketGateway({
  namespace: '/notifications',
  // Path montado sob /api para que o cookie HttpOnly `access_token`
  // (Path=/api) seja enviado pelo browser no handshake. Sem isto, o cookie
  // não chega ao backend e o gateway rejeita silenciosamente.
  path: '/api/socket.io',
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: Socket): void {
    try {
      const userId = this.authenticate(client);
      if (userId === null) {
        const cookieHeader = client.handshake.headers.cookie ?? '';
        const hasAccessTokenCookie = cookieHeader.includes('access_token=');
        this.logger.warn(`WS auth FAILED socket=${client.id} cookie-len=${cookieHeader.length} has-access-token=${hasAccessTokenCookie}`);
        client.disconnect(true);
        return;
      }
      client.join(`user:${userId}`);
      client.data.userId = userId;
      this.logger.log(`WS connected socket=${client.id} user=${userId} ns=${client.nsp.name}`);
    } catch (err) {
      this.logger.error(`WS handleConnection error: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    if (client.data?.userId) {
      this.logger.log(`WS disconnected socket=${client.id} user=${client.data.userId}`);
    }
  }

  /** Emite um evento para todas as sessões abertas dum utilizador. */
  async emitToUser(userId: number, event: string, data: unknown): Promise<void> {
    if (!this.server) {
      this.logger.warn(`emitToUser SKIPPED — gateway not initialized (user=${userId} event=${event})`);
      return;
    }
    const room = `user:${userId}`;
    // fetchSockets() funciona em qualquer adapter (in-memory ou Redis no futuro)
    const sockets = await this.server.in(room).fetchSockets();
    this.logger.log(`emitToUser user=${userId} event=${event} sockets-in-room=${sockets.length}`);
    this.server.to(room).emit(event, data);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private authenticate(client: Socket): number | null {
    const token = this.extractTokenFromCookie(client);
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      this.logger.error('JWT_SECRET não configurada — rejeitando conexão WS');
      return null;
    }

    try {
      const payload = jwt.verify(token, secret) as unknown as HandshakeJwtPayload;
      if (typeof payload?.sub !== 'number') return null;
      return payload.sub;
    } catch {
      return null;
    }
  }

  private extractTokenFromCookie(client: Socket): string | null {
    const cookieHeader = client.handshake.headers.cookie;
    if (!cookieHeader) return null;
    const parts = cookieHeader.split(';');
    for (const raw of parts) {
      const trimmed = raw.trim();
      if (trimmed.startsWith('access_token=')) {
        return decodeURIComponent(trimmed.slice('access_token='.length));
      }
    }
    return null;
  }
}
