# Plano — Implementar NewTemplate em frontend2

> Plano com checklist. À medida que cada item é concluído, marcar `[x]`. Na primeira
> sessão de implementação, copiar este ficheiro para `frontend2/MIGRATION.md` para ficar
> versionado-localmente junto ao código (`*.md` é gitignored excepto `README.md` — fica
> só local como contexto de trabalho).

## Contexto

`frontend2/` é hoje um scaffold Vite+React+TS quase vazio (só um placeholder em `App.tsx`).
A intenção é **substituir gradualmente** o frontend actual: `frontend2` torna-se o frontend
oficial, portando features uma a uma. Backend actual mantém-se estável.

Três regras invioláveis desta migração (gravadas em memória —
`feedback_frontend2_migration.md`):

1. **NewTemplate é fonte de verdade.** Divergência entre frontend actual e mockup novo
   resolve-se a favor do mockup.
2. **Backend só com autorização expressa.** Se o mockup pedir endpoint/modelo que não
   existe, parar e perguntar — não tocar em `backend/` sem OK explícito.
3. **Carregar mockup completo cedo, componentizar progressivamente todas as features e
   layouts conforme as melhores práticas de desenvolvimento.** Inverso de "componentizar
   tudo antes de funcionar": primeiro ter o mockup todo a correr em `frontend2/` para
   acompanhar visualmente o que falta; depois ir partindo monólitos em
   features/components conforme cada funcionalidade real é ligada ao backend.

## NewTemplate — inventário

Loader canónico: **`NewTemplate/index.html`** (carrega via Babel standalone):

- `app-dark.jsx` (2089 linhas) — shell canónico: tema light/dark + chrome super-light,
  persistência em localStorage com **anti-flash script inline** (`index.html:11-21`),
  sidebar colapsável, topbar, drawer mobile, modais. Exporta `App` e `window.awpCss`.
- 13 `views-*.jsx`: home, project, task-modal, ws-settings, people, account,
  project-modal, board, shared, gantt, calendar, files, permissions. Cada uma exporta
  componente(s) via `window.X` + string CSS via `window.xCss`.
- Agregação CSS no loader (`index.html:42-47`): concatena `window.awpCss + window.homeCss
  + ...` num único `<style>`.
- Não-carregadas (fora de scope): `views-boreal.jsx`, `views-helio.jsx`,
  `views-stratos.jsx`, `design-canvas.jsx`.
- Auth: `login.html`, `cadastro.html`, `recuperar-senha.html`, `auth.css` (Fase 1).
- Regra do template (`NewTemplate/CLAUDE.md`): **sem breadcrumbs**.

**Modelo de tema** (`app-dark.jsx:1920-1940` + `index.html:11-21`):
- `data-theme`: `light` | `dark` (persistido em `awp-theme`).
- `data-chrome`: `default` | `super-light` (sub-variante de light; descartada ao mudar
  para dark; persistida em `awp-chrome`).
- Três modos efectivos: light/default, light/super-light, dark.

---

## Fase 0 — Shell, tokens, tema, mockup completo carregado

Objectivo: ter o mockup inteiro a correr em `frontend2/` com rotas placeholder e os 3
modos de tema funcionais. Componentização **mínima** — quebrar só o estritamente
necessário (shell, theme, routing). Os 13 `views-*.jsx` portados como ficheiros únicos
para serem partidos quando a respectiva sub-fase de Fase 2 entrar em desenvolvimento.

