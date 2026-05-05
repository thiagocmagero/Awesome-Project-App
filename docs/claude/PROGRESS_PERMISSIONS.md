#IGNORAR LEITURA DAQUI PRA FRENTE.

# Progresso: Sistema de Permissões por Projecto

## Fase A — Fundação Backend

- [x] A1. Migração Prisma (enum ProjectRole, model ProjectPermissionGrant, alterar ProjectMember.role)
- [x] A2. project-permissions.ts (enum ProjectAction, DEFAULT_PERMISSIONS, DELEGATABLE, ACTION_GROUPS)
- [x] A3. project-permissions.service.ts (resolveRole, can, resolveAll, grants CRUD, updateMemberRole)
- [x] A4. project-permission.guard.ts + require-project-permission.decorator.ts
- [x] A5. project-permissions.controller.ts (GET my-permissions, GET/POST/DELETE grants, PATCH role)
- [x] A6. Alterar findOneInternal — aceitar membros ACCEPTED
- [x] A7. Aplicar guard em projects.controller.ts (todos os endpoints)
- [x] A8. Aplicar guard em planning.controller.ts (todos os endpoints)
- [x] A9. projects.module.ts + planning.module.ts — registar novos providers
- [ ] A10. npm run build backend — zero erros (executar manualmente)

## Fase B — Frontend

- [x] B1. translations.json — namespace "permissions" (4 idiomas, 50 chaves)
- [x] B2. i18n/index.ts — registar namespace "permissions"
- [ ] B3. npm run seed — inserir chaves i18n (executar manualmente)
- [x] B4. useProjectPermissions.ts — hook frontend com cache
- [x] B5. ProjectPermissionsPage.tsx — página de gestão (abas Membros + Permissões)
- [x] B6. App.tsx — rota /projects/:id/permissions
- [x] B7. ProjectsPage.tsx — item "Permissões" no dropdown do card
- [x] B8. PlanningPage.tsx + TaskTable.tsx — esconder botões com base em canDo()
- [ ] B9. npm run build frontend — zero erros (executar manualmente)

## Fase C — Documentação

- [x] C1. docs/claude/permissions.md — metodologia de permissões (regras CLAUDE)
- [x] C2. docs/claude/tools/permissions/overview.md — ponto de entrada
- [x] C3. docs/claude/tools/permissions/data-model.md — modelos, enum, resolução
- [x] C4. CLAUDE.md — adicionar referências modulares
- [x] C5. docs/claude/PROGRESS_PERMISSIONS.md — este ficheiro

## Fase D — Melhorias Futuras (pós-entrega)

- [ ] D1. Permissões ao nível de tarefa individual (owner da tarefa pode editar)
- [ ] D2. Cache de permissões (Redis ou cache por sessão backend)
- [ ] D3. Audit log de alterações de permissão
- [ ] D4. Notificação quando role é alterado
