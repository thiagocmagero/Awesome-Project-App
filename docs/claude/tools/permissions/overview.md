# Claude: carregar para qualquer tarefa de permissões por projecto

## O que é

Sistema de controlo de acesso granular ao nível do projecto. Cada projecto tem 3 roles
(OWNER, CONTRIBUTOR, READER) com permissões default e um mecanismo de delegação
que permite ao owner conceder acções extra a roles ou membros individuais.

Página de gestão: `frontend/src/pages/ProjectPermissionsPage.tsx`.
Hook: `frontend/src/hooks/useProjectPermissions.ts`.

## Módulos backend

| Módulo | Responsabilidade |
|--------|------------------|
| `ProjectPermissionsService` | Resolução de role, verificação de permissões, CRUD grants |
| `ProjectPermissionGuard` | Guard NestJS reutilizável — `@RequireProjectPermission` |
| `ProjectPermissionsController` | Endpoints REST: /my-permissions, /permissions/* |

## Fluxo de resolução

```
1. É PLATFORM_ADMIN? → pode tudo
2. É owner (Project.ownerId)? → pode tudo
3. É membro ACCEPTED? → verificar role
4. O role tem a acção nos defaults? → sim
5. Existe grant para o role? → sim
6. Existe grant individual para o user? → sim
7. Caso contrário → negado (403)
```

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | `/projects/:id/my-permissions` | JWT | Permissões do user |
| GET | `/projects/:id/permissions` | JWT + PERMISSIONS_MANAGE | Lista grants + membros |
| POST | `/projects/:id/permissions/grants` | JWT + PERMISSIONS_MANAGE | Criar grant |
| DELETE | `/projects/:id/permissions/grants/:grantId` | JWT + PERMISSIONS_MANAGE | Revogar grant |
| PATCH | `/projects/:id/permissions/members/:memberId/role` | JWT + MEMBER_CHANGE_ROLE | Alterar role |

## Frontend

- Hook `useProjectPermissions(projectId)` → `{ can, role, isOwner, loading, invalidate }`
- Cache por sessão (por projectId) — `invalidate()` após alterações de permissão
- Enum `ProjectAction` espelhado no frontend para type safety

# Relacionados: @docs/claude/permissions.md @docs/claude/tools/permissions/data-model.md