- [x] **0.1** `index.html` — anti-flash + Google Fonts preconnect
- [x] **0.2** `styles/tokens.css` — `:root` (light) + `[data-theme="dark"]` + `:root[data-theme="light"][data-chrome="super-light"]`
- [x] **0.3** `styles/reset.css` + `styles/globals.css`
- [x] **0.4** `theme/ThemeContext.tsx` — `useTheme()`, persistência localStorage, `setTheme('dark')` força `chrome='default'`, effect aplica/remove `data-*`
- [x] **0.5** `react-router-dom` instalado no container
- [x] **0.6** `shell/AppShell.tsx` — compõe TopBar + Sidebar + `<Outlet/>`, deriva `page` do URL
- [x] **0.7** `shell/TopBar.tsx` + dropdowns separados (`Popover.tsx`, `NotificationPanel.tsx`, `UserMenu.tsx`, `CreateMenu.tsx`, `LanguageMenu.tsx`, `NewWorkspaceModal.tsx`)
- [x] **0.8** `shell/Sidebar.tsx` + nested `MenuTree`/`MenuNode` + UserCard
- [x] **0.9** `shell/useCollapsedSidebar.ts` — media query `<1024px` auto-collapse + drawer + backdrop
- [ ] **0.10** `views/` — port 1:1 dos 13 `views-*.jsx`. **Diferido (ver 0.10b).** Em Fase 0 só entregue `views/Placeholder.tsx` — cada rota mostra placeholder que identifica a sub-fase em que será portada.
- [x] **0.11** `App.tsx` (rotas aninhadas) + `main.tsx` (providers `BrowserRouter`, `ThemeProvider` + injecção única do `shellCss`)
- [x] **0.12** `lib/env.ts` — `getApiBase()` → `'/api/v1'`
- [x] **0.13** Cópia do plano para `frontend2/MIGRATION.md`
- [x] **0.14** Verificação ponta-a-ponta (`npm run build` passa; `curl localhost:5174` HTTP 200)
- [ ] **0.10b** *(iterativo, em curso)* Substituir cada `<Placeholder>` pelo port real do `views-*.jsx`. Ordem sugerida: `home` (valida pipeline) → `account` → `people` → `ws-settings` → `project` → `project-modal` → `task-modal` → `permissions` → `shared` → `board` → `gantt` → `calendar` → `files`. Em cada port: `window.awpTokens` → `import { T } from '../shell/tokens'`; `window.X` → `export`; `window.xCss` → `export const xCss = ...` importado em `main.tsx` e injectado no mesmo `<style>`.

### Estrutura inicial

```
frontend2/
├── index.html                              # anti-flash + Google Fonts preconnect
├── MIGRATION.md                            # cópia deste plano com checklist (item 0.13)
src/
├── main.tsx                                # Router + ThemeProvider
├── App.tsx                                 # routes table
├── styles/                                 # tokens.css + reset.css + globals.css
├── theme/                                  # ThemeContext.tsx + useTheme.ts
├── shell/                                  # AppShell.tsx + TopBar/ + Sidebar/ + useCollapsedSidebar.ts
├── views/                                  # 13 ports 1:1 + modals/
└── lib/                                    # env.ts
```

### Tabela de rotas (item 0.11)

```
/                                            → /home
/home                                        → views/home
/w/:workspaceId                              → views/home (modo workspace)
/w/:workspaceId/people                       → views/people
/w/:workspaceId/types                        → placeholder
/w/:workspaceId/holidays                     → placeholder
/w/:workspaceId/settings                     → views/ws-settings
/w/:workspaceId/p/:projectId                 → /overview
/w/:workspaceId/p/:projectId/overview        → views/project
/w/:workspaceId/p/:projectId/board           → views/board
/w/:workspaceId/p/:projectId/gantt           → views/gantt
/w/:workspaceId/p/:projectId/calendar        → views/calendar
/w/:workspaceId/p/:projectId/files           → views/files
/w/:workspaceId/p/:projectId/permissions     → views/permissions
/w/:workspaceId/p/:projectId/shared          → views/shared
/account                                     → views/account
/login, /register, /forgot-password          → fora do AppShell (Fase 1)
```

### Verificação Fase 0 (item 0.14)

- [ ] Abrir `http://localhost:5174/` → redirect `/home`, shell completo visível
- [ ] Navegar pelo sidebar — cada rota renderiza a view portada (UI dummy, sem backend)
- [ ] Toggle tema light↔dark; refresh preserva
- [ ] Toggle super-light só visível em light; mudar para dark remove-o do `<html>` e do menu
- [ ] Sem flash visível ao carregar (DevTools confirma `data-theme` no `<html>` antes do bundle React executar)
- [ ] Viewport <1024px: sidebar colapsa, drawer abre com backdrop
- [ ] `docker exec awesome-project-app-frontend2 npm run build` passa sem erros

---

## Fase 1 — Autenticação

Portar páginas de auth (`login.html`, `cadastro.html`, `recuperar-senha.html` + `auth.css`)
para componentes React. Ligar a endpoints existentes em `/api/v1/auth/*`.

