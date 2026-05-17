# Claude: carregar para tarefas que envolvam Workspace

## O que é

`Workspace` é a entidade explícita que agrupa tudo o que pertence a um owner —
projectos, equipas, feriados, tipos de utilizador, billing/subscription, quotas
e membros convidados. Introduzido em Maio 2026.

**V2** (estado actual, Maio 2026 — migração `20260517100000_workspaces_v2_drop_owner_unique`):
utilizadores podem ter **múltiplos workspaces**. O unique em `Workspace.ownerId` foi
removido. CRUD parcial exposto: `GET /workspaces` (lista todos a que o user tem acesso),
`POST /workspaces { name }` (cria), `GET /workspaces/me` (devolve o default).
Hooks de criação de User continuam a auto-criar 1 workspace inicial. "Workspace
default" = o mais antigo (orderBy createdAt asc) — preserva semântica V1 para users
com 1 workspace, e dá um default determinístico para users com vários.

**V1** (histórico): cada utilizador tinha exactamente 1 workspace. Sem CRUD. Constraint
`@@unique([ownerId])` impedia mais. Substituída pela V2 acima.

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
| GET | `/api/v1/workspaces/me` | JWT | Devolve workspace default do user (mais antigo) — `{ publicId, name, status, createdAt }` |
| GET | `/api/v1/workspaces` | JWT | Lista todos os workspaces acessíveis ao user: owned (ownerId) + WorkspaceMember(ACCEPTED). Cada item: `{ publicId, name, status, createdAt, role }` onde `role ∈ { OWNER, BASIC, LICENSED }` |
| POST | `/api/v1/workspaces` | JWT | Cria workspace novo com o user autenticado como owner. Body `{ name: string }` (1-80 chars). Em transacção: cria Workspace + Subscription default. Audit: `WORKSPACE_CREATED` |

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

- `getDefaultForUser(userId): Promise<Workspace>` — V2: `findFirst orderBy createdAt asc` (mais antigo). Lança 404 se user não tiver workspace.
- `findAllForUser(userId): Promise<Item[]>` — V2: union owned + WorkspaceMember(ACCEPTED), cada item com `role`. Owned vêm primeiro (orderBy createdAt asc).
- `createWorkspace(userId, name): Promise<Workspace>` — V2: transacção cria Workspace + Subscription default (com plano `isDefault=true`). Valida `1 ≤ name ≤ 80`.
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

**Estado actual: V2 parcial entregue (Maio 2026 — migração `20260517100000`).**

Feito:
- ✅ **Schema**: `DROP INDEX Workspace_ownerId_key` (a constraint era um índice único).
- ✅ **Endpoints CRUD parcial**: `GET /workspaces`, `POST /workspaces`. Sem `PATCH`/`DELETE` ainda.
- ✅ **`getDefaultForUser`** + 10 outros call-sites refactored de
  `findUnique({where:{ownerId}})` para `findFirst(...orderBy: createdAt asc)`,
  preservando semântica V1 para users com 1 workspace.
- ✅ **Frontend** (`frontend2`): `WorkspacesProvider` + `useWorkspaces` hook + Sidebar
  workspace switcher; modal "Novo Workspace" ligado a `POST /workspaces`.

Por fazer (futuro):
- 🔲 `PATCH /workspaces/:publicId` (renomear) e `DELETE /workspaces/:publicId` (eliminar).
- 🔲 **WorkspaceContextGuard**: ativar como `APP_GUARD` global. Requer promover
  `JwtAuthGuard` a global + adicionar `@Public()` decorator nas rotas abertas.
- 🔲 **Browser URLs `/<workspacePublicId>/...`** no React Router (estilo Asana). Hoje
  o frontend2 navega para `/w/{publicId}` para "abrir um workspace" mas as outras
  rotas continuam workspace-agnostic.
- 🔲 Validação anti-spam: rate-limit do `POST /workspaces` por user.
- 🔲 UI de WS settings real (`/w/:id/settings`) — Fase 2.1 do frontend2.

## Frontend (frontend2 — V2)

- `AuthUser.workspacePublicId` populado por `/auth/me`. Continua a representar o
  **default** do user (mais antigo). Usado como fallback quando a URL não tem `:workspaceId`.
- `WorkspacesProvider` em [`frontend2/src/workspaces/WorkspacesContext.tsx`](frontend2/src/workspaces/WorkspacesContext.tsx)
  envolve o `AppShell` e:
  - Faz `GET /api/v1/workspaces` ao montar (após boot do auth)
  - Expõe `{ workspaces, loading, activeWorkspace, refresh, create }`
  - `activeWorkspace` resolve-se por URL (`:workspaceId`) → `user.workspacePublicId` → primeiro da lista
- Sidebar (UserCard topo + WS context) e UserMenu (lista de "Conta") consomem
  `useWorkspaces()` — sem mais `mockData.workspaces`.
- `NewWorkspaceModal` chama `useWorkspaces().create(name)` (async), aguarda OK
  e navega para `/w/{novoPublicId}`. Erros mostrados inline no modal.
- Frontend antigo (`frontend/`) ainda usa o pattern V1 (`WorkspaceContext`
  1:1 com user) — continua a funcionar porque `GET /workspaces/me` mantém a
  semântica.

## Anti-padrões

- ❌ Em V2: usar `workspace.findUnique({ where: { ownerId } })` — o constraint unique foi removido, este where deixou de existir no `WhereUniqueInput`. Usar sempre `findFirst({ where: { ownerId }, orderBy: { createdAt: 'asc' } })`.
- ❌ Criar `Workspace` directamente em código novo — fora dos 4 hooks de criação de User e do `WorkspacesService.createWorkspace`, não há justificação. O service garante criação consistente (transacção com Subscription default).
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
