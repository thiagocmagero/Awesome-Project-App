# Claude: carregar para tarefas do mecanismo de notificações

## O que é

Sistema de notificações **in-app persistentes** baseado num único modelo Prisma (`Notification`)
e polling HTTP do frontend (30s). Arquitectura escalável para futuros canais via
`NotificationChannel` enum e tabela `NotificationPreference`.

- **Sem real-time** (sem WebSocket / SSE / push do browser) — polling 30s.
- **Sem envio real de email** — `EmailConfig` existe como estrutura, mas
  `nodemailer` / `@nestjs/mailer` **não estão instalados**.
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

**Padrão para futuros canais (ex: EMAIL):**
```typescript
// No futuro EmailSenderService:
async sendNotificationEmail(...) {
  if (!(await this.notificationsService.shouldNotify(userId, type, NotificationChannel.EMAIL))) return;
  // enviar email ...
}
```
Zero alterações ao modelo. Apenas novo service + novo caller.

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
- **Polling**: `setInterval(refetch, 30_000)` com silent failure.
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

## Configuração de email (estrutura sem implementação)

- Modelo `EmailConfig` (singleton) + endpoints `GET/PATCH /platform-config/email`.
- ⚠️ Sem `nodemailer` instalado — zero emails enviados.

## Adicionar novo tipo de notificação — checklist

1. Adicionar valor ao `NotificationType` em `schema.prisma` + migração.
2. Adicionar `create...Notification` em `NotificationsService` (com `shouldNotify` IN_APP).
3. Chamar do service apropriado com `.catch(() => {})`.
4. Adicionar ao array `NOTIFICATION_TYPES` em `features/notifications/types.ts`.
5. Mapear ícone/navegação em `AppLayout.tsx`.
6. Adicionar chaves `type.<TYPE>` e `desc.<TYPE>` no `notifications.json` (4 locales) + `npm run seed`.

## Adicionar novo canal de notificação (ex: EMAIL) — checklist

1. `NotificationChannel` já tem `EMAIL` no enum — zero alterações ao schema.
2. Criar `EmailSenderService` que chama `shouldNotify(userId, type, NotificationChannel.EMAIL)`.
3. `NotificationPreferencesPage` já mostra a coluna EMAIL como disabled — remover `disabled` e ligar ao toggle.
4. Adicionar traduções se necessário.

## Gaps / Limitações actuais

- ❌ Sem WebSocket/SSE — atrasos até 30s.
- ❌ Email sem implementação real (`nodemailer` não instalado).
- ❌ Sem `@nestjs/event-emitter` — acoplamento directo entre callers e service.
- ❌ Sem retry — falha de `prisma.notification.create` é silenciosa.
- ❌ `title` e `body` em PT hardcoded no service — sem i18n para notificações antigas.
- ❌ Sem agrupamento — 5 reações criam 5 notificações.
- ❌ Sem paginação na UI do dropdown (limitado ao primeiro fetch de 20).

## Anti-padrões

- ❌ `await create...Notification` sem `.catch` no caller — bloqueia a operação principal.
- ❌ Criar notificações fora de `NotificationsService` — templates ficam dispersos.
- ❌ Omitir `shouldNotify` num novo `create...Notification` — ignora a preferência do user.
- ❌ Confiar em real-time — actualizar estado local optimisticamente após acções do user.
- ❌ Usar `Notification` para confirmar acções imediatas — usar **toast**.
- ❌ Notificar auto-acções (actor === recipient) — verificar e saltar.

# Relacionados: @docs/claude/backend.md @docs/claude/db.md @docs/claude/auth.md @docs/claude/frontend.md @docs/claude/i18n.md