- [x] **1.0** `lib/api.ts` — `apiFetch` (cookies + CSRF double-submit + refresh dedup + redirect /login) + helpers `apiGet`/`apiPost`
- [x] **1.1** `auth/AuthContext.tsx` (com `toAuthUser` + `ApiAuthUser`) + `auth/ProtectedRoute.tsx` (admite qualquer perfil autenticado)
- [x] **1.2** Skip `/auth/me` em rotas públicas (lista `PUBLIC_PATH_SEGMENTS` no `AuthProvider`)
- [x] **1.3** `auth/LoginPage.tsx` — `POST /api/v1/auth/login`; banner para `?confirmed=true` / `?reset=true`; redirect para `from.pathname` quando há `location.state`
- [x] **1.4** `auth/RegisterPage.tsx` — `POST /auth/register` + estado "verifica o teu email" com link para resend
- [x] **1.5** `auth/ConfirmEmailPage.tsx` — `POST /auth/confirm-email`; success → redirect `/login?confirmed=true`; `TOKEN_ALREADY_USED` → `/error/token-used`; demais erros → `/error/token-expired`
- [x] **1.6** `auth/ForgotPasswordPage.tsx` — `POST /auth/forgot-password`; mensagem neutra OWASP
- [x] **1.7** `auth/ResetPasswordPage.tsx` — `POST /auth/reset-password`; sem token → `/error/token-expired`; sucesso → `/login?reset=true`
- [x] **1.8** `auth/CreateAccountFromInvitePage.tsx` — `GET /auth/invite-check` + `POST /auth/create-account-from-invite` com auto-login (`login(toAuthUser(data.user))` + redirect `/home`)
- [x] **1.9** `auth/ResendConfirmationPage.tsx` — `POST /auth/resend-confirmation` com tratamento de 429 rate-limit
- [x] **1.10** Páginas de erro `errors/TokenExpiredPage.tsx` + `errors/TokenUsedPage.tsx`
- [x] **1.11** Logout — `POST /auth/logout` ligado ao UserMenu (`onLogout` prop em `UserMenu.tsx`, wired em `AppShell.tsx` via `useAuth().logout()` + `navigate('/login')`)
- [x] **1.12** Verificação: build (`tsc + vite build`) passa sem erros; dev server HTTP 200 em `/` e `/login`; `POST /api/v1/auth/login` via proxy devolve 400 esperado para body vazio (proxy → backend funcional). Smoke completo dos fluxos (registo end-to-end, reset password real, convite) será feito quando os endpoints forem exercitados em ambiente de teste.
- [x] **1.13** *(fix pós-Fase-1)* Wire do user real no shell — Sidebar `UserCard` e UserMenu `acc-profile` deixaram de mostrar dados hardcoded ("thiagocmagero" / "Pro" / "Thiago Mágero" / email fixo) e passaram a consumir `useAuth().user`. Inclui:
  - `AuthUser` + `ApiAuthUser` ganham `planCode`/`planName` (estavam no payload do backend mas tinham sido cortados).
  - `lib/avatars.ts` com `initialsOf(name)` + `avatarColorFor(publicId)` **copiados literal de `frontend/src/lib/avatars.ts`** (paleta de 6 cores subtis, algoritmo de iniciais "primeira + última palavra") e `avatarUrlOf(user)` como adição própria (DRY do padrão `?v={avatarUpdatedAt}` que está repetido inline em CommentsPanel, AppLayout, FilesListView do frontend antigo).
  - Sidebar e UserMenu renderizam `<img>` quando `avatarUrl` existe; caso contrário, iniciais com cor determinística.
  - `AppShell` passa `user` do `useAuth` para ambos.
  - Plan badge: `planName ?? planCode ?? 'Free'`.
- [x] **1.14** *(correcção de processo)* Substituído o `lib/avatar.ts` (singular, paleta + algoritmo inventados por mim) pelo `lib/avatars.ts` (plural, port literal do `frontend/`). Causa: criei o ficheiro sem verificar primeiro se já existia equivalente no `frontend/`. Adoptada nova regra **4** no `feedback_frontend2_migration.md`: antes de criar qualquer helper/hook/context/utility em `frontend2/`, verificar com `Grep`/`Glob` em `frontend/src/` e reaproveitar literal — só divergir com autorização explícita.

