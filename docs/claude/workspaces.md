# Claude: carregar para tarefas que envolvam Workspace

## O que é

`Workspace` é a entidade explícita que agrupa tudo o que pertence a um owner —
projectos, equipas, feriados, tipos de utilizador, billing/subscription, quotas
e membros convidados. Introduzido em Maio 2026.

**V1** (estado actual): cada utilizador tem **exactamente 1 workspace**, criado
automaticamente nos hooks de criação de User. Sem CRUD: o user não pode criar
mais nem eliminar o existente. Constraint `@@unique([ownerId])` impede mais.

**V2** (futuro): drop unique → utilizadores podem ter múltiplos workspaces.
Schema já está preparado (toda a infraestrutura é workspace-scoped).

## Filosofia de URLs (estilo Asana)

Separação entre URLs do browser e da API:

| Camada | V1 |
|---|---|
| **Browser URL** (o que o user vê) | `/projects/:id/planning` (sem workspace ainda) |
| **API URL** | `/api/v1/projects/:id/...` |

Workspace context na API actualmente resolve-se via **JWT do user autenticado**
(default workspace 1:1). Frontend envia `X-Workspace-Id` header como
future-proofing — o backend ainda não enforça em V1, mas a infra está pronta
para activar em V2 (multi-workspace).

> A versão futura do browser URL será `/<workspacePublicId>/projects/:id/...`
> (estilo Asana). Em V1 isto é deliberadamente adiado — adicionar workspace ao
> URL não traz valor enquanto o user só tem um.

## Modelo Prisma

```prisma
model Workspace {
  id        Int      @id @default(autoincrement())
  publicId  String   @unique @default(uuid(7))
  ownerId   Int      @unique  // V1 only: drop em V2
  owner     User     @relation("UserWorkspaces", ..., onDelete: Cascade)
  name      String
  status    Status   @default(ACTIVE)
  createdAt DateTime @default(now()) @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @db.Timestamptz(6)

  // Back-relations a 9 tabelas
  projects     Project[]
  teams        Team[]
  holidays     Holiday[]
  userTypes    UserType[]
  members      WorkspaceMember[]
  subscription Subscription?     // 1:1 — workspace = unidade de billing
  invoices     Invoice[]
  usageRecords UsageRecord[]
  featureFlags UserFeatureFlag[]
}
```

## Tabelas com `workspaceId`

| Tabela | Nullable? | onDelete | Notas |
|---|:---:|:---:|---|
| `Project` | ✓ | Cascade | Mantém `ownerId` (audit; SetNull). Nullable tolera orphans pré-migração. |
| `Team` | ✓ | Cascade | idem |
| `Holiday` | ✓ | Cascade | Nullable também para `scope=GLOBAL/REGIONAL` (PLATFORM_ADMIN seed). |
| `UserType` | ✓ | Cascade | Nullable para tipos de plataforma (`ownerId=null` no seed). `@@unique([code, workspaceId])`. |
| `WorkspaceMember` | ✗ | Cascade | Renomeado de `ownerId`. `@@unique([workspaceId, email])`. |
| `Subscription` | ✗ | Cascade | 1:1 com Workspace via `@unique`. |
| `Invoice` | ✗ | Cascade | |
| `UsageRecord` | ✗ | Cascade | `@@unique([workspaceId, usageKey])`. Contadores per-workspace. |
| `UserFeatureFlag` | ✗ | Cascade | Nome legado preservado. `@@unique([workspaceId, featureFlagId])`. |

**`Project.ownerId` / `Team.ownerId` / `Holiday.ownerId` / `UserType.ownerId`**
**preservados como audit fields** (nullable, SetNull on User delete). Em V1 o
valor coincide com `Workspace.ownerId`; em V2 podem divergir (delegated
ownership dentro do workspace).

## Auto-criação nos 4 hooks de User creation

```typescript
const user = await prisma.user.create({
  data: {
    email, name, passwordHash,
    workspaces: { create: { name: `${name}'s Workspace` } },
  },
});
await createDefaultBilling(prisma, user.id); // cria Subscription no workspace
```

Aplicado em:
- `backend/src/auth/auth.service.ts:138` — `register()` (PENDING user)
- `backend/src/auth/auth.service.ts:380` — `createAccountFromInvite()`
- `backend/src/users/users.service.ts:203` — admin POST /users
- `backend/prisma/seed.js:219` — seed admin

## Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| GET | `/api/v1/workspaces/me` | JWT | Devolve workspace default do user (`{ publicId, name, status, createdAt }`) |

Sem CRUD adicional em V1. Outros endpoints (resolver via header em V2) ficam
para quando multi-workspace ship.

## Hard delete cascade

`User.delete` (PLATFORM_ADMIN via `removeHard`) cascades:

```
User
  └─ Workspace (Cascade via Workspace.ownerId)
       ├─ Project (Cascade) → tasks, links, comments, files (todos via FK próprias)
       ├─ Team (Cascade) → TeamMembers
       ├─ Holiday (Cascade)
       ├─ UserType (Cascade)
       ├─ WorkspaceMember (Cascade)
       ├─ Subscription (Cascade) → Invoices
       ├─ UsageRecord (Cascade)
       └─ UserFeatureFlag (Cascade)
