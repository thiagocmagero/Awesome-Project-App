# Claude: carregar para tarefas do mecanismo de notificações

## O que é

Sistema de notificações **in-app persistentes** baseado num único modelo Prisma (`Notification`)
com **push em tempo real via WebSocket (Socket.io)** + fallback de polling HTTP (5min).
Arquitectura escalável para futuros canais via `NotificationChannel` enum e tabela
`NotificationPreference`, e para outras tools (Board, Gantt, Timesheet) via
`WebSocketContext` genérico no frontend.

- **Real-time via WebSocket** (Maio 2026) — Socket.io namespace `/notifications`,
  push imediato (<1s) sempre que o `NotificationsService` cria uma notificação.
  Toast Bootstrap/Zynix aparece em Top Right com fade-in/out (8s default).
  Detalhes na secção "WebSocket — push em tempo real".
- **Polling como fallback** — `useNotifications` faz `GET /notifications?limit=20`
  a cada **5 min** (era 30s antes do WS) para apanhar drift e notificações
  criadas off-line ou enquanto o socket esteve caído.
- **Email implementado** — fan-out IN_APP + EMAIL no `NotificationsService` para
  todos os 10 tipos. Stack Brevo SMTP + Nodemailer + React Email, locale-aware.
  Detalhes em @docs/claude/email.md.
- **Toasts** e **SweetAlert** são camadas auxiliares de UX para feedback imediato
  — não substituem a tabela `Notification`, que serve para eventos assíncronos.
- **Preferências de notificação** por utilizador, tipo e canal — modelo opt-out
  (ausência de registo = enabled).

## Modelos Prisma

```prisma
enum EntityType { TASK PROJECT }

enum NotificationType {
  MENTION TASK_ASSIGNED
  INVITATION_RECEIVED INVITATION_ACCEPTED INVITATION_DECLINED
  COMMENT_REACTION
}

enum NotificationChannel { IN_APP EMAIL BROWSER }

model Notification {
  id              Int              @id @default(autoincrement())
  publicId        String           @unique @default(uuid(7))
  userId          Int
  user            User             @relation(..., onDelete: Cascade)
  type            NotificationType
  title           String
  body            String
  entityType      EntityType?
  entityPublicId  String?
  projectPublicId String?
  read            Boolean          @default(false)
  createdAt       DateTime         @default(now())
}

/// Opt-out model: ausência de registo = enabled (true)
model NotificationPreference {
  id        Int                 @id @default(autoincrement())
  publicId  String              @unique @default(uuid(7))
  userId    Int
  user      User                @relation(..., onDelete: Cascade)
  type      NotificationType
  channel   NotificationChannel
  enabled   Boolean             @default(true)
  updatedAt DateTime            @updatedAt
  @@unique([userId, type, channel])
  @@index([userId])
}
```

> `onDelete: Cascade` no `userId` de ambos os modelos — eliminar o user
> elimina notificações e preferências. Hard delete por cascade (excepção ao soft delete).