---

## Fase 2 — Implementação faseada das views

Cada sub-fase implementa uma feature ponta-a-ponta: componentiza o `views-*.jsx`
portado (Fase 0) → liga ao backend → adiciona i18n → permissões → testa. No início de
cada sub-fase, confirmar com o utilizador o âmbito e qualquer pergunta de backend.

### Sub-fase 2.0 — Infra de suporte transversal

- [x] **2.0.1** `i18next` + `i18next-browser-languagedetector` + `react-i18next` instalados; setup canónico portado de `frontend/src/i18n/index.ts` para `frontend2/src/i18n/index.ts` (23 namespaces; `LocalStorageBackend` com ETag-based 304s; `missingKeyHandler` reporta para `POST /api/v1/i18n/missing` quando user autenticado).
- [x] **2.0.2** Routing locale-prefixed `/{locale}/...` (estilo Asana). Port literal de `LocaleContext`, `LocaleGuard`, `RedirectWithLocale`, `useLocalizedNavigate` e `lib/locale.ts`. `LocaleStripper` (workaround anterior) removido. App.tsx restructured: `<Route path="/:locale" element={<LocaleGuard />}>` envolve tudo; auth pages, error pages, AppShell e ProtectedRoute usam `useLocalizedNavigate` ou `urlLocale` para construir paths.
- [x] **2.0.2b** Aplicado `t()` em todas as componentes de frontend2 (auth pages, error pages, sidebar, UserMenu, TopBar, CreateMenu, NotificationPanel, NewWorkspaceModal) usando exclusivamente chaves existentes nos 24 namespaces seed. Strings sem match exacto marcadas com `// TODO i18n` + chave proposta — listadas em batch para aprovação do utilizador antes de criar.
- [x] **2.0.2d** *(complemento — Mai 2026)* Eliminados todos os `// TODO i18n` que sobreviveram: 56 chaves novas adicionadas aos seeds (4 locales) — `common` (topbar.*, nav.home/my_tasks/overview/member_types/calendars/invite_person/account_settings/security/plan_usage/documentation/support/workspace_overview/workspace_settings/project_*, theme.super_light/dark_mode/light_mode, workspaces.new/new_modal_title/name_label/name_placeholder/create_btn/errors.name_too_long/role.*, entity.task/project/workspace/invite, trial.days_remaining/learn_more, footer.terms/privacy/help, errors.rate_limited) e `auth` (signup.consent.marketing/terms, errors.confirmation_already_sent, forgot_password.retry_other_email, confirm_email.verifying_subtitle/success_subtitle/error_title, resend_confirmation.title/subtitle/btn/sent_pagetitle/cta_request, invite.checking_title, create_account.accept_invite_title, links.have_account_login). Fix do bug do seletor de idioma: `AppShell.currentLang` deixou de ser local state e passou a vir do `useLocale()` — picking dispara `LocaleContext.setLocale` (URL + i18next + `PATCH /users/me/locale`). `mockData.ts` eliminado (já não era importado). `Placeholder` agora recebe `titleKey` em vez de strings literais. `WorkspacesContext` ganha hook `useWorkspaceRoleLabel` (i18n). Excepção autorizada: o item "Recursos" do sidebar (e os sub-itens "Modelos"/"Arquivo") permanecem hardcoded.
- [x] **2.0.2c** *(refactor estrutural)* Eliminadas as 5 pastas domain-first (`auth/`, `theme/`, `workspaces/`, `projects/`, `routing/`) que tinha criado por engano e que tornavam o `frontend2/src/` mais fragmentado do que o `frontend/src/` mesmo com muito menos código. Topologia alinhada com `frontend/`:
  - `components/` — AuthLayout, BrandMark, PasswordField, ProtectedRoute, LocaleGuard, RedirectWithLocale (era `auth/` + `routing/`).
  - `contexts/` — AuthContext, ThemeContext, LocaleContext, WorkspacesContext, ProjectsContext (era `auth/` + `theme/` + `workspaces/` + `projects/`).
  - `pages/` — Login, Register, Forgot, Reset, Confirm, Resend, CreateAccount (era `auth/`).
  - `styles/auth.css` (era `auth/auth.css`).
  - Mantidos: `shell/`, `views/`, `errors/`, `lib/`, `hooks/`, `i18n/`, `styles/` (excepções legítimas: `shell/` é especifico do NewTemplate, `views/` são placeholders temporários).
  - ~15 ficheiros tiveram imports actualizados (batch via `sed`). Regra 4 da migração reforçada para incluir topologia de pastas.
