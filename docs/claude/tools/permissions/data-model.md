# Claude: carregar para tarefas do modelo de dados de permissões

## Modelos Prisma

```prisma
enum ProjectRole {
  OWNER
  CONTRIBUTOR
  READER
}

model ProjectPermissionGrant {
  id              Int          @id @default(autoincrement())
  publicId        String       @unique @default(uuid(7))
  projectId       Int
  grantedToRole   ProjectRole? // grant para um role (CONTRIBUTOR ou READER)
  grantedToUserId Int?         // grant individual para um membro
  action          String       // valor de ProjectAction
  grantedById     Int          // quem concedeu
  createdAt       DateTime     @default(now())

  @@unique([projectId, action, grantedToRole], name: "uq_grant_role")
  @@unique([projectId, action, grantedToUserId], name: "uq_grant_user")
  @@index([projectId])
}
```

## ProjectMember.role

Alterado de `String @default("PROJECT_MEMBER")` para `ProjectRole @default(READER)`.
Todos os membros convidados recebem automaticamente role READER.

## ProjectAction (enum TypeScript)

Definido em `backend/src/projects/project-permissions.ts`:

| Acção | Descrição | Default CONTRIBUTOR | Default READER |
|-------|-----------|:---:|:---:|
| PROJECT_VIEW | Ver projecto | ✓ | ✓ |
| PROJECT_UPDATE | Editar projecto | — | — |
| PROJECT_DELETE | Eliminar projecto | — | — |
| MEMBER_INVITE | Convidar membros | — | — |
| MEMBER_REMOVE | Remover membros | — | — |
| MEMBER_CHANGE_ROLE | Alterar role | — | — |
| MEMBER_MANAGE_TEAMS | Gerir equipas | — | — |
| PERMISSIONS_MANAGE | Gerir permissões | — | — |
| TASK_CREATE | Criar tarefas | ✓ | — |
| TASK_EDIT | Editar tarefas | ✓ | — |
| TASK_DELETE | Eliminar tarefas | ✓ | — |
| LINK_MANAGE | Gerir links | ✓ | — |
| TASK_COMMENT | Comentar | ✓ | ✓ |
| RESOURCE_MANAGE | Gerir recursos | ✓ | — |
| MEMBER_HOURS_MANAGE | Gerir horas | — | — |
| HOLIDAY_MANAGE | Gerir feriados | — | — |
| GANTT_CONFIG | Configurar Gantt | ✓ | — |
| DATA_EXPORT | Exportar dados | ✓ | ✓ |
| TIMESHEET_LOG | Lançar/editar/submeter próprias horas | ✓ | ✓ |
| TIMESHEET_APPROVE | Aprovar/rejeitar timesheets de equipa (delegável, não-transitiva) | — | — |

## Resolução

Ordem de prioridade:
1. `PLATFORM_ADMIN` → sempre permitido
2. `OWNER` (Project.ownerId) → sempre permitido
3. Defaults do role (codificados em `DEFAULT_PERMISSIONS`)
4. Grants por role (`ProjectPermissionGrant.grantedToRole`)
5. Grants individuais (`ProjectPermissionGrant.grantedToUserId`)

# Relacionados: @docs/claude/permissions.md @docs/claude/db.md
