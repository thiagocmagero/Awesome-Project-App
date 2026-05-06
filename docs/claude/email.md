# Claude: carregar para qualquer tarefa de envio de emails

## O que é

Sistema de envio de **emails transacionais** acoplado ao mecanismo de
notificações in-app. Cada `NotificationType` que existe na app tem um caller
que dispara fan-out para 2 canais independentes:

- **IN_APP** — notificação persistida em BD, lida pelo polling 30 s do frontend.
- **EMAIL** — email transacional via SMTP da Brevo, renderizado a partir de
  templates [React Email](https://react.email/) com strings i18n no idioma
  preferido do destinatário (`User.locale`, fallback `en`).

A escolha do canal é feita por preferência do utilizador
(`NotificationPreference (userId, type, channel)`, opt-out — ausente = enabled);
o admin pode desligar globalmente o canal email com uma flag em `EmailConfig`.

> **Não há envio agregado** (digest) nem retries — cada acção dispara 1 email
> por destinatário, fire-and-forget. Falhas são logadas mas nunca propagam
> para o caller (não bloqueiam a transacção principal).

## Stack

| Camada | Tecnologia | Versão |
|---|---|---|
| SMTP relay | Brevo | smtp-relay.brevo.com:587 |
| Cliente SMTP | nodemailer | ^6.9.16 |
| Templates | @react-email/components | ^0.0.31 |
| Render | @react-email/render | ^1.0.4 |
| Runtime React | react / react-dom | ^18.3.1 |
| i18n lookup | I18nService (Prisma `Translation`) | módulo interno |

**TypeScript**: o backend tem `jsx: "react-jsx"` em
[tsconfig.json](backend/tsconfig.json) e include de `*.tsx` para suportar
templates React Email no Node.

## Configuração

### Env vars (container backend)

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USERNAME=<conta Brevo>
SMTP_PASSWORD=<chave Brevo>
APP_URL=http://localhost:5173    # usada para construir links em emails
```

Gerido em [.env.example](.env.example) e
[docker-compose.local.yml](docker-compose.local.yml). O container tem que ser
**recriado** (`up -d --force-recreate backend`) quando estes valores mudam —
um simples `docker restart` não relê o `.env`.

### `EmailConfig` (singleton id=1, BD)

Apenas 3 campos editáveis pelo PLATFORM_ADMIN:

- `enabled: boolean` — kill-switch global. `false` ⇒ nenhum email sai.
- `fromEmail: string?` — endereço usado no `From:` (deve ser de domínio
  verificado na Brevo).
- `fromName: string?` — display name no `From:`.

Os campos legacy `host/port/secure/username/password` no `EmailConfig` ficam
**inertes** (deprecated) — todos os secrets vêm de env vars. Migração que os
remove é follow-up.

### UI de admin

| Página | Rota | Permissão |
|---|---|---|
| `EmailSettingsPage` | `/settings/email` | PLATFORM_ADMIN |
| `PlatformLimitsPage` | `/settings/limits` | PLATFORM_ADMIN |

Ambas no submenu **"Configurações > Plataforma"** do sidebar
([AppLayout.tsx](frontend/src/components/AppLayout.tsx)). O offcanvas legacy
`PlatformConfigPanel` foi eliminado.

`EmailSettingsPage` mostra um banner verde/âmbar baseado no endpoint admin
`GET /api/platform-config/email/smtp-status` (devolve `host`/`port`/`missing`)
— **só visível ao admin**, nunca a utilizadores.

## Arquitectura — `backend/src/emails/`

```
emails/
├── emails.module.ts          # @Global, importa I18nModule, exporta EmailService
├── email.service.ts          # @Injectable, OnModuleInit; pipeline + 12 sendXxxEmail
├── email.config.ts           # readSmtpEnv(), readAppUrl()
└── templates/
    ├── components/
    │   ├── EmailLayout.tsx   # wrapper visual (header + footer + Preview)
    │   ├── EmailButton.tsx   # CTA primário paleta Zynix
    │   └── SimpleEmail.tsx   # heading + paragraphs + opcional quote + opcional CTA
    ├── comment-mention.email.tsx
    ├── task-assigned.email.tsx
    ├── invitation-received.email.tsx
    ├── invitation-accepted.email.tsx
    ├── invitation-declined.email.tsx
    ├── comment-reaction.email.tsx
    ├── timesheet-submitted.email.tsx
    ├── timesheet-approved.email.tsx
    ├── timesheet-partially-approved.email.tsx
    ├── timesheet-rejected.email.tsx
    ├── email-confirmation.email.tsx   # confirmação de email no registo
    └── password-reset.email.tsx       # recuperação de password
```

`EmailsModule` é `@Global()` — qualquer service pode injectar `EmailService`
sem importar explicitamente. Importa `I18nModule` para resolver chaves do
namespace `email`.

## Templates (12) e callers

Os callers de notificações **continuam a chamar apenas o `NotificationsService`** — o
fan-out IN_APP + EMAIL acontece atrás do palco. Nenhum service de domínio
(invitations, planning, comments, timesheet) sabe do `EmailService` directamente.

**Excepção — fluxos de autenticação**: `email-confirmation.email.tsx` e
`password-reset.email.tsx` são disparados directamente pelo `AuthService` via
`EmailService.sendXxxEmail()`. Não têm `NotificationType` nem in-app notification —
são emails transacionais de segurança desacoplados do sistema de notificações.

| Tipo | Caller que dispara | Quem recebe | Template |
|---|---|---|---|
| `MENTION` | `comments.service.createComment`/`updateComment` | utilizadores mencionados | [comment-mention.email.tsx](backend/src/emails/templates/comment-mention.email.tsx) |
| `TASK_ASSIGNED` | `planning.service` (assign) | cada novo assignee com `userId` | [task-assigned.email.tsx](backend/src/emails/templates/task-assigned.email.tsx) |
| `INVITATION_RECEIVED` | `projects.service.invite` | user convidado (com `inviteUrl` se token ACCOUNT_INVITE criado) | [invitation-received.email.tsx](backend/src/emails/templates/invitation-received.email.tsx) |
| `INVITATION_ACCEPTED` | `invitations.service.accept` | convidante | [invitation-accepted.email.tsx](backend/src/emails/templates/invitation-accepted.email.tsx) |
| `INVITATION_DECLINED` | `invitations.service.decline` | convidante | [invitation-declined.email.tsx](backend/src/emails/templates/invitation-declined.email.tsx) |
| `COMMENT_REACTION` | `comments.service.toggleReaction` (add) | autor do comentário | [comment-reaction.email.tsx](backend/src/emails/templates/comment-reaction.email.tsx) |
| `TIMESHEET_SUBMITTED` | `timesheet.service.submitWeek` | cada user com `TIMESHEET_APPROVE` | [timesheet-submitted.email.tsx](backend/src/emails/templates/timesheet-submitted.email.tsx) |
| `TIMESHEET_APPROVED` | `timesheet.service.approve*` | submetente, se semana → APPROVED | [timesheet-approved.email.tsx](backend/src/emails/templates/timesheet-approved.email.tsx) |
| `TIMESHEET_PARTIALLY_APPROVED` | `timesheet.service.approve*` | submetente, se semana → PARTIAL | [timesheet-partially-approved.email.tsx](backend/src/emails/templates/timesheet-partially-approved.email.tsx) |
| `TIMESHEET_REJECTED` | `timesheet.service.rejectDay`/`rejectWeekGlobal` | submetente | [timesheet-rejected.email.tsx](backend/src/emails/templates/timesheet-rejected.email.tsx) |
| *(auth)* | `auth.service.register` | novo utilizador (PENDING) | [email-confirmation.email.tsx](backend/src/emails/templates/email-confirmation.email.tsx) |
| *(auth)* | `auth.service.forgotPassword` | utilizador ACTIVE | [password-reset.email.tsx](backend/src/emails/templates/password-reset.email.tsx) |

> **Sem CTA**: `INVITATION_DECLINED` é puramente informativo (sem botão).
> **Com `quote`**: `MENTION` (excerpt do comentário, neutral), `TIMESHEET_REJECTED`
> (motivo, danger).
> **Auth emails**: não têm `NotificationType`; não são afectados pela preferência
> `shouldNotify` do utilizador — são sempre enviados (segurança obrigatória).

## Pipeline de envio

```
caller (ex: comments.service)
        │
        ▼
NotificationsService.createXxxNotification(...)
        │
        ├─► IN_APP   shouldNotify(IN_APP)? ─► prisma.notification.create(...)
        │
        └─► EMAIL    shouldNotify(EMAIL)?  ─► resolveRecipient(userId)
                                              { email, name, locale }
                                              │
                                              ▼
                              EmailService.sendXxxEmail({...,locale})
                                              │
                                              ▼
                              loadEmailBundle(locale)
                                  fetch i18nService.getNamespace(locale, 'email')
                                  fetch i18nService.getNamespace('en', 'email')
                                  flat dot-notation, primary overrides en
                                              │
                                              ▼
                              buildCommon(bundle, vars) + interpolate
                                  resolve common.greeting/footer/copyright/...
                                  resolve <type>.subject/body_p1/cta_label/...
                                  substituir {{actorName}}, {{projectName}}, ...
                                              │
                                              ▼
                              React.createElement(<TypeEmail>, props)
                                              │
                                              ▼
                              render(element)               → HTML
                              render(element, { plainText }) → text
                                              │
                                              ▼
                              EmailConfig (id=1) loaded
                                  enabled? fromEmail? ─ não ⇒ skip
                                              │
                                              ▼
                              transporter (nodemailer, lazy singleton)
                                  smtpEnv ok? ─ não ⇒ skip + warn
                                              │
                                              ▼
                              transporter.sendMail({ from, to, subject, html, text })
                                              │
                                              ▼
                              logger.log('TYPE email sent to X [locale] (messageId=...)')
                                  ou .error em caso de falha
```

**Fire-and-forget** — todos os callers usam `.catch(() => {})` à volta de
`createXxxNotification`. O `renderAndSend` interno ao `EmailService` apanha
qualquer throw e regista no logger; nunca propaga.

## Locale-aware

### `User.locale` (BD)

Adicionado em Mai 2026 via migração `add_user_locale`:

```prisma
model User {
  // ...
  /// Locale preferido (ex.: 'pt-PT', 'en'). Tem que coincidir com um
  /// `Locale.code` activo. null ⇒ frontend usa detecção do browser.
  locale String?
}
```

Endpoint dedicado:
- `PATCH /api/users/me/locale` — JWT only, body `{ locale: string | null }`.
  DTO valida regex BCP 47 (`/^[a-z]{2}(-[A-Z]{2})?$/`); o service valida
  contra `Locale.isActive=true` (400 `LOCALE_NOT_SUPPORTED` se falhar).

### Sync BD ↔ i18next

[AppLayout.tsx](frontend/src/components/AppLayout.tsx) tem dois cenários
no `useEffect` controlado por `localeSyncAttempted` (corre 1× por sessão):

- **A) BD vazia + i18next resolveu** (de `localStorage`/`navigator`):
  PATCH para persistir. Garantia: a primeira sessão de qualquer user
  popula o `User.locale` com o que o navigator detectou.
- **B) BD ≠ i18next** (ex.: user mudou de idioma noutro device): backend
  ganha — `i18n.changeLanguage(user.locale)` força o frontend a alinhar.

[LanguageSelector](frontend/src/components/AppLayout.tsx) (header) e
[UserSettingsPage](frontend/src/pages/UserSettingsPage.tsx) (tab "Região e
Idioma") chamam ambos `PATCH /users/me/locale` quando o utilizador escolhe
manualmente — o autenticado tem BD como verdade canónica entre dispositivos.

`localStorage` continua activo (`caches: ['localStorage']` em
[i18n/index.ts](frontend/src/i18n/index.ts)) — preserva preferência para a
**futura landing page** sem login.

### Namespace `email`

Seed em
[backend/prisma/seeds/translations/email.json](backend/prisma/seeds/translations/email.json)
— 4 locales (`en`, `es`, `pt-BR`, `pt-PT`), ~37 chaves.

Estrutura:

```
common.greeting              "Olá {{recipientName}},"
common.footer_text           "Recebeste este email porque..."
common.footer_pref_link      "Gerir preferências"
common.hint_link_intro       "Se o botão não funcionar..."
common.copyright             "© {{year}} Awesome Project App"

<type>.subject               "{{actorName}} mencionou-te em {{contextName}}"
<type>.body_p1               "{{actorName}} mencionou-te num comentário..."
<type>.body_p2               (opcional, ex.: invitation_received)
<type>.quote_intro           (apenas timesheet_rejected)
<type>.cta                   "Ver comentário"
```

Placeholders interpolados: `{{recipientName}}`, `{{actorName}}`,
`{{projectName}}`, `{{taskName}}`, `{{contextName}}`, `{{weekStart}}`,
`{{scopeDate}}`, `{{emoji}}`, `{{year}}`.

### Resolução do bundle (fallback chain)

`EmailService.loadEmailBundle(locale)`:

1. Em paralelo: `getNamespace(locale, 'email')` + `getNamespace('en', 'email')`.
2. Achatamento (recurse) do nested → flat dot-notation: `{ 'common.greeting': '...', ... }`.
3. Merge: `'en'` primeiro, primary sobrepõe-se. Chaves só presentes em `'en'`
   passam directamente; chaves em ambos vencem o primary.
4. **Fallback final por chave**: se a chave não está nem no primary nem no
   `'en'`, `t(bundle, key)` devolve string vazia (defensivo, evita "undefined"
   no email visível).

`User.locale = null` ⇒ usa só `'en'`. `User.locale = 'pt-BR'` mas chave em
falta nesse locale ⇒ cai em `'en'` para essa chave.

### Brand não traduz

`"Awesome Project App"` é nome próprio — hardcoded no
[EmailLayout.tsx](backend/src/emails/templates/components/EmailLayout.tsx).
Não vai à BD nem é traduzido.

### Logs

```
[EmailService] MENTION email sent to user@example.com [pt-PT] (messageId=<...>)
[EmailService] TIMESHEET_APPROVED send failed: Connection refused
```

O `[locale]` indica qual locale foi resolvido — útil para debug.

## Disponibilidade do canal — UI gating

Quando o admin desliga `EmailConfig.enabled` **OU** as env vars SMTP estão em
falta, a UI da `NotificationPreferencesPage` desactiva a coluna EMAIL para
**todos** os tipos. Mensagem genérica única, sem expor o motivo técnico.

Endpoint:

```
GET /api/platform-config/email/availability    (JWT, sem assertAdmin)
→ { available: boolean }
```

> **Não expõe `reason`, `host`, `port`, nem qualquer outro detalhe técnico.**
> Princípio: utilizador final nunca vê motivos internos. Para o admin, há
> `GET /platform-config/email/smtp-status` (PLATFORM_ADMIN) que devolve
> `{ ready, host, port, missing }`.

[NotificationPreferencesPage.tsx](frontend/src/pages/NotificationPreferencesPage.tsx)
quando `available=false`:

- **Banner** `alert-warning-transparent` com texto i18n
  `notifications:email_unavailable.message` + `mailto:support@awesomeproject.app`.
- **Header da coluna EMAIL** ganha badge "Indisponível"
  (`notifications:table.email_unavailable`).
- **Toggles EMAIL** disabled para os 10 tipos.
- **Defesa em profundidade**: `handleToggle` faz early return se
  `channel === 'EMAIL' && !emailAvailable`.

**Estado preservado**: `PUT /notifications/preferences/:type/EMAIL` continua
sem gate server-side. Preferências `EMAIL=true` gravadas antes do canal ser
desligado ficam intocadas — quando o canal voltar a estar disponível, voltam
a disparar emails sem o user ter de re-clicar.

## Rate limit dos endpoints i18n públicos

`GET /api/i18n/:locale/:namespace` e `GET /api/i18n/locales/active` têm
`@SkipThrottle()` + `@Header('Cache-Control', 'public, max-age=60')` em
[i18n.controller.ts](backend/src/i18n/i18n.controller.ts).

Sem isto, um F5 dispara ~17 requests em paralelo (um por namespace registado
em [frontend/src/i18n/index.ts](frontend/src/i18n/index.ts)) e em poucos F5
saturava o limit global de 300 reqs/60s do `ThrottlerModule`. Os endpoints
admin do mesmo controller (locales CRUD, backoffice) **mantêm** o throttle
como anti-abuse.

## Adicionar um novo tipo de email — checklist

1. **Schema**: adicionar valor ao `NotificationType` enum em `schema.prisma` + migração.
2. **Backend — `NotificationsService.createXxxNotification`**: criar método
   que faz fan-out IN_APP + EMAIL (espelhar `createMentionNotification`).
   Adicionar resolvers (`resolveContextName`, `buildXxxUrl`) se preciso.
3. **Backend — `EmailService.sendXxxEmail`**: novo método que:
   - Carrega `loadEmailBundle(locale)`.
   - Constrói `vars` com os placeholders relevantes.
   - Chama `t(bundle, '<type>.subject', vars)`, `body_p1`, `cta`.
   - `buildCommon(bundle, vars)`.
   - `React.createElement(<TypeEmail>, props)` + `renderAndSend`.
4. **Template**: criar `templates/<type>.email.tsx` que usa `SimpleEmail` (ou
   render custom se precisar de quote/secção especial). Recebe props
   `{ common, preview, body_p1, body_p2?, cta_label, ...urls/dados, appUrl }`.
5. **i18n**: adicionar chaves ao
   [email.json](backend/prisma/seeds/translations/email.json) nos 4 locales
   (`<type>.subject`, `<type>.body_p1`, `<type>.cta`, ...). Correr
   `docker exec awesome-project-app-backend npm run seed`.
6. **Frontend — `NOTIFICATION_TYPES`**: adicionar à lista em
   [features/notifications/types.ts](frontend/src/features/notifications/types.ts);
   chaves `type.<TYPE>` e `desc.<TYPE>` ao
   [notifications.json](backend/prisma/seeds/translations/notifications.json).
7. **Caller**: no service de domínio relevante, chamar
   `notificationsService.createXxxNotification(...)` fire-and-forget.
8. **AppLayout dropdown**: se a notificação tem navegação (campo `entityPublicId`
   ou `projectPublicId`), mapear em `handleNotifClick` em
   [AppLayout.tsx](frontend/src/components/AppLayout.tsx).

## Fluxos de autenticação por email

Três fluxos de segurança disparados directamente pelo `AuthService`. Não passam
pelo `NotificationsService` nem criam in-app notifications — são emails transacionais
obrigatórios de segurança.

### 1 — Confirmação de email no registo

**Trigger**: `AuthService.register()` quando o utilizador se regista via `/auth/register`
com um email não existente (sem `selfRegistered=false` já existente).

**Condições de envio**:
- Utilizador criado com `status: PENDING`, `emailVerified: false`
- Token `EMAIL_CONFIRMATION` (24h) criado via `EmailTokenService.createToken()`
- Email disparado fire-and-forget (`.catch(() => {})`)
- Rate limit por email: máx 3 tokens `EMAIL_CONFIRMATION` em 3600s; verificado
  também no endpoint `POST /auth/resend-confirmation`

**Template**: [email-confirmation.email.tsx](backend/src/emails/templates/email-confirmation.email.tsx)
- Props: `{ common, preview, body_p1, cta_label, confirmUrl, appUrl }`
- URL: `${APP_URL}/confirm-email?token=${token}`

**Chaves i18n** (namespace `email`):
```
confirmation.subject   "Confirma o teu email — Awesome Project App"
confirmation.body_p1   "Clica no botão abaixo para confirmar o teu endereço de email..."
confirmation.cta       "Confirmar email"
```

**Método no EmailService**: `sendEmailConfirmationEmail({ toEmail, toName, locale, confirmUrl })`

**Após confirmação** (`POST /auth/confirm-email`):
- Utilizador actualizado: `status: ACTIVE`, `emailVerified: true`
- Token consumido: `used: true`
- Frontend redireccionado para `/login?confirmed=true` (toast de sucesso)

**Resend** (`POST /auth/resend-confirmation`):
- Resposta sempre neutra (nunca revela se email existe)
- Se utilizador `PENDING` existe: cria novo token, envia email
- Se não existe ou `ACTIVE`: silencioso

---

### 2 — Convite para projecto (fix do bug + token de conta)

**Bug original**: `ProjectsService.inviteMember()` criava o `ProjectMember` mas
**nunca enviava email** — os convidados nunca recebiam notificação.

**Fix implementado** (Mai 2026): após criar `ProjectMember`, `inviteMember()` agora:
1. Cria um token `ACCOUNT_INVITE` (72h) via `EmailTokenService.createToken()`
2. Constrói `inviteUrl = ${APP_URL}/create-account?token=${token}`
3. Passa `inviteUrl` ao fan-out de notificação

**Distinção por tipo de utilizador**:
- **Utilizador existente** (`user.status !== null`): fan-out via
  `notificationsService.createInvitationReceivedNotification(...)` com `inviteUrl`
  opcional — o convidado recebe email + in-app notification
- **Novo utilizador** (email sem conta): `emailService.sendInvitationReceivedEmail(...)`
  directo — sem in-app notification (utilizador ainda não tem conta)

**Fluxo do convidado sem conta**:
1. Acede a `/create-account?token=xxx`
2. Frontend chama `GET /auth/invite-check?token=xxx`
   - Token inválido/expirado → redirect `/error/token-expired`
   - `{ requiresAccount: false }` (conta já existe) → redirect `/login`
   - `{ requiresAccount: true }` → mostrar formulário de criação de conta
3. Formulário: nome + password + confirmar password
4. Submit: `POST /auth/create-account-from-invite` com `{ token, name, password }`
5. Backend: cria conta `ACTIVE + emailVerified: true`, liga `ProjectMember`,
   emite sessão (auto-login)
6. Frontend: `login(toAuthUser(data.user))` + redirect `/dashboard`

**Segurança** (OWASP):
- `GET /auth/invite-check` NÃO devolve email nem detalhes do projecto
- Apenas `{ requiresAccount: boolean }`

---

### 3 — Recuperação de password

**Trigger**: `AuthService.forgotPassword()` quando utilizador submete o formulário
em `/forgot-password`.

**Condições de envio**:
- Resposta HTTP sempre `200` e neutra (nunca revela se email existe — OWASP)
- Rate limit por email: máx 3 tokens `PASSWORD_RESET` em 900s (15min)
- Se utilizador `ACTIVE` existe: revoga tokens `PASSWORD_RESET` anteriores,
  cria novo token (15min), envia email
- Se não existe, `PENDING`, ou `INACTIVE`: silencioso (sem email, sem erro)

**Template**: [password-reset.email.tsx](backend/src/emails/templates/password-reset.email.tsx)
- Props: `{ common, preview, body_p1, cta_label, resetUrl, appUrl }`
- URL: `${APP_URL}/reset-password?token=${token}`

**Chaves i18n** (namespace `email`):
```
password_reset.subject   "Repõe a tua password — Awesome Project App"
password_reset.body_p1   "Clica no botão abaixo para redefinir a tua password. O link expira em 15 minutos."
password_reset.cta       "Redefinir password"
```

**Método no EmailService**: `sendPasswordResetEmail({ toEmail, toName, locale, resetUrl })`

**Após reset** (`POST /auth/reset-password`):
- Password actualizada (bcrypt 10 rounds)
- **Todas as sessões ativas revogadas** via `SessionsService.revokeAllForUser(userId, 'PASSWORD_RESET')`
- Cookies de auth limpos na response
- Token consumido: `used: true`
- Frontend redireccionado para `/login?reset=true` (toast de sucesso)

**Segurança**:
- Token inválido/expirado/usado: erro genérico `400` (não revela causa)
- `TOKEN_ALREADY_USED` → frontend redirect `/error/token-used`
- Outros erros → frontend redirect `/error/token-expired`

---

### EmailTokenService

[`backend/src/auth/email-token.service.ts`](backend/src/auth/email-token.service.ts)

Service auxiliar que gere todos os tokens de email. Exportado por `AuthModule`
(injectável em `ProjectsModule` e qualquer outro que importe `AuthModule`).

```typescript
interface CreateTokenOptions {
  userId?: number;   // null para ACCOUNT_INVITE de novos utilizadores
  email?: string;    // email alvo quando userId é null
  expiresInMs: number;
}

// Gera token: crypto.randomBytes(32).toString('hex') (64 chars hex)
createToken(type: TokenType, opts: CreateTokenOptions): Promise<string>

// Valida e retorna token — lança AppException genérica se inválido/expirado/usado
validateToken(token: string, type: TokenType): Promise<EmailToken>

// Marca token como usado (after use, chamado na mesma transação)
consumeToken(id: number): Promise<void>

// Invalida tokens anteriores do mesmo tipo (para PASSWORD_RESET)
revokeExistingTokensForUser(userId: number, type: TokenType): Promise<void>

// Rate limit: conta tokens do tipo criados para email nos últimos windowMs
checkEmailRateLimit(email: string, type: TokenType, maxCount: number, windowMs: number): Promise<void>
```

**`TokenType` enum**:
```prisma
enum TokenType {
  EMAIL_CONFIRMATION
  PASSWORD_RESET
  ACCOUNT_INVITE
}
```

**`EmailToken` model** (em `schema.prisma`):
```prisma
model EmailToken {
  id        Int       @id @default(autoincrement())
  publicId  String    @unique @default(uuid(7))
  token     String    @unique            // 64 chars hex (crypto.randomBytes(32))
  type      TokenType
  userId    Int?                         // null para ACCOUNT_INVITE sem conta
  user      User?     @relation(...)
  email     String?                      // email alvo quando userId é null
  expiresAt DateTime
  used      Boolean   @default(false)
  createdAt DateTime  @default(now())

  @@index([userId, type])
  @@index([email, type])
}
```

**Erro genérico de token**: `AuthService` lança sempre `AppException('INVALID_OR_EXPIRED_TOKEN', 400)`
para tokens inválidos, expirados ou já usados — nunca revela qual o motivo exacto.
O frontend mapeia: `TOKEN_ALREADY_USED` → `/error/token-used`, resto → `/error/token-expired`.

## Anti-padrões

- ❌ `await emailService.sendXxxEmail(...)` no caller — bloqueia a transacção
  principal se o SMTP estiver lento. Sempre fire-and-forget com `.catch()`.
- ❌ Throw no `EmailService` quando o transporter não está pronto — o caller
  é fire-and-forget. Devolver early com log.
- ❌ Hardcodar SMTP credentials no código — env vars only, nunca commit.
- ❌ Devolver `reason: 'disabled' | 'smtp_missing'` no endpoint
  `/availability` — expõe info técnica desnecessariamente. Devolver só `{ available }`.
- ❌ Mensagens distintas na UI conforme o motivo técnico — utilizador final
  não precisa nem deve saber se é admin que desligou ou SMTP em falta.
- ❌ Server-side gate no `PUT /notifications/preferences/:type/EMAIL` —
  apaga escolhas dos users quando admin desliga e reactiva.
- ❌ Strings literais nos templates JSX — todas as strings vêm de `props`
  (já em locale + interpoladas pelo `EmailService`). Excepção: brand name.
- ❌ JSX dentro de strings i18n (ex.: `"<strong>{{name}}</strong>..."`) —
  `dangerouslySetInnerHTML` é frágil em emails. Strings flat com placeholders.
- ❌ Cachear o resultado de `/availability` no browser — estado tem de ser
  fresco; muda por toggle do admin.
- ❌ `@SkipThrottle()` global no `I18nController` — apenas nos GETs públicos
  (`getNamespace`, `getActiveLocales`). Endpoints admin/backoffice mantêm
  throttle como anti-abuse.
- ❌ Esquecer `i18nService` injection ou import do `I18nModule` no
  `EmailsModule` — quebra DI no boot do NestJS.
- ❌ Mudar `EmailConfig` para guardar API key/SMTP password — secrets ficam
  em env vars; BD só tem metadados editáveis (`enabled`, `fromEmail`, `fromName`).

# Relacionados: @docs/claude/notifications.md @docs/claude/i18n.md @docs/claude/auth.md @docs/claude/backend.md @docs/claude/db.md
