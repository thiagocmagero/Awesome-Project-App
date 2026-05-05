# Progresso: Board / Quadro Kanban

**Início:** 2026-04-16  
**Referência:** `docs/claude/tools/board/overview.md`

---

## Fases

| Fase | Descrição | Estado |
|------|-----------|--------|
| 1 | schema.prisma — BoardColumn, BoardCardAssignee, BoardConfig, enums | ✅ Concluído |
| 2 | Backend BoardModule — controller, service, DTOs | ✅ Concluído |
| 3 | Backend BoardConfigModule — 3 níveis GLOBAL/USER/PROJECT | ✅ Concluído |
| 4 | Permissões — 5 ProjectAction BOARD_* + defaults + ACTION_GROUPS | ✅ Concluído |
| 5 | i18n — namespace `board` + `permissions.BOARD_*` (4 idiomas) | ✅ Concluído |
| 6 | Frontend — assets kanban + tab board + container | ✅ Concluído |
| 7 | Frontend — useBoardData, useBoardConfig, useBoardInit + integração PlanningPage | ✅ Concluído |
| 8 | Frontend — BoardColumnModal, BoardDeleteColumnModal + barra de gestão | ✅ Concluído |
| 9 | Frontend — BoardConfigPanel (offcanvas cores + comportamento) | ✅ Concluído |
| 10 | Documentação — docs/claude/tools/board/, PROGRESS_BOARD.md | ✅ Concluído |

---

## Deploy pendente

```bash
# Backend (container awesome-project-app-backend)
npx prisma migrate dev --name add_board_feature
npx prisma generate
npm run seed

# Frontend (container awesome-project-app-frontend)
# Copiar assets (já feito via script):
# frontend/public/assets/libs/dhtmlxkanban/kanban.js
# frontend/public/assets/libs/dhtmlxkanban/kanban.css
# Hot reload aplica alterações .tsx automaticamente
```

---

## Notas de implementação

- Widget DHTMLX Kanban Pro carregado globalmente em `AppLayout.tsx`
- Singleton pattern: `boardInitialized.current` — nunca recriar o widget
- Estados sistema (TODO/INPROGRESS/DONE) criados automaticamente no primeiro `GET /board`
- `label: null` em estado sistema → frontend usa `t(col.labelKey)` do namespace `board`
- `isSystem: true` → bloqueio de eliminação no service (409 Conflict)
- Assignees: replace semantics — PATCH substitui todos os assignees da carta
- Config 3 níveis: deepMerge(GLOBAL ← USER ← PROJECT) — mesmo padrão que GanttConfig