## Endpoints REST

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/notifications?cursor=&limit=` | JWT | Paginado cursor-based, `limit` máx 50, default 20. Retorna `{ items, nextCursor }` |
| GET | `/api/notifications/unread-count` | JWT | `{ count: number }` |
| PATCH | `/api/notifications/mark-read` | JWT | Body `{ publicIds?: string[] }` — vazio = marcar todas como lidas |
| GET | `/api/notifications/preferences` | JWT | Lista todas as preferências do user. Ausente = opt-out default |
| PUT | `/api/notifications/preferences/:type/:channel` | JWT | Body `{ enabled: boolean }`. `:type` e `:channel` validados com `ParseEnumPipe` |

Controller: [backend/src/notifications/notifications.controller.ts](backend/src/notifications/notifications.controller.ts).
DTOs de saída: [dto/notification-response.dto.ts](backend/src/notifications/dto/notification-response.dto.ts) — expõe `publicId` nunca `id` ou `userId`.
DTO de preferência: [dto/upsert-preference.dto.ts](backend/src/notifications/dto/upsert-preference.dto.ts).

## Quem cria notificações (6 fontes)

Todas as criações seguem o padrão **fire-and-forget + shouldNotify**:
1. Verificar `shouldNotify(userId, type, IN_APP)` antes de criar.
2. Caller usa `.catch(() => {})` para não bloquear a operação principal.

| Tipo | Caller | Quem é notificado | Filtro |
|------|--------|-------------------|--------|
| `MENTION` | [comments.service.ts:206,287](backend/src/comments/comments.service.ts) | Cada user mencionado | Ignora self |
| `COMMENT_REACTION` | [comments.service.ts:342](backend/src/comments/comments.service.ts) | Autor do comentário | Ignora self-reaction; só em add |
| `INVITATION_RECEIVED` | [projects.service.ts:455](backend/src/projects/projects.service.ts) | User convidado | Só se `existingUser` |
| `INVITATION_ACCEPTED` | [invitations.service.ts:88](backend/src/invitations/invitations.service.ts) | Convidante | — |
| `INVITATION_DECLINED` | [invitations.service.ts:115](backend/src/invitations/invitations.service.ts) | Convidante | — |
| `TASK_ASSIGNED` | [planning.service.ts:561](backend/src/planning/planning.service.ts) | Cada novo assignee | Só com `userId` (sem recursos externos) |
| `TIMESHEET_SUBMITTED` | [timesheet.service.ts](backend/src/timesheet/timesheet.service.ts) `submitWeek()` | Cada user com TIMESHEET_APPROVE no projecto | 1 notificação por aprovador (REQ-N05; sem agregação V1) |
| `TIMESHEET_APPROVED` | [timesheet.service.ts](backend/src/timesheet/timesheet.service.ts) `approveDay`/`approveWeek`/`approveMonth` | User submetente | Só dispara se nova `week.status === APPROVED` |
| `TIMESHEET_PARTIALLY_APPROVED` | [timesheet.service.ts](backend/src/timesheet/timesheet.service.ts) idem | User submetente | Só dispara se nova `week.status === PARTIAL` |
| `TIMESHEET_REJECTED` | [timesheet.service.ts](backend/src/timesheet/timesheet.service.ts) `rejectDay`/`rejectWeekGlobal` | User submetente | `body` inclui o `reason` (REQ-N04) |

> **Nota (Abril 2026)**: `revertWeek`/`revertMonth` (action `REVERT`) **não**
> dispara notificação ao user — é uma acção interna do gestor. O user só volta
> a ser notificado quando o gestor re-aprovar/re-rejeitar.

## shouldNotify — helper central de escalabilidade

[notifications.service.ts](backend/src/notifications/notifications.service.ts):

```typescript
async shouldNotify(userId, type: NotificationType, channel: NotificationChannel): Promise<boolean> {
  const pref = await this.prisma.notificationPreference.findUnique({
    where: { userId_type_channel: { userId, type, channel } },
  });
  return pref?.enabled ?? true; // opt-out: ausente = true
}
```

**Canal EMAIL (implementado, Mai 2026):** cada `createXxxNotification` faz
fan-out independente — IN_APP cria registo se `shouldNotify(IN_APP)`; EMAIL
resolve `User.email/name/locale` e dispara `EmailService.sendXxxEmail(...)`
fire-and-forget se `shouldNotify(EMAIL)`. Os dois canais são independentes
em BD (preferências separadas por `(userId, type, channel)`). Ver
@docs/claude/email.md para o pipeline completo.

**Padrão para futuros canais (ex: BROWSER push):**
```typescript
// No futuro BrowserPushService:
async sendBrowserPush(...) {
  if (!(await this.notificationsService.shouldNotify(userId, type, NotificationChannel.BROWSER))) return;
  // disparar push API ...
}
```
Zero alterações ao modelo. Apenas novo service + chamada paralela em cada
`createXxxNotification`.

## WebSocket — push em tempo real (Maio 2026)

Push imediato de notificações usa **Socket.io** com namespace `/notifications`.
Arquitectura genérica — outras tools (Board, Gantt, Timesheet) podem subscrever
eventos próprios sem criar gateways novos.

### Backend

[`backend/src/notifications/notifications.gateway.ts`](backend/src/notifications/notifications.gateway.ts):

```typescript
@WebSocketGateway({
  namespace: '/notifications',
  path: '/api/socket.io',          // ← sob /api para que o cookie access_token seja enviado
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  handleConnection(client: Socket): void {
    const userId = this.authenticate(client);  // JWT do cookie access_token
    if (userId === null) { client.disconnect(true); return; }
    client.join(`user:${userId}`);
  }

  async emitToUser(userId: number, event: string, data: unknown): Promise<void> {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  private authenticate(client: Socket): number | null {
    const cookieHeader = client.handshake.headers.cookie ?? '';
    const token = parseAccessTokenCookie(cookieHeader);
    if (!token) return null;
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { sub: number };
    return typeof payload.sub === 'number' ? payload.sub : null;
  }
}
```

**Decisões críticas:**

- **`path: '/api/socket.io'`** (não `/socket.io`) — o cookie HttpOnly `access_token`
  tem `Path=/api`, logo o browser **só** o envia em requests sob `/api/*`. Se o
  path fosse `/socket.io`, o handshake chegava sem cookie e o gateway rejeitava
  silenciosamente. Esta é uma das principais armadilhas — qualquer gateway WS
  novo no projecto **deve** ser montado sob `/api/`.
- **Auth via cookie JWT** — mesmo mecanismo do `JwtStrategy`. Sem cookie válido,
  `handleConnection` chama `client.disconnect(true)` imediatamente.
- **Room `user:{internalUserId}`** — o id numérico interno **nunca** é exposto ao
  cliente; serve apenas como chave de roteamento server-side. Cliente conhece
  apenas `publicId` UUID v7.
- **`jsonwebtoken` é dep directa** (`@types/jsonwebtoken` em devDeps) — não
  depender da transitiva via `@nestjs/jwt`.
- **`@WebSocketServer() server`** é o `Namespace` do `/notifications`, não a
  `Server` global. Para introspecção das rooms usar
  `await server.in(room).fetchSockets()` (funciona em qualquer adapter, incluindo
  Redis no futuro).
- Emissão é **`async fire-and-forget`** — `createAndEmit` no service faz
  `.catch(() => logger.warn(...))` para não bloquear o request HTTP que originou
  a notificação.

### Helper `createAndEmit` no NotificationsService

[`backend/src/notifications/notifications.service.ts`](backend/src/notifications/notifications.service.ts)
centraliza a criação BD + emissão WS num único helper:

```typescript
private async createAndEmit(data: Prisma.NotificationCreateInput): Promise<Notification> {
  const created = await this.prisma.notification.create({ data });
  this.gateway
    .emitToUser(created.userId, 'notification:new', NotificationResponseDto.from(created))
    .catch((err) => this.logger.warn(`WS emit failed for user ${created.userId}: ${err.message}`));
  return created;
}
```

**Garantia:** o payload emitido via WS é **exactamente o mesmo DTO** que a API
REST devolve (`NotificationResponseDto`). Nunca emitir um payload com formato
diferente — quebra o `dedup` no cliente.

Todos os `createXxxNotification` chamam `createAndEmit({...})` em vez de
`prisma.notification.create({ data: {...} })` directamente. **Nunca persistir
sem emitir** — fica desnincronizado.

### Frontend

| Ficheiro | Responsabilidade |
|---|---|
| [`contexts/WebSocketContext.tsx`](frontend/src/contexts/WebSocketContext.tsx) | Provider singleton Socket.io com API genérica `on(event, handler)` |
| [`hooks/useNotifications.ts`](frontend/src/hooks/useNotifications.ts) | Subscreve `notification:new` via `useWebSocket().on(...)`, prepend à lista + incrementa `unreadCount` + adiciona a `pendingToasts` |
| [`components/NotificationToastStack.tsx`](frontend/src/components/NotificationToastStack.tsx) | Stack de toasts Bootstrap/Zynix em Top Right, com fade-in/out e ciclo de vida próprio |

**WebSocketContext** — Provider genérico. Conecta a `io('/notifications', { path: '/api/socket.io', withCredentials: true })` quando há `user` autenticado;
desconecta no logout. Expõe `on(event, handler)` reutilizável:

```typescript
// Em qualquer hook:
const { on } = useWebSocket();
useEffect(() => on('notification:new', (data) => { ... }), [on]);

// Futuro Board:
useEffect(() => on('board:card-moved', (data) => { ... }), [on]);
```

- **`on` está em `useCallback([])`** (refs estáveis) — referência estável entre
  renders evita loop infinito em `useEffect([on])` dos consumidores.
- **Fan-out central via `socket.onAny`** — qualquer evento é distribuído pelos
  handlers registados via `on(event, handler)`. Sem listeners individuais por
  evento.
- **Dedup no `useNotifications`** via `seenPublicIdsRef` — protege contra
  duplicação quando uma notificação chega via WS e logo a seguir num refetch
  do polling de fallback.

**NotificationToastStack** — usa `.toast.fade.show` (Bootstrap) com 3 fases por
toast (`entering` → `visible` → `leaving`). Lifecycle gerido por cada
`ToastItem`, não pelo hook — o hook só adiciona a `pendingToasts`, o componente
chama `onDismiss` no fim do fade-out.

- **`visibleMs` default 8000** (8s visível) + 30ms entering + 250ms leaving.
- **Click no toast inteiro** (excepto `.btn-close`) → navega via
  `handleNotifClick` para `/projects/:id/planning/tasks/:taskId` quando o tipo
  for `MENTION`/`TASK_ASSIGNED`/`COMMENT_REACTION` com `entityPublicId`.
- **Posicionado abaixo do header fixo** (`top: 70px`, `z-index: 1080`).

### Vite proxy (dev)

[`frontend/vite.config.ts`](frontend/vite.config.ts) — a regra `/api` agora tem
`ws: true` para aceitar o HTTP→WS upgrade do Socket.io. Como o path do
socket.io é `/api/socket.io`, fica capturado pela mesma regra:

```typescript
proxy: {
  '/api': {
    target: 'http://awesome-project-app-backend:3000',
    changeOrigin: true,
    ws: true,                  // ← obrigatório para Socket.io
    cookieDomainRewrite: '',
  },
},
```

> **Nunca** criar regra `/socket.io` separada — quebra a entrega do cookie
> `access_token` (que tem `Path=/api`).

### Verificação end-to-end

| Sinal | Significa |
|---|---|
| DevTools → Network → WS → `socket.io` com **101 Switching Protocols** | Upgrade WS bem-sucedido |
| Cookie header da request WS inclui `access_token=...` | Cookie path correcto |
| Log backend `WS connected socket=xxx user=N ns=/notifications` | Auth passou + room joined |
| Log backend `emitToUser user=N event=notification:new sockets-in-room=1` | Emissão atingiu o cliente |
| Toast aparece <1s após acção | Push real-time funcional |
| Sino actualiza sem F5 | `useNotifications` apanhou o evento WS |
| Reconnect automático após `docker restart backend` | Resiliência confirmada |

### Adicionar evento WS para nova tool (ex: Board)

1. Criar gateway sob `/api/`:
   ```typescript
   @WebSocketGateway({ namespace: '/board', path: '/api/socket.io', cors: ... })
   export class BoardGateway { /* ... emitToProject(projectId, 'card:moved', data) */ }
   ```
2. Injectar o gateway no service que dispara o evento. Chamar fire-and-forget.
3. Frontend — novo hook ou existente subscrevendo:
   ```typescript
   const { on } = useWebSocket();
   useEffect(() => on('card:moved', handleCardMoved), [on]);
   ```

> **Nota:** se o evento for project-scoped (não user-scoped), a room deve ser
> `project:{projectId}` e o cliente precisa de fazer `socket.emit('join-project', projectPublicId)`
> após connect — o servidor valida acesso e faz `socket.join('project:N')`.

## Frontend — tipos partilhados

[frontend/src/features/notifications/types.ts](frontend/src/features/notifications/types.ts):

```typescript
export const NOTIFICATION_TYPES = ['MENTION', 'TASK_ASSIGNED', ...] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const NOTIFICATION_CHANNELS = ['IN_APP', 'EMAIL', 'BROWSER'] as const;
export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number];