```

Ver `docs/claude/db.md` secção "User cascade rule" para política completa.

## Runtime — `WorkspacesService`

`backend/src/workspaces/workspaces.service.ts`:

- `getDefaultForUser(userId): Promise<Workspace>` — V1: o único workspace.
- `findByPublicId(publicId): Promise<Workspace | null>`
- `assertAccess(workspaceId, userId)` — owner OR `WorkspaceMember(ACCEPTED)`.

Módulo é `@Global()` — qualquer service pode injectar `WorkspacesService`.

## `SubscriptionsService.resolveEffectiveWorkspaceId`

Chave da resolução context-aware. Determina **qual workspace** define
features/limits para um requesting user num dado contexto:

- Sem `projectPublicId` → workspace default do user.
- Com `projectPublicId` E user é LICENSED member do workspace do projecto →
  o workspace do projecto (LICENSED seats herdam plano do owner).
- Caso contrário → workspace default do user.

Usado por:
- `UsageService.checkLimit` (`@CheckPlanLimit` decorator)
- `UsageService.countReal` (todos os contadores per-workspace)
- `FeatureFlagsService.isEnabled` (resolução de plano)
- `SubscriptionsService.resolvePlanIdForContext`

Mantém-se também `resolveEffectiveOwnerId` como compat alias — devolve
`workspace.ownerId` em vez de `workspace.id`.

## V1 → V2 — caminho de upgrade

Quando V2 (multi-workspace) for shippado:

1. **Schema**: `ALTER TABLE Workspace DROP CONSTRAINT Workspace_ownerId_key;`
   (drop unique constraint sobre `ownerId`).
2. **WorkspaceContextGuard**: ativar como `APP_GUARD` global. Requer também
   promover `JwtAuthGuard` a global + adicionar `@Public()` decorator nas
   rotas abertas.
3. **Browser URLs**: introduzir `/<workspacePublicId>/...` no React Router.
4. **CRUD UI**: `/workspaces/new`, sidebar workspace switcher, etc.
5. **`getDefaultForUser`** evolui para `findManyForUser` ou aceita um
   `defaultWorkspaceId` no User para retrocompatibilidade.

A infraestrutura V1 não bloqueia nenhuma destas evoluções — o
`WorkspaceContextGuard` já está scaffolded em
`backend/src/workspaces/guards/workspace-context.guard.ts` pronto a activar.

## Frontend — V1 minimal

- `AuthUser.workspacePublicId` populado pela resposta de login (`/auth/login`)
  e `/auth/me` (transposto em `UsersService.attachAvatarUrl` a partir de
  `user.workspaces[0].publicId`).
- `apiFetch` injecta header `X-Workspace-Id` lendo do localStorage
  (`app_user.workspacePublicId`). Em V1 o backend ignora — no-op informativo.
- Sem `WorkspaceProvider` ou `useApiFetch` hook em V1 — adia para V2 quando
  for preciso seleccionar workspace activo.

## Anti-padrões

- ❌ Criar `Workspace` em código que não seja um dos 4 hooks de criação de User
  — em V1, 1 workspace por user é invariant absoluto.
- ❌ Eliminar `Workspace` directamente — só via cascade do `User.delete`.
- ❌ Filtrar por `Project.ownerId` em vez de `Project.workspaceId` em queries
  novas — `ownerId` é audit, `workspaceId` é o scope correcto. Excepção:
  queries que precisam saber **quem criou** vs **onde está**.
- ❌ Cobrar plan limit no `userId` do uploader em vez do workspace — usar
  sempre `usage.checkLimit(userId, key, ctx)` que resolve via
  `resolveEffectiveWorkspaceId`.
- ❌ Activar `WorkspaceContextGuard` como `APP_GUARD` em V1 — exige promover
  `JwtAuthGuard` a global, refactor de auth fora de scope. Guard fica em
  `backend/src/workspaces/guards/` como scaffolding para V2.
- ❌ Mudar browser URLs para `/:workspacePublicId/...` em V1 — sem CRUD nem
  switcher, é noise visual sem benefício. Adiar para V2.
- ❌ Hardcodar `Path=/api/auth/refresh` em cookies (legado pré-`/api/v1`).
  Cookies de auth devem usar `Path=/api/v1/auth/refresh` (corrigido em
  `backend/src/auth/cookies.util.ts`).
- ❌ Eliminar `ownerId` em `Project/Team/Holiday/UserType` durante a migração
  — preservados como audit field V2-ready.

# Relacionados: @docs/claude/db.md @docs/claude/auth.md @docs/claude/permissions.md @docs/claude/backend.md @docs/claude/frontend.md