- [ ] **2.0.3** Hook `useFeatureFlag` (resolução context-aware via Subscription/seats; PLATFORM_ADMIN bypassa internamente)
- [ ] **2.0.4** Hook `useIsPlatformAdmin`
- [ ] **2.0.5** Hook `useProjectPermissions().canDo(...)` (cache por sessão)
- [ ] **2.0.6** `WebSocketProvider` (`/api/socket.io`, namespace `/notifications`, API `on(event, handler)` genérica)
- [ ] **2.0.7** `ToastContext` (`react-hot-toast`, top-right, 4000ms; `showToast(variant, msg)`)
- [ ] **2.0.8** Formalizar toggle super-light em `views/account` ligado ao `useTheme`

### Sub-fase 2.1 — Workspaces

- [x] **2.1.1** Decisão (autorizada pelo utilizador, Maio 2026): avançar com transição V1→V2 completa no backend — drop unique constraint + `POST /workspaces` + `GET /workspaces`.
- [x] **2.1.2** Backend V2 — migração `20260517100000_workspaces_v2_drop_owner_unique` (drop index `Workspace_ownerId_key`); 11 call-sites refactorados de `workspace.findUnique({where:{ownerId}})` para `findFirst(...orderBy:{createdAt:'asc'})` preservando semântica V1 ("default" = mais antigo).
- [x] **2.1.3** Backend endpoints: `GET /api/v1/workspaces` (lista owned + WorkspaceMember(ACCEPTED) com `role`), `POST /api/v1/workspaces { name }` (cria + Subscription default em transacção, audit `WORKSPACE_CREATED`).
- [x] **2.1.4** Backend env: `APP_URL=http://localhost:5174` (emails de auth passam a apontar para frontend2) + `FRONTEND_ORIGIN=http://localhost:5173,http://localhost:5174` (CORS aceita ambos durante a transição). Container backend recriado para apanhar.
- [x] **2.1.5** Frontend2 `LocaleStripper` em `src/routing/LocaleStripper.tsx` — strip síncrono de prefixo BCP47 do URL (`/pt-pt/reset-password?token=...` → `/reset-password?token=...`); resolve o problema de links de email do backend que vêm com prefixo locale.
- [x] **2.1.6** Frontend2 `WorkspacesProvider` + `useWorkspaces()` em `src/workspaces/WorkspacesContext.tsx`: fetch `/workspaces` ao montar; expõe `{ workspaces, loading, activeWorkspace, refresh, create }`; `activeWorkspace` resolve por URL `:workspaceId` → `user.workspacePublicId` → primeiro.
- [x] **2.1.7** Sidebar (UserCard topo + secção de workspace) e UserMenu (lista "Conta") deixam de usar `mockData.workspaces`; consomem `useWorkspaces()`. Glyph = `initialsOf(ws.name)`; cor = `avatarColorFor(ws.publicId)`. Role label PT via `workspaceRoleLabel(role)`.
- [x] **2.1.8** `NewWorkspaceModal` async + tratamento de erro inline; `AppShell` injecta `onCreate` que chama `create(name)` e navega para `/w/{novoPublicId}`. Botão "+ Novo workspace" no UserMenu e no CreateMenu funcionais.
- [x] **2.1.9** Docs actualizadas: `CLAUDE.md` regra obrigatória Workspace V2; `docs/claude/workspaces.md` com estado V2 + caminho futuro + anti-padrão `findUnique({where:{ownerId}})`.
- [ ] **2.1.10** *(fora de scope desta entrega)* Componentizar `views/ws-settings` (renomear/eliminar workspace, gestão de membership); `PATCH /workspaces/:id`, `DELETE /workspaces/:id`.

### Sub-fase 2.2 — Pessoas (People) + Convites

