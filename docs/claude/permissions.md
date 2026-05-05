# Claude: carregar para tarefas de permissões ao nível do projecto

## Regra obrigatória — Guard em todas as rotas de escrita

TODA a rota que altera dados ao nível de um projecto DEVE ter:

```typescript
@UseGuards(JwtAuthGuard, ProjectPermissionGuard)
@RequireProjectPermission(ProjectAction.XXXXX)
```

Sem excepções. Mesmo que o endpoint já valide ownership no service, o guard é obrigatório para manter consistência e segurança.

## Hierarquia de roles

```
PLATFORM_ADMIN > OWNER > CONTRIBUTOR > READER
```

- `PLATFORM_ADMIN` — perfil global. Bypassa sempre tudo.
- `OWNER` — dono do projecto (campo `Project.ownerId`). Tem todas as permissões.
- `CONTRIBUTOR` — membro com permissão de escrita. Defaults: CRUD tarefas, links, recursos, config Gantt.
- `READER` — membro com acesso de leitura. Defaults: ver projecto, comentar, exportar.

## Como adicionar uma nova acção

1. Adicionar ao `enum ProjectAction` em `backend/src/projects/project-permissions.ts`
2. Adicionar aos `DEFAULT_PERMISSIONS` se deve ser default para CONTRIBUTOR ou READER
3. Adicionar a `DELEGATABLE_ACTIONS` se o owner pode delegar
4. Adicionar ao `ACTION_GROUPS` correcto (para a UI de accordions)
5. Adicionar chave i18n `action.NOVA_ACCAO` ao namespace `permissions` em `translations.json` (4 idiomas)
6. Aplicar `@RequireProjectPermission(ProjectAction.NOVA_ACCAO)` no endpoint
7. No frontend, verificar `canDo(ProjectAction.NOVA_ACCAO)` nos botões relevantes

## Regra obrigatória — UI tem de espelhar o backend

Cada `@RequireProjectPermission` no backend tem de ter um `canDo(action)` correspondente
no frontend que **esconda ou desactive** o elemento que dispara a chamada. Sem este
espelho, o backend devolve 403 mas o utilizador vê o botão e clica → má UX.

**Padrões aceites para esconder/desactivar:**

```tsx
// Conditional render (preferido — esconde o elemento)
{canDo(ProjectAction.LINK_MANAGE) && (
  <button onClick={createLink}>{t('btn.create_link')}</button>
)}

// disabled + readOnly em inputs (preserva layout)
<input
  disabled={!canDo(ProjectAction.MEMBER_HOURS_MANAGE)}
  readOnly={!canDo(ProjectAction.MEMBER_HOURS_MANAGE)}
/>

// Substituição por elemento estático (link → texto)
{canDo(ProjectAction.TASK_EDIT)
  ? <button onClick={openEdit}>{name}</button>
  : <span>{name}</span>}
```

> **Não basta** validar permissão **só** no handler do clique — o utilizador
> sem permissão não deve sequer ver o botão.

## Regra obrigatória — Intercepts em widgets DHTMLX

Widgets externos (DHTMLX Gantt e Kanban) capturam eventos de drag/click no DOM e
disparam handlers `onAfter*` que persistem no backend. **Antes** desses eventos,
o widget oferece intercepts `onBefore*` (Gantt) ou `api.intercept` (Kanban) que
permitem cancelar a mutação visual.

Para cada acção que persiste no backend e que requer permissão, registar:
1. **Intercept no widget** que valida `canDoRef.current('ACTION')` e devolve `false`
   se faltar permissão (mostra toast `common:errors.forbidden`).
2. **Validação no backend** via `@RequireProjectPermission` — defesa em profundidade.

### Gantt (`onBeforeTaskDrag`, `onBeforeLinkAdd`, `onBeforeLinkDelete`, `onTaskCreated`)

Pattern aplicado em `frontend/src/features/planning/ganttHelpers.ts`:

```typescript
gantt.attachEvent('onBeforeTaskDrag', () => {
  if (!canDoRef.current('TASK_EDIT')) {
    showToastRef.current('warning', tRef.current('common:errors.forbidden'));
    return false; // cancela o drag antes de DHTMLX mover a barra
  }
  return true;
});
```

`canDoRef` é um `useRef` actualizado em cada render (`canDo` muda referência) — sem
isto, o handler usaria a versão estática capturada na criação do listener.

### Kanban

Ver @docs/claude/tools/board/interactions.md (já documentado).

## Endpoints sem `@RequireProjectPermission` por desenho

Estes endpoints são intencionalmente abertos a qualquer utilizador autenticado;
**não** os "corrigir" sem perceber porquê:

- `GET /projects` — lista filtrada no service por ownership/membership.
- `GET /projects/:id` — service valida acesso (ownership + membership ACCEPTED).
- `POST /projects` — qualquer user pode criar; sujeito a `PlanLimitGuard`.
- `GET /projects/:id/my-permissions` — devolve apenas as permissões do próprio user
  no projecto; é o endpoint que alimenta `useProjectPermissions`. Aplicar
  `PROJECT_VIEW` aqui criaria um chicken-and-egg (precisa do hook para saber se
  pode chamá-lo).
- `GET /board-config/resolve`, `GET /gantt-config/resolve` (sem `:projectId`) —
  devolvem config USER+GLOBAL apenas, sem dados de projecto.
- `GET/PUT /board-config/user`, `/gantt-config/user` — config pessoal do utilizador.

## Delegação

O owner pode conceder permissões extra a roles (CONTRIBUTOR, READER) ou a membros individuais.
Os grants são armazenados em `ProjectPermissionGrant` e verificados pelo service após os defaults.

## Ficheiros-chave

| Ficheiro | Responsabilidade |
|----------|------------------|
| `backend/src/projects/project-permissions.ts` | Enum, defaults, groups — fonte de verdade |
| `backend/src/projects/project-permissions.service.ts` | resolveRole, can, resolveAll, grants CRUD |
| `backend/src/projects/guards/project-permission.guard.ts` | Guard NestJS |
| `backend/src/projects/decorators/require-project-permission.decorator.ts` | Decorator |
| `backend/src/projects/project-permissions.controller.ts` | Endpoints /my-permissions, /permissions/* |
| `frontend/src/hooks/useProjectPermissions.ts` | Hook React com cache por sessão |
| `frontend/src/pages/ProjectPermissionsPage.tsx` | Página de gestão de permissões |

## Anti-padrões

- ❌ Verificar `ownerId === user.sub` inline no service sem usar guard
- ❌ Adicionar acção ao enum sem adicionar ao `ACTION_GROUPS`
- ❌ Criar endpoint de projecto sem `@RequireProjectPermission`
- ❌ Hardcodar permissão no frontend sem verificar via `canDo()`
- ❌ Validar `canDo` só no handler (ex. `onClick`) sem esconder/desactivar o elemento
- ❌ Em widgets DHTMLX: confiar apenas em `gantt.config.readonly` global — usar
  intercepts `onBefore*` por acção, alinhado com permissões granulares
- ❌ Capturar `canDo` por closure dentro de `attachEvent`/`api.on` — usar
  `canDoRef = useRef(canDo)` actualizado num `useEffect`

# Relacionados: @docs/claude/tools/permissions/overview.md @docs/claude/auth.md @docs/claude/backend.md
