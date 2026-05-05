# Claude: carregar para qualquer tarefa do Gantt

## O que é

DHTMLX Gantt Pro v9.0.3 (licença vitalícia em `B:\DHTMLxPro`).
Assets: `frontend/public/assets/libs/dhtmlxgantt/` (`dhtmlxgantt.js` + `dhtmlxgantt.css`).
Página principal: `frontend/src/pages/PlanningPage.tsx` (por projecto).
Documentação completa: `GANTT.md` (na raiz do projecto).

## Feature flag

- Flag `gantt_view` controla acesso.
- `PLATFORM_ADMIN` bypassa sempre (UI não verifica flag para admin).
- Frontend: hook `useFeatureFlag('gantt_view')` com cache por sessão.
- Backend: `/planning/gantt` protegido por `FeatureFlagGuard` + `@RequireFeature('gantt_view')`.

## Módulos backend

| Módulo | Responsabilidade |
|--------|-----------------|
| `PlanningModule` | CRUD tarefas, links, recursos, horas/dia — `src/planning/` |
| `GanttModule` | Apenas GET dados no formato DHTMLX — `src/gantt/` |
| `GanttConfigModule` | Configuração de colunas (3 níveis) — `src/gantt-config/` |

## Fases concluídas

- **Fase 6** — Fundação: 5 modelos Prisma (GanttTask, GanttLink, GanttResource, GanttAssignment, GanttBaseline), CRUD backend.
- **Fase 6b** — Integração DHTMLX: layout 2 painéis, drag&drop, resize, links, resource grid.
- **Fase 6c** — Recursos externos (contractors) com `hoursPerDay` e `userTypeId`.
- **Fase 10** — Config Gantt 3 níveis (GLOBAL < USER < PROJECT), offcanvas, GanttSettingsPage.

## Regras críticas

- Singleton DHTMLX: `gantt` é objecto global — inicializar apenas uma vez por página.
- Lightbox nativo **desactivado** — double-click abre modais React.
- Stale closures em `attachEvent`: usar `useRef` para todos os valores que mudam (ver @docs/claude/tools/gantt/interactions.md).
- Datas: Gantt usa strings `"YYYY-MM-DD"` ↔ ISO UTC no backend.
- **Semântica de `duration`**: dias úteis (alinhado com `gantt.config.work_time` do DHTMLX). Backend usa `addBusinessDaysInclusive` em [`business-days.util.ts`](backend/src/planning/business-days.util.ts); **nunca** calcular `endDate` via `start + duration*86400000`. Detalhes + modos `inclusive`/`exclusive` em @docs/claude/tools/gantt/data-model.md.
- Validações: milestone `duration=0`, `progress` entre 0–1, sem auto-link, sem ciclos.
- Cascade delete: eliminar tarefa pai elimina filhos + links.

## Nomenclatura

- "Feriados" (UI PT) / "Holiday" (código) — **nunca** "Calendar" neste contexto.
- `nonWorkingDays: string[]` em `"YYYY-MM-DD"` incluído no response de `GET /projects/:id/planning`.

## Ficheiros desta pasta

- @docs/claude/tools/gantt/data-model.md — modelos Prisma, tipos, holidays, GanttConfig
- @docs/claude/tools/gantt/interactions.md — drag&drop, eventos, stale closures
- @docs/claude/tools/gantt/rendering.md — layout, colunas, CSS, resourceGrid

## Referências GANTT.md

| Secção | Conteúdo |
|--------|----------|
| §1–10, §15 | GanttConfig: modelo, endpoints, hook, resolução, sidebar nested menu |
| §11 | Init, stale closures, resource nodes, singleton |
| §12 | Serialização, modelos, módulos separados, recursos externos |
| §13 | nonWorkingDays, setWorkTime, CSS .holiday vs .weekend |
| §14 | gantt_view flag (UI-only, PLATFORM_ADMIN bypass) |

# Relacionados: @docs/claude/backend.md @docs/claude/db.md @docs/claude/frontend.md