- [ ] **2.2.1** Componentizar `views/people`
- [ ] **2.2.2** Lista de membros: `GET /workspaces/:id/members` + `/projects/:id/members`
- [ ] **2.2.3** Modal de convite (`setInviteOpen` no mockup) — `POST /projects/:id/members`
- [ ] **2.2.4** Aceitar/recusar: `POST /invitations/:id/accept|decline`
- [ ] **2.2.5** Reenviar: `POST /invitations/:id/resend`
- [ ] **2.2.6** SweetAlert de convites pendentes no boot (replicar `usePendingInvitations` do frontend actual)
- [ ] **2.2.7** i18n + permissões + verificação

### Sub-fase 2.3 — Tipos de Membros (Member Types)

> Antigo "Tipos de Usuário". Renomeação **só de UI** (label i18n muda); modelo backend
> mantém-se `UserType` para não tocar no schema.

- [ ] **2.3.1** Página/secção (provavelmente em ws-settings ou rota dedicada)
- [ ] **2.3.2** CRUD ligado a `/api/v1/user-types`
- [ ] **2.3.3** Labels i18n "Tipos de Membros" nos 4 locales
- [ ] **2.3.4** Verificação

### Sub-fase 2.4 — Configurações de Conta

- [ ] **2.4.1** Componentizar `views/account`
- [ ] **2.4.2** Perfil — `PATCH /users/me`
- [ ] **2.4.3** Avatar — `PATCH /users/me/avatar` (já implementado backend)
- [ ] **2.4.4** Locale — `PATCH /users/me/locale` + sync i18next
- [ ] **2.4.5** Timezone — `PATCH /users/me/timezone` + `<TimezoneSelect>` portado
- [ ] **2.4.6** Toggle dos 3 modos de tema (light/dark/super-light) — já feito em 2.0.8, formaliza-se aqui
- [ ] **2.4.7** Preferências de notificação — `GET/PUT /notifications/preferences/:type/:channel`
- [ ] **2.4.8** Sessões activas — `GET /sessions`, `DELETE /sessions/:id` com confirm SweetAlert
- [ ] **2.4.9** Verificação

### Sub-fase 2.5 — Notificações

- [ ] **2.5.1** `useNotifications` (polling 5min + push WS via 2.0.6, dedup `seenPublicIdsRef`)
- [ ] **2.5.2** Dropdown no topbar com badge unread
- [ ] **2.5.3** `NotificationToastStack` (top-right, fade, 8s default, click navega)
- [ ] **2.5.4** Engrenagem do dropdown → tab notificações em `views/account` (já em 2.4.7)
- [ ] **2.5.5** Verificação ponta-a-ponta (criar comment com @mention → toast aparece <1s)

### Sub-fase 2.6 — Calendários (Holidays)

- [ ] **2.6.1** Página `/w/:wsId/holidays` (rota era placeholder em Fase 0)
- [ ] **2.6.2** Feature flag `multi_holiday` via `useFeatureFlag`
- [ ] **2.6.3** CRUD `Holiday` + `HolidayDate`
- [ ] **2.6.4** Linkagem `ProjectHoliday` (cada projecto pode ligar calendários)
- [ ] **2.6.5** i18n + permissões + verificação

### Sub-fase 2.7 — Projecto: shell, Overview, Permissions, Shared

> Shell e infra base de um projecto. As ferramentas (Lista/Quadro/Gantt/Calendário/
> Timesheet/Arquivos) ficam em 2.8 com sub-fase própria por ferramenta.

- [ ] **2.7.1** `views/project` (Overview) componentizado e ligado a `GET /projects/:id`
- [ ] **2.7.2** Modal de projecto (`views/modals/project-modal`) — criação/edição (`POST/PATCH /projects`)
- [ ] **2.7.3** `views/permissions` — `GET /projects/:id/permissions`, grants CRUD, `PERMISSIONS_MANAGE` gating
- [ ] **2.7.4** `views/shared` — folha de ficheiros/conteúdo partilhado (clarificar com mockup)
- [ ] **2.7.5** Frame visual unificado (`viewFrameStyle()`) aplicado a todas as tabs (regra obrigatória do projecto actual — adaptar ao tema do NewTemplate)
- [ ] **2.7.6** ProjectHeader + Toolbar de tabs (port `app-dark.jsx:1303-1450`)

### Sub-fase 2.8 — Ferramentas do projecto

