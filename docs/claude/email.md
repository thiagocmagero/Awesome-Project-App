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
├── email.service.ts          # @Injectable, OnModuleInit; pipeline + 10 sendXxxEmail
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
    └── timesheet-rejected.email.tsx
```

`EmailsModule` é `@Global()` — qualquer service pode injectar `EmailService`
sem importar explicitamente. Importa `I18nModule` para resolver chaves do
namespace `email`.

## Templates (10) e callers

Os callers **continuam a chamar apenas o `NotificationsService`** — o
fan-out IN_APP + EMAIL acontece atrás do palco. Nenhum service de domínio
(invitations, planning, comments, timesheet) sabe do `EmailService` directamente.

| Tipo | Caller que dispara | Quem recebe | Template |
|---|---|---|---|
| `MENTION` | `comments.service.createComment`/`updateComment` | utilizadores mencionados | [comment-mention.email.tsx](backend/src/emails/templates/comment-mention.email.tsx) |
| `TASK_ASSIGNED` | `planning.service` (assign) | cada novo assignee com `userId` | [task-assigned.email.tsx](backend/src/emails/templates/task-assigned.email.tsx) |
| `INVITATION_RECEIVED` | `projects.service.invite` | user convidado | [invitation-received.email.tsx](backend/src/emails/templates/invitation-received.email.tsx) |
| `INVITATION_ACCEPTED` | `invitations.service.accept` | convidante | [invitation-accepted.email.tsx](backend/src/emails/templates/invitation-accepted.email.tsx) |
| `INVITATION_DECLINED` | `invitations.service.decline` | convidante | [invitation-declined.email.tsx](backend/src/emails/templates/invitation-declined.email.tsx) |
| `COMMENT_REACTION` | `comments.service.toggleReaction` (add) | autor do comentário | [comment-reaction.email.tsx](backend/src/emails/templates/comment-reaction.email.tsx) |
| `TIMESHEET_SUBMITTED` | `timesheet.service.submitWeek` | cada user com `TIMESHEET_APPROVE` | [timesheet-submitted.email.tsx](backend/src/emails/templates/timesheet-submitted.email.tsx) |
| `TIMESHEET_APPROVED` | `timesheet.service.approve*` | submetente, se semana → APPROVED | [timesheet-approved.email.tsx](backend/src/emails/templates/timesheet-approved.email.tsx) |
| `TIMESHEET_PARTIALLY_APPROVED` | `timesheet.service.approve*` | submetente, se semana → PARTIAL | [timesheet-partially-approved.email.tsx](backend/src/emails/templates/timesheet-partially-approved.email.tsx) |
| `TIMESHEET_REJECTED` | `timesheet.service.rejectDay`/`rejectWeekGlobal` | submetente | [timesheet-rejected.email.tsx](backend/src/emails/templates/timesheet-rejected.email.tsx) |

> **Sem CTA**: `INVITATION_DECLINED` é puramente informativo (sem botão).
> **Com `quote`**: `MENTION` (excerpt do comentário, neutral), `TIMESHEET_REJECTED`
> (motivo, danger).

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