export interface AppNotification { ... entityType: 'TASK' | 'PROJECT' | null ... }
export interface NotificationPreference { publicId, type, channel, enabled }
export function isEnabled(prefs, type, channel): boolean // opt-out helper
```

## Frontend — hook `useNotifications`

[frontend/src/hooks/useNotifications.ts](frontend/src/hooks/useNotifications.ts):

- Importa `AppNotification` de `features/notifications/types.ts`.
- **WebSocket** (canal primário): subscreve `notification:new` via
  `useWebSocket().on(...)` — prepend imediato + incrementa `unreadCount` +
  adiciona a `pendingToasts`.
- **Polling fallback**: `setInterval(refetch, 5 * 60_000)` (5 min) com silent
  failure. Apanha drift e notificações criadas off-line.
- **Dedup WS vs polling** via `seenPublicIdsRef: Set<string>` — qualquer
  notificação cujo `publicId` já foi visto é ignorada na chegada WS.
- **`pendingToasts` / `dismissToast`**: estado para o `NotificationToastStack`
  (auto-dismiss é gerido pelo componente, não pelo hook).
- **Paginação**: `{ notifications, nextCursor, loadMore, ... }`. `loadMore()` busca
  página seguinte com `?cursor=<nextCursor>`.
- **Optimistic update** em `markAsRead` / `markAllAsRead`.

## Frontend — Dropdown UI (AppLayout.tsx)

[frontend/src/components/AppLayout.tsx](frontend/src/components/AppLayout.tsx):

- Bell icon + pulse badge se `unreadCount > 0`.
- Header do dropdown: título "Notificações" + **ícone engrenagem** (`ri-settings-3-line`)
  que navega para `/settings/notifications`.
- Renderiza primeiras 20 notificações.
- Click → marca como lida + navega (tipos com `projectPublicId`).
- `INVITATION_RECEIVED`: botões Aceitar/Recusar inline.

## Frontend — Página de Preferências

[frontend/src/pages/NotificationPreferencesPage.tsx](frontend/src/pages/NotificationPreferencesPage.tsx).
Rota: `/settings/notifications`.
Acessível via:
- Ícone engrenagem no header do dropdown de notificações.
- Link "Preferências de Notificações" no menu de contexto do utilizador (perfil).

**Tabela de preferências:**
- Linhas: 6 tipos de notificação.
- Colunas: In-App (toggle activo) · Email (disabled, badge "Em breve") · Navegador (disabled, badge "Em breve").
- Auto-save por toggle (optimistic + toast). Sem botão "Guardar".
- `GET /notifications/preferences` ao montar; `PUT` por toggle.

## Camadas auxiliares de UX

### Toasts — `react-hot-toast`
[frontend/src/contexts/ToastContext.tsx](frontend/src/contexts/ToastContext.tsx):
- API: `showToast(variant, message)` — 6 variantes.
- `top-center`, 4000ms. **Nunca** `alert()`.

### SweetAlert — `sweetalert2`
| Caso | Ficheiro | Comportamento |
|------|----------|---------------|
| Convites pendentes ao login | [hooks/usePendingInvitations.ts](frontend/src/hooks/usePendingInvitations.ts) | Loop sequencial bloqueante |
| Confirmação revoke session | [pages/SessionsPage.tsx](frontend/src/pages/SessionsPage.tsx) | Confirm/cancel |

## i18n

| Namespace | Ficheiro seed | Usado em |
|-----------|--------------|---------|
| `common` | `seeds/translations/common.json` | `nav.notification_preferences` (AppLayout) |
| `notifications` | `seeds/translations/notifications.json` | `NotificationPreferencesPage` |

Chaves `notifications`:
- `page.title/subtitle`, `table.*`, `type.<TYPE>`, `desc.<TYPE>`, `success.saved`, `error.save`

## Configuração de email

- Modelo `EmailConfig` (singleton id=1) — apenas metadados (`enabled`,
  `fromEmail`, `fromName`); SMTP secrets em env vars (`SMTP_*`).
- Endpoints: `GET/PATCH /platform-config/email` (admin),
  `GET /platform-config/email/smtp-status` (admin),
  `GET /platform-config/email/availability` (qualquer JWT — devolve só `{ available }`).
- UI: `/settings/email` (PLATFORM_ADMIN). Detalhes completos em
  @docs/claude/email.md.

## Adicionar novo tipo de notificação — checklist

1. Adicionar valor ao `NotificationType` em `schema.prisma` + migração.
2. Adicionar `create...Notification` em `NotificationsService` com fan-out
   IN_APP + EMAIL (espelhar `createMentionNotification`).
3. Chamar do service de domínio apropriado com `.catch(() => {})`.
4. Adicionar ao array `NOTIFICATION_TYPES` em `features/notifications/types.ts`.
5. Mapear ícone/navegação em `AppLayout.tsx`.
6. Adicionar chaves `type.<TYPE>` e `desc.<TYPE>` no `notifications.json` (4 locales).
7. **Email**: criar template + chaves no namespace `email` + método `sendXxxEmail`
   no `EmailService` — ver @docs/claude/email.md "Adicionar um novo tipo".
8. Correr `npm run seed` no container backend.

## Gaps / Limitações actuais

- ❌ Sem `@nestjs/event-emitter` — acoplamento directo entre callers e service.
- ❌ Sem retry — falha de `prisma.notification.create` é silenciosa.
- ❌ `title` e `body` das notificações in-app em PT hardcoded no service —
  apenas o canal EMAIL é locale-aware (via `User.locale` + namespace `email`).
- ❌ Sem agrupamento — 5 reações criam 5 notificações.
- ❌ Sem paginação na UI do dropdown (limitado ao primeiro fetch de 20).
- ❌ Canal BROWSER (push) ainda placeholder — coluna `disabled` na UI.
- ❌ Socket.io WS sem adapter Redis — múltiplas instâncias backend não
  partilham rooms. Para escalar horizontalmente: instalar `@socket.io/redis-adapter`
  e configurar via `IoAdapter` custom. Detalhes técnicos triviais; mantido out-of-scope V1.
- ❌ Token JWT que expira durante sessão WS aberta — socket fica activo até
  reconexão. Aceitável MVP; resolver no futuro com refresh-aware reconnect.

## Anti-padrões

- ❌ `await create...Notification` sem `.catch` no caller — bloqueia a operação principal.
- ❌ Criar notificações fora de `NotificationsService` — templates ficam dispersos.
- ❌ Omitir `shouldNotify` num novo `create...Notification` — ignora a preferência do user.
- ❌ `prisma.notification.create({ data: {...} })` directo em código novo — usar
  `this.createAndEmit({...})` (helper privado do `NotificationsService`).
  Persistir sem emitir deixa o user a esperar 5 min pelo polling.
- ❌ Emitir um payload via WS com formato diferente do `NotificationResponseDto`
  — quebra o dedup `seenPublicIdsRef` no cliente e a UI fica inconsistente.
- ❌ Criar gateway WS novo com `path: '/socket.io'` (sem o prefixo `/api`) —
  o cookie `access_token` (Path=/api) não chega ao handshake e o gateway
  rejeita silenciosamente. **Sempre** `path: '/api/socket.io'`.
- ❌ Criar regra de proxy Vite separada para `/socket.io` — a regra `/api`
  já apanha o tráfego (com `ws: true`). Regra duplicada causa duas rotas
  conflictuantes e quebra cookies em dev.
- ❌ Usar `jsonwebtoken` no gateway como dependência transitiva (via `@nestjs/jwt`)
  — instalar como dep directa (`jsonwebtoken` + `@types/jsonwebtoken`).
- ❌ Capturar `canDo`/`user`/qualquer state React por closure dentro de
  `socket.onAny`/`socket.on` — usar `useRef` (padrão DHTMLX já documentado em
  outros docs). No `WebSocketContext` actual, o fan-out usa `handlersRef.current`
  para isto.
- ❌ Confiar em real-time como única fonte de verdade — actualizar estado local
  optimisticamente após acções do user e manter polling fallback como rede de
  segurança (5 min, não 30s).
- ❌ Usar `Notification` para confirmar acções imediatas — usar **toast** (react-hot-toast)
  da `ToastContext`. O `NotificationToastStack` é distinto: vem de eventos
  assíncronos via WS, não de acções locais do user.
- ❌ Notificar auto-acções (actor === recipient) — verificar e saltar.

# Relacionados: @docs/claude/email.md @docs/claude/backend.md @docs/claude/db.md @docs/claude/auth.md @docs/claude/frontend.md @docs/claude/i18n.md