Cada ferramenta = uma sub-fase. Ordem proposta a confirmar contigo no início de 2.8.
Todas as ferramentas seguem o mesmo padrão por sub-fase: componentizar view portada →
modelos/tipos espelhados do backend → fetch + mutações → permissões granulares (canDo) →
feature flag → i18n → frame visual unificado → verificação ponta-a-ponta.

#### 2.8.1 — Lista (Planeamento)

- [ ] **2.8.1.1** Componentizar `views/project` na parte de lista (overview já em 2.7) ou view dedicada se o mockup tiver
- [ ] **2.8.1.2** Modelos `ITaskState`, `ITaskSwimlane` (espelho de `features/planning/states-types.ts`)
- [ ] **2.8.1.3** CRUD de Estados (`PlanningStatesController` — `/projects/:id/planning/states/*`)
- [ ] **2.8.1.4** Permissão `STATE_MANAGE` (OWNER default, delegável)
- [ ] **2.8.1.5** CRUD de tasks (`/projects/:id/planning/tasks`)
- [ ] **2.8.1.6** Hook `usePlanningStates(projectId)`
- [ ] **2.8.1.7** Modal de task (`views/modals/task-modal` componentizado)
- [ ] **2.8.1.8** i18n (namespace `planning`)
- [ ] **2.8.1.9** Verificação

#### 2.8.2 — Quadro (Board)

- [ ] **2.8.2.1** Componentizar `views/board`
- [ ] **2.8.2.2** Avaliar lib de DnD: portar `@hello-pangea/dnd` (frontend actual) ou alternativa do mockup (clarificar)
- [ ] **2.8.2.3** Feature flag `board_view` via `useFeatureFlag`
- [ ] **2.8.2.4** `useBoardData` + `useBoardConfig` (config 3 níveis GLOBAL/USER/PROJECT)
- [ ] **2.8.2.5** Endpoints `/projects/:id/board` + assignees (`PATCH /board/cards/:taskId/assignees`)
- [ ] **2.8.2.6** Estado da tarefa = `BoardColumn` (regra obrigatória; `PATCH /tasks/:taskId/state`)
- [ ] **2.8.2.7** Permissões `BOARD_VIEW`, `BOARD_CARD_ASSIGN`, `BOARD_CONFIG`
- [ ] **2.8.2.8** Verificação

#### 2.8.3 — Gantt

- [ ] **2.8.3.1** Componentizar `views/gantt`
- [ ] **2.8.3.2** Decisão de widget: manter DHTMLX Gantt Pro v9 do frontend actual (licença vitalícia) ou avaliar alternativa pedida pelo mockup — clarificar
- [ ] **2.8.3.3** Feature flag `gantt_view`
- [ ] **2.8.3.4** Singleton + stale closures via `useRef` (regras DHTMLX já documentadas)
- [ ] **2.8.3.5** Cálculo `endDate` via `addBusinessDaysInclusive`/`addBusinessHoursInclusive` (semântica dias úteis vs horas úteis — `task.durationUnit`)
- [ ] **2.8.3.6** `nonWorkingDays` do projecto + `setWorkTime` alinhado backend↔frontend
- [ ] **2.8.3.7** Config Gantt 3 níveis (GLOBAL/USER/PROJECT) — `useGanttConfig`
- [ ] **2.8.3.8** Toggle Day↔Hour granularity
- [ ] **2.8.3.9** Permissões: intercepts `onBefore*` por acção (`TASK_EDIT`, `LINK_MANAGE`, `TASK_CREATE`)
- [ ] **2.8.3.10** Verificação

#### 2.8.4 — Calendário

- [ ] **2.8.4.1** Componentizar `views/calendar`
- [ ] **2.8.4.2** Decisão: manter FullCalendar v6.1.9 (frontend actual) ou avaliar alternativa
- [ ] **2.8.4.3** Feature flag `calendar_view`
- [ ] **2.8.4.4** Singleton FullCalendar + stale closures
- [ ] **2.8.4.5** Sources: lista única dedupada de holidays + Projeto/Tasks/Milestones + tipos de evento
- [ ] **2.8.4.6** Lazy-init dos 3 tipos sistema (`MANUAL`, `MEETING`, `REMINDER`)
- [ ] **2.8.4.7** Modal de evento + CRUD `/projects/:id/calendar/events`
- [ ] **2.8.4.8** Permissões `CALENDAR_VIEW`/`EVENT_CREATE`/`EVENT_EDIT`/`EVENT_DELETE`/`EVENT_TYPE_MANAGE`/`CONFIG`
- [ ] **2.8.4.9** Conversão `end` inclusive↔exclusive em all-day
- [ ] **2.8.4.10** Verificação

