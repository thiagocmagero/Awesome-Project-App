# Claude: carregar para tarefas de autenticação, autorização e perfis

## JWT

- Payload: `{ sub, email, profileCode }` — `sub` é o `id` numérico interno. Nunca incluir `role` nem `publicId`.
- `JWT_EXPIRES_IN=1d` — plano **não** está no JWT (lookup na BD a cada verificação de limite/feature).

## Guards e decorators (Backend)

```typescript
// Autenticação
@UseGuards(JwtAuthGuard)

// Autorização por perfil
@UseGuards(JwtAuthGuard, ProfilesGuard)
@RequireProfiles('PLATFORM_ADMIN')

// Limites de plano
@UseGuards(JwtAuthGuard, PlanLimitGuard)
@CheckPlanLimit('max_projects')

// Feature flags
@UseGuards(JwtAuthGuard, FeatureFlagGuard)
@RequireFeature('gantt_view')
```

**PLATFORM_ADMIN bypassa PlanLimitGuard e FeatureFlagGuard sempre.**

## Perfis de acesso (seed inicial)

| Código | Label | Acesso |
|--------|-------|--------|
| `PLATFORM_ADMIN` | Super Administrador | Acesso total — único que acede ao painel |
| `PROJECT_MANAGER` | Gestor de Projeto | Reservado para uso futuro |
| `STAKEHOLDER` | Stakeholder | Perfil padrão de auto-registo |

> O login no painel está restrito a `PLATFORM_ADMIN`. Outros perfis recebem erro.

## Frontend — ProtectedRoute

```typescript
// components/ProtectedRoute.tsx
// Redireciona se !token ou user.profileCode !== 'PLATFORM_ADMIN'
```

## Feature Flags — resolução

Ordem: `enabledGlobally` → `UserFeatureFlag` → `PlanFeatureFlag` → `false`

Flags activas:
- `gantt_view` — controla acesso ao Gantt (UI + endpoint backend)
- `multi_holiday` — controla criação de listas de feriados

## Planos — regras

- `PlanStatus`: `ACTIVE` | `DISCONTINUED` (enum separado de `Status`).
- `DISCONTINUED` permite uso por users existentes mas bloqueia novas atribuições.
- Todo novo utilizador recebe o plano com `isDefault: true` automaticamente.
- Apenas 1 plano activo por utilizador (`UserPlan.isActive`).
- Valor `-1` em `PlanLimit` = ilimitado.
- `LIMIT_KEYS` em `PlansPage.tsx`: `max_projects`, `max_teams`, `max_members`, `max_tasks`, `max_holidays`, `max_storage_mb`, `max_api_calls`. Actualizar ao adicionar novo limitKey.

## selfRegistered — campo User

- `false` (default) = criado por admin/convidante — ainda não fez registo próprio.
- `true` = registou-se via `/auth/register`.
- Retrocompatibilidade: utilizadores antes da migração ficam com `selfRegistered = true`.
- Registo com email existente + `selfRegistered=false`: complementa o registo (não lança conflito).
- Registo com email existente + `selfRegistered=true`: lança 409 (email em uso).
- Convidante (`createdById`) só pode editar enquanto `selfRegistered=false`.

## Status.PENDING e emailVerified (Mai 2026)

Adicionados via migração `add_email_token_and_pending_status`.

### Status.PENDING

```prisma
enum Status {
  ACTIVE
  INACTIVE
  ARCHIVED
  PENDING   // registo pendente de confirmação de email
}
```

- Utilizadores criados via `POST /auth/register` (auto-registo normal) recebem
  `status: PENDING` e não podem fazer login até confirmarem o email.
- Login com conta `PENDING` → `403 EMAIL_NOT_CONFIRMED`.
- Utilizadores criados via convite (`POST /auth/create-account-from-invite`) recebem
  `status: ACTIVE` directamente (email implicitamente verificado pelo token de convite).
- `PLATFORM_ADMIN` e utilizadores criados pelo seed recebem sempre `ACTIVE`.
- Utilizadores existentes antes desta migração mantêm `ACTIVE` com `emailVerified: true`.

### emailVerified

```prisma
model User {
  // ...
  emailVerified Boolean @default(false)
}
```

Campo de auditoria independente do `status`. Persiste `true` mesmo que o utilizador
seja desactivado ou arquivado posteriormente. Preenchido `true` em:
- Confirmação de email via token (`POST /auth/confirm-email`)
- Criação de conta via convite (`POST /auth/create-account-from-invite`)
- Utilizadores existentes antes da migração (SET via SQL na migração)

### Casos especiais do registo

| Caso | Comportamento |
|---|---|
| Novo email (nunca visto) | Cria `PENDING + emailVerified: false`, envia confirmação |
| Email existente `PENDING` + token válido | `409 CONFIRMATION_EMAIL_ALREADY_SENT` |
| Email existente `PENDING` + token expirado | Elimina conta PENDING + token antigos, prossegue como novo registo |
| Email existente `ACTIVE + selfRegistered: true` | `409 EMAIL_ALREADY_EXISTS` |
| Email existente `ACTIVE + selfRegistered: false` (convidado) | Complementa registo (activa selfRegistered), sem PENDING |

## EmailTokenService

[`backend/src/auth/email-token.service.ts`](backend/src/auth/email-token.service.ts)
Exportado por `AuthModule`. Injectável em qualquer módulo que importe `AuthModule`.

Gere os três tipos de tokens de email de segurança:

