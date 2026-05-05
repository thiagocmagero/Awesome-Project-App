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

## Convites (ProjectMember)

- Estados: `INVITED` → `ACCEPTED` | `DECLINED`.
- Reenviar convite recusado: volta o estado para `INVITED`.
- Apenas `project.ownerId` (ou `PLATFORM_ADMIN`) pode convidar/gerir membros.
- `@@unique([projectId, email])` — mesmo email não pode ser convidado 2× para o mesmo projeto.
- Ao registar-se: convites pendentes associados via `updateMany` (`userId` actualizado).
- Ao fazer login: `AppLayout` mostra `Swal.fire` por cada convite pendente (sequencial, bloqueante).
- Dependência frontend: `sweetalert2` (npm).

## Anti-padrões

- ❌ Incluir `role` ou `publicId` no JWT payload
- ❌ Verificar roles sem usar `ProfilesGuard` + `@RequireProfiles`
- ❌ Expor `id` numérico em respostas da API

# Relacionados: @docs/claude/db.md @docs/claude/backend.md
