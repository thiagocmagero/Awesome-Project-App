# Claude: guia obrigatório para criação de novas funcionalidades

## Regra de comportamento

Antes de implementar qualquer nova funcionalidade, o Claude DEVE:

1. **Ler este guia** e identificar quais regras se aplicam
2. **Perguntar ao utilizador** quais regras aplicar — se o utilizador não especificou na instrução original
3. **Nunca assumir** que uma regra não se aplica — em caso de dúvida, perguntar

> **Exemplo de pergunta:**
> "Antes de avançar, preciso confirmar algumas decisões:
> - Esta funcionalidade precisa de controlo de permissões por projecto?
> - Deve ser controlada por feature flag?
> - Precisa de novos modelos na base de dados?
> - Precisa de um novo namespace i18n ou deve usar um existente?"

---

## Checklist de decisões

Avaliar **cada regra** abaixo para cada nova funcionalidade. Marcar as que se aplicam e seguir a documentação referenciada.

### 1. Internacionalização (i18n)

| | |
|---|---|
| **Aplica-se quando** | A funcionalidade tem qualquer texto visível na UI |
| **Documentação** | @docs/claude/i18n.md |
| **Acções** | Criar chaves em `translations.json` (4 idiomas: pt-PT, pt-BR, en, es). Registar namespace em `frontend/src/i18n/index.ts`. Usar `t()` / `tc()` no JSX. Executar `npm run seed`. |
| **Perguntar** | "Esta funcionalidade precisa de um novo namespace i18n ou deve usar um existente?" |

### 2. Permissões por projecto

| | |
|---|---|
| **Aplica-se quando** | A funcionalidade envolve acções ao nível do projecto (criar, editar, eliminar recursos do projecto) |
| **Documentação** | @docs/claude/permissions.md · @docs/claude/tools/permissions/overview.md · @docs/claude/tools/permissions/data-model.md |
| **Acções** | Adicionar `ProjectAction` ao enum. Definir defaults e delegabilidade. Aplicar `@RequireProjectPermission` no endpoint. Usar `canDo()` no frontend para esconder botões. |
| **Perguntar** | "Esta funcionalidade envolve acções ao nível do projecto que necessitam de controlo de permissões?" |

### 3. Feature Flags

| | |
|---|---|
| **Aplica-se quando** | A funcionalidade é opcional e deve poder ser activada/desactivada por plano ou por utilizador |
| **Documentação** | @docs/claude/auth.md (secção Feature Flags) |
| **Acções** | Criar flag no seed. Backend: `FeatureFlagGuard` + `@RequireFeature('key')`. Frontend: `useFeatureFlag('key')`. PLATFORM_ADMIN bypassa sempre. |
| **Perguntar** | "Esta funcionalidade deve ser controlada por feature flag (activação selectiva por plano/utilizador)?" |

### 4. Limites de plano

| | |
|---|---|
| **Aplica-se quando** | A funcionalidade tem um recurso contável que deve ser limitado por plano (ex: max_projects, max_tasks) |
| **Documentação** | @docs/claude/auth.md (secção Planos) |
| **Acções** | Criar `PlanLimit` com `limitKey`. Backend: `PlanLimitGuard` + `@CheckPlanLimit('key')`. Actualizar `LIMIT_KEYS` no frontend. Valor `-1` = ilimitado. |
| **Perguntar** | "Esta funcionalidade tem um limite associado ao plano do utilizador (ex: max_X)?" |

### 5. Base de dados / Modelos Prisma

| | |
|---|---|
| **Aplica-se quando** | A funcionalidade persiste dados novos ou altera dados existentes |
| **Documentação** | @docs/claude/db.md |
| **Acções** | Criar modelo com `publicId`, `createdAt`, `updatedAt`, `status`. Soft delete obrigatório. Migração segura. `npx prisma generate` após alterar schema. |
| **Perguntar** | "São necessários novos modelos ou alterações ao schema existente?" |

### 6. Backend / Endpoints NestJS

| | |
|---|---|
| **Aplica-se quando** | A funcionalidade expõe dados ou aceita acções via API |
| **Documentação** | @docs/claude/backend.md |
| **Acções** | Prefixo `/api`. DTOs com `class-validator`. Registar módulo em `app.module.ts`. Nunca expor `id` numérico — usar `publicId`. `ParseUUIDPipe` nos params. |
| **Perguntar** | "Quais endpoints REST são necessários (GET/POST/PUT/DELETE)?" |

### 7. Autenticação e Autorização

| | |
|---|---|
| **Aplica-se quando** | A funcionalidade tem restrições de acesso por perfil ou necessita de autenticação |
| **Documentação** | @docs/claude/auth.md |
| **Acções** | `JwtAuthGuard` em todas as rotas protegidas. `ProfilesGuard` + `@RequireProfiles` para restrição por perfil. Nunca incluir `role` ou `publicId` no JWT. |
| **Perguntar** | "Esta funcionalidade é restrita a algum perfil específico (ex: apenas PLATFORM_ADMIN)?" |

### 8. Frontend / UI Zynix