```prisma
enum TokenType {
  EMAIL_CONFIRMATION  // 24h — registo de utilizador
  PASSWORD_RESET      // 15min — recuperação de password
  ACCOUNT_INVITE      // 72h — convite para projecto
}

model EmailToken {
  id        Int       @id @default(autoincrement())
  publicId  String    @unique @default(uuid(7))
  token     String    @unique           // crypto.randomBytes(32).toString('hex') = 64 chars
  type      TokenType
  userId    Int?                        // null para ACCOUNT_INVITE sem conta
  user      User?     @relation(...)
  email     String?                     // email alvo quando userId é null
  expiresAt DateTime
  used      Boolean   @default(false)
  createdAt DateTime  @default(now())

  @@index([userId, type])
  @@index([email, type])
}
```

**Métodos principais**:
- `createToken(type, { userId?, email?, expiresInMs })` → gera e persiste token, retorna string
- `validateToken(token, type)` → retorna `EmailToken` ou lança `AppException` genérica
- `consumeToken(id)` → `update { used: true }`
- `revokeExistingTokensForUser(userId, type)` → invalida tokens anteriores (usado antes de criar PASSWORD_RESET)
- `checkEmailRateLimit(email, type, maxCount, windowMs)` → lança `TOO_MANY_REQUESTS` se excedido

**Erro de token**: sempre genérico — `AppException('INVALID_OR_EXPIRED_TOKEN', 400)`.
Nunca revela se o token expirou, foi usado, ou não existe (OWASP).

## Novos endpoints de autenticação (Mai 2026)

Todos sem `JwtAuthGuard` (públicos). Todos com `@SkipCsrf()`.

| Método | Rota | Rate limit | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/confirm-email` | — | Confirmar email com token; activa conta PENDING |
| `POST` | `/api/auth/resend-confirmation` | 5/10min por IP | Reenviar email de confirmação; resposta sempre neutra |
| `POST` | `/api/auth/forgot-password` | 5/10min por IP | Solicitar reset; resposta sempre neutra |
| `POST` | `/api/auth/reset-password` | — | Redefinir password; revoga todas as sessões |
| `GET` | `/api/auth/invite-check` | — | Verificar token de convite; retorna só `{ requiresAccount }` |
| `POST` | `/api/auth/create-account-from-invite` | 10/10min por IP | Criar conta via convite; emite sessão (auto-login) |

**Segurança OWASP**:
- `forgotPassword` e `resendConfirmation` retornam sempre `200` com mensagem neutra.
  Nunca revelam se o email existe na BD.
- `inviteCheck` retorna apenas `{ requiresAccount: boolean }`. Nunca retorna email,
  nome, detalhes do projecto, nem qualquer info sobre o token.
- `TOKEN_ALREADY_USED`: retorna `400` com `message: 'TOKEN_ALREADY_USED'`
  (distinguível pelo frontend para redirect correcto, mas não revela mais info).

**Auto-login pós-convite**: `POST /auth/create-account-from-invite` emite sessão
completa na resposta (mesmo formato de login) — `{ user, accessToken, refreshToken }`.
Frontend chama `login(toAuthUser(data.user))` antes do redirect para `/dashboard`.

## Convites (ProjectMember)

- Estados: `INVITED` → `ACCEPTED` | `DECLINED`.
- Reenviar convite recusado: volta o estado para `INVITED` + cria novo `ACCOUNT_INVITE` token (72h).
- Apenas `project.ownerId` (ou `PLATFORM_ADMIN`) pode convidar/gerir membros.
- `@@unique([projectId, email])` — mesmo email não pode ser convidado 2× para o mesmo projeto.
- Ao criar conta via convite: `ProjectMember.userId` é preenchido no `createAccountFromInvite`.
- Ao fazer login: `AppLayout` mostra `Swal.fire` por cada convite pendente (sequencial, bloqueante).
- Dependência frontend: `sweetalert2` (npm).

**Fix do bug de email (Mai 2026)**: `ProjectsService.inviteMember()` agora cria um
token `ACCOUNT_INVITE` e envia email via `emailService.sendInvitationReceivedEmail()`.
O email inclui `inviteUrl = ${APP_URL}/create-account?token=${token}`. Antes desta
correcção, os emails de convite nunca eram enviados.

## Páginas de erro de token (frontend)

Criadas em `frontend/src/errors/` para lidar com links de email inválidos/usados:

| Rota | Componente | Mensagem |
|---|---|---|
| `/error/token-expired` | `TokenExpiredPage` | Link expirado ou inválido — pede novo |
| `/error/token-used` | `TokenUsedPage` | Link já utilizado — pede novo se necessário |

Ambas usam `ErrorLayout` com partículas + card centrado + logo (visual
consistente com LoginPage). Mensagens genéricas — nunca revelam causa técnica.

## Anti-padrões

- ❌ Incluir `role` ou `publicId` no JWT payload
- ❌ Verificar roles sem usar `ProfilesGuard` + `@RequireProfiles`
- ❌ Expor `id` numérico em respostas da API
- ❌ Criar utilizador `ACTIVE` directamente em `register()` — deve ser `PENDING`
  (excepção: utilizadores `selfRegistered=false` pré-existentes)
- ❌ Revelar em `forgotPassword`/`resendConfirmation` se o email existe na BD
- ❌ Devolver detalhes do projecto ou email em `invite-check` — só `{ requiresAccount }`
- ❌ Distinguir "token expirado" de "token não encontrado" nas respostas de erro —
  sempre genérico `INVALID_OR_EXPIRED_TOKEN`
- ❌ Criar `PASSWORD_RESET` sem revogar tokens anteriores do mesmo utilizador

# Relacionados: @docs/claude/db.md @docs/claude/backend.md @docs/claude/email.md