#### 2.8.5 — Timesheet

- [ ] **2.8.5.1** Componentizar a tab `timesheet` no projecto (em `views/project` ou view dedicada conforme mockup)
- [ ] **2.8.5.2** Feature flag `timesheet_view`
- [ ] **2.8.5.3** Grelha tasks×dias + célula com edição inline (POST vs PATCH discriminado por entry existir)
- [ ] **2.8.5.4** Modais: AddEntry / CopyWeek / RejectDay / RejectWeek / History
- [ ] **2.8.5.5** Sub-tabs `mine`/`team` + default por role (gestor entra em `team`)
- [ ] **2.8.5.6** Vista mensal (FullCalendar dayGridMonth) + coluna SEMANA
- [ ] **2.8.5.7** Sidebar de equipa com "Vista agregada" (modo agregado X/Y vs individual ✓/✗)
- [ ] **2.8.5.8** Estados de semana derivados (`recomputeWeekStatus`) e botões condicionais (Submeter/Editar/Aprovar/Rejeitar/Editar aprovação)
- [ ] **2.8.5.9** Audit log imutável + notificações (`TIMESHEET_SUBMITTED`/`APPROVED`/`PARTIALLY_APPROVED`/`REJECTED`)
- [ ] **2.8.5.10** Confirmações obrigatórias (`confirmAction()`) em toda acção
- [ ] **2.8.5.11** Área global `/timesheets` (modos "As minhas" / "Para aprovar", gating via `useTimesheetApprovalAccess`)
- [ ] **2.8.5.12** Permissões `TIMESHEET_LOG` (READER+ default), `TIMESHEET_APPROVE` (OWNER default, delegável)
- [ ] **2.8.5.13** Verificação ponta-a-ponta (lançar → submeter → notificação chega ao gestor → aprovar/rejeitar → user vê banner/notificação)

#### 2.8.6 — Arquivos de projecto

- [ ] **2.8.6.1** Componentizar `views/files` + `FilesPanel` reutilizável (também usado em `TaskModal`)
- [ ] **2.8.6.2** Feature flag `upload` (+ sub-flag `upload_secured` resolvida pelo owner do projecto)
- [ ] **2.8.6.3** Upload multipart com decode UTF-8 do filename (helper já no backend)
- [ ] **2.8.6.4** Lista + download (presigned URL com `ResponseContentDisposition` para nome humano)
- [ ] **2.8.6.5** Replace + Rename + Delete (soft)
- [ ] **2.8.6.6** Badges de scan GuardDuty (PENDING / CLEAN / INFECTED — só visíveis em path secured)
- [ ] **2.8.6.7** Erros com contexto (`formatUploadError` — file_too_large / mime_not_allowed / extension_not_allowed / unrecognized / infected / feature_disabled / storage_unavailable)
- [ ] **2.8.6.8** Permissões `FILE_VIEW`/`FILE_UPLOAD`/`FILE_RENAME`/`FILE_DELETE`
- [ ] **2.8.6.9** Notificação `FILE_INFECTED` no toast (já implementado backend)
- [ ] **2.8.6.10** Verificação

---

## Para aplicar estas alterações (Fase 0)

**Frontend2** (container `awesome-project-app-frontend2`):
```
docker exec awesome-project-app-frontend2 npm install react-router-dom
# vite hot reload apanha os ficheiros novos automaticamente
```

**Backend**: Sem alterações necessárias na Fase 0.

---

## Fora de scope (futuro pós-Fase 2)

- [ ] Substituir o frontend antigo no `docker-compose.local.yml` (swap de portas)
- [ ] Remover `frontend/` após paridade total + período de bake
- [ ] Plataforma de admin (`/audit`, `/translations`, `/settings/*`) — provavelmente Fase 3
- [ ] Multi-workspace V2 (relaxar `@@unique([ownerId])`, browser URLs `/<wsPublicId>/...`)