| | |
|---|---|
| **Aplica-se quando** | A funcionalidade tem componentes visuais |
| **Documentação** | @docs/claude/frontend.md |
| **Acções** | Modais com `modal fade show d-block`. Toasts via `showToast()`. FlatPickr para datas. Choices.js para selects. Breadcrumb `breadcrumb-style2`. Tabs com `data-bs-toggle="tab"`. Nunca `alert()`. |
| **Perguntar** | "Quais componentes de UI são necessários (modal, tabela, formulário, tabs)?" |

### 9. Arquitectura / Estrutura

| | |
|---|---|
| **Aplica-se quando** | A funcionalidade adiciona uma nova secção, página ou entrada de navegação |
| **Documentação** | @docs/claude/architecture.md |
| **Acções** | Criar directórios conforme convenção. Adicionar rota em `App.tsx`. Adicionar item no sidebar se necessário. Actualizar tabela de fases. |
| **Perguntar** | "Esta funcionalidade precisa de um novo item no sidebar/menu de navegação?" |

### 10. Formato de data por projecto

| | |
|---|---|
| **Aplica-se quando** | A funcionalidade exibe ou edita datas dentro do contexto dum projecto (Planning, Gantt, Board, Calendar, Timesheet, modais relacionados) |
| **Documentação** | @docs/claude/date-formatting.md |
| **Acções** | Consumir `useResolvedDateFormat()` do `ProjectDateFormatContext` + `formatDate`/`formatDateTime`/`toFlatpickrFormat`/`toGanttFormat` de `lib/dateFormatting.ts`. Pages globais sem projecto: `formatDate(d)` directo (cai no `DEFAULT_DATE_FORMAT`). Pré-preenchimento de create-project: usar `INITIAL_PROJECT_DATE_FORMAT`. Em widgets DHTMLX: nunca alterar `gantt.config.date_format` (wire format); display via templates de coluna com `dateFormatRef`. |
| **Perguntar** | "Esta funcionalidade exibe ou edita datas? Está dentro do contexto dum projecto ou é cross-project/global?" |

### 11. Timezone (Datas Puras vs Momentos Reais)

| | |
|---|---|
| **Aplica-se quando** | A funcionalidade adiciona ou edita qualquer campo de data/hora (display, input ou lógica). |
| **Documentação** | @docs/claude/timezone.md |
| **Acções** | **Antes de implementar**, classificar o campo como **DATA PURA** (label de calendário, sem hora) ou **MOMENTO REAL** (instante exacto). DATA PURA → `timestamp(3)` sem tz, UTC midnight, `formatDate(d, dateFormat)` tz-agnostic. MOMENTO REAL → `@db.Timestamptz(6)`, `formatMoment(d, tz)` ou `relativeTimeInTimezone(d, tz, t)` com `tz` de `useTimezone()`. Nunca misturar. Validação backend via `@Validate(IsValidTimezone)` em DTOs. |
| **Perguntar** | "Este campo de data/hora é uma DATA PURA (rótulo de calendário, dia X) ou um MOMENTO REAL (instante exacto, com hora)? Em caso de dúvida, há hora real no domínio do problema?" |

### 12. Deploy

| | |
|---|---|
| **Aplica-se sempre** | Toda alteração ao código |
| **Documentação** | CLAUDE.md (regra obrigatória de deploy) |
| **Acções** | SEMPRE indicar comandos de deploy no final da resposta. Reiniciar container apenas para novas deps npm, `vite.config.ts`, ou `main.ts` backend. |

---

## Anti-padrões

- ❌ Implementar funcionalidade sem perguntar quais regras aplicar
- ❌ Texto hardcoded no JSX (violar i18n)
- ❌ Endpoint de projecto sem `@RequireProjectPermission` (violar permissões)
- ❌ Novo modelo Prisma sem `publicId`, `status`, ou soft delete
- ❌ Usar `alert()` ou `window.alert()` em vez de `showToast()`
- ❌ Expor `id` numérico na API
- ❌ Esquecer de registar módulo em `app.module.ts`
- ❌ Esquecer de adicionar chaves i18n nos 4 idiomas
- ❌ Hardcodar formato de data (`'DD/MM/YYYY'`, `'d-m-Y'`, etc.) — usar helpers de `lib/dateFormatting.ts`
- ❌ Mudar `gantt.config.date_format` — é wire format, quebra parse de datas
- ❌ Passar data ISO crua a um template i18n com placeholder de data — formatar primeiro
- ❌ Adicionar campo de data/hora sem classificar como DATA PURA ou MOMENTO REAL — quebra a regra primordial de timezone (ver `@docs/claude/timezone.md`)
- ❌ Usar `@db.Timestamptz` para datas puras (workDate, weekStart, project.startDate, etc.)
- ❌ Usar `formatMoment` para datas puras ou `formatDate` para momentos reais
- ❌ `new Date()` em cálculos de "hoje" sem tz explícita — usar `currentWeekStart(tz)`, `currentMonthIso(tz)`, `isTodayISO(iso, tz)`
- ❌ Não indicar comandos de deploy no final da resposta
