# Awesome Project App

Plataforma de gestão de projectos full-stack com Gantt, Kanban, Calendário e
Timesheet.

> Repositório privado em GitHub: `thiagocmagero/Awesome-Project-App`.
> Toda a stack arranca com `docker compose up -d`.

---

## Funcionalidades principais

- **Autenticação & autorização** — JWT + bcrypt, perfis (`PLATFORM_ADMIN`,
  `PROJECT_MANAGER`, `STAKEHOLDER`), refresh tokens, sessões revogáveis.
- **Gestão de utilizadores e equipas** — utilizadores, perfis, tipos
  funcionais (Developer, QA, ...), níveis (Junior → Principal), equipas com
  membros e leads.
- **Projectos** — owners, managers, equipas associadas, convites com estados
  (`INVITED` / `ACCEPTED` / `DECLINED`), permissões granulares por projecto
  com delegação.
- **Planos comerciais & Feature Flags** — planos com limites EAV
  (`max_projects`, `max_tasks`, ...), pricing, flags por plano e por user;
  resolução `enabledGlobally → UserOverride → Plan → false`.
- **Planning + Gantt** — DHTMLX Gantt Pro v9, tarefas hierárquicas, links
  (FS/SS/FF/SF), recursos internos e externos (contractors), baselines,
  granularidade dia/hora, business days/hours com feriados, configuração
  Gantt em 3 níveis (GLOBAL → USER → PROJECT).
- **Board / Kanban** — quadro vendorizado (`hello-pangea/dnd`), estados de
  tarefa unificados via `BoardColumn`, permissão `STATE_MANAGE` para CRUD
  de estados.
- **Calendário** — FullCalendar v6, eventos com tipos (sistema + custom),
  read-only sources (tarefas, milestones, projecto, holidays linkados),
  config 3 níveis.
- **Timesheet** — registo semanal de horas, fluxo
  DRAFT → SUBMITTED → APPROVED/REJECTED/PARTIAL com aprovação por dia /
  semana / mês, vista mensal do gestor (FullCalendar dayGridMonth),
  auditoria imutável, área global cross-project (`/timesheets`),
  notificações fire-and-forget.
- **Feriados** — listas de feriados por utilizador, link a projectos,
  integração com cálculo de dias úteis no Gantt.
- **Notificações in-app** — modelo único `Notification` + polling 30s,
  preferências por tipo/canal (IN_APP / EMAIL / BROWSER), opt-out model.
- **i18n** — `react-i18next` com 4 locales (pt-PT, pt-BR, en, es) e
  namespaces por feature; traduções persistidas em BD e seedáveis via
  ficheiros JSON.
- **Timezone-aware** — distinção rigorosa entre **datas puras**
  (`timestamp` UTC midnight) e **momentos reais** (`@db.Timestamptz`)
  com helpers dedicados por categoria.

---

## Stack tecnológica

| Camada     | Tecnologia                         | Versão                         |
|------------|------------------------------------|--------------------------------|
| Frontend   | React + TypeScript + Vite          | React 18, Vite 6, TS 5         |
| UI         | Zynix Bootstrap 5 (template)       | assets em `frontend/public/`   |
| Drag&Drop  | DHTMLX Gantt Pro · @hello-pangea/dnd · FullCalendar v6.1 | — |
| Backend    | NestJS + TypeScript                | NestJS 10, TS 5                |
| ORM        | Prisma                             | 6.x                            |
| BD         | PostgreSQL                         | 16 (Bookworm)                  |
| Runtime    | Node.js                            | 22 (Bookworm Slim)             |
| Auth       | passport-jwt + bcrypt + cookies    | —                              |
| Segurança  | Helmet, ValidationPipe, Throttler  | —                              |
| i18n       | react-i18next + i18next-http-backend | —                            |
| Docker     | docker compose v2                  | runtime único — sem builds locais |

---

## Estrutura do repositório

```text
Awesome-Project-App/
├── docker-compose.yml             # Stack de produção / Portainer
├── docker-compose.local.yml       # Stack para dev local (volumes nomeados)
├── .env.example                   # Template de variáveis (copiar para .env)
├── backend/                       # NestJS + Prisma
│   ├── src/
│   │   ├── auth/  users/  profiles/  user-types/  user-levels/
│   │   ├── teams/  projects/  invitations/  plans/
│   │   ├── feature-flags/  usage/  platform-config/
│   │   ├── planning/  gantt/  gantt-config/  holidays/
│   │   ├── board-config/  calendar/  calendar-config/
│   │   ├── timesheet/  comments/  notifications/
│   │   ├── i18n/  common/  prisma/  app.module.ts  main.ts
│   └── prisma/
│       ├── schema.prisma
│       ├── migrations/
│       ├── seed.js
│       └── seeds/translations/   # 1 JSON por namespace × 4 locales
├── frontend/                      # React + Vite + TS
│   └── src/
│       ├── App.tsx  main.tsx
│       ├── pages/                # 20+ páginas (Login, Projects, Planning, ...)
│       ├── features/             # board, calendar, planning, timesheet, ...
│       ├── components/  contexts/  hooks/  lib/  i18n/
│       └── vendor/               # libs vendorizadas
└── docs/claude/                   # Documentação interna modular (não versionada)
```

> `node_modules/`, `postgres-data/`, `.env` e a maioria dos `*.md`
> (excepto este README) **não** são versionados — ver [`.gitignore`](.gitignore).

---

## Pré-requisitos

- **Docker Desktop** (Windows/Mac) ou **Docker Engine** + `docker compose v2`
- ~3 GB livres em disco para imagens + `node_modules` por container
- Portas livres no host: `3000` (backend), `5173` (frontend), `5432` (Postgres)

---

## Setup local (primeiro arranque)

```bash
# 1. Clonar
git clone https://github.com/thiagocmagero/Awesome-Project-App.git
cd Awesome-Project-App

# 2. Criar .env a partir do template e ajustar segredos
cp .env.example .env
# Editar .env e definir pelo menos:
#   POSTGRES_PASSWORD, JWT_SECRET (≥32 chars), APP_ADMIN_*

# 3. Subir a stack (compose local — volumes nomeados, sem APP_BASE_PATH)
docker compose -f docker-compose.local.yml up -d

# 4. Acompanhar logs do primeiro arranque
#    (instala deps, gera Prisma client, aplica migrations, corre seed)
docker compose -f docker-compose.local.yml logs -f backend
```

> **Primeiro arranque demora alguns minutos** — backend instala deps,
> compila bindings nativos (`bcrypt`), corre `prisma migrate deploy` e
> faz o seed (admin + perfis + planos + traduções).

### URLs locais

- Frontend: <http://localhost:5173>
- Backend API: <http://localhost:3000/api>
- Healthcheck: <http://localhost:3000/api/hello>
- Postgres: `localhost:5432` (credenciais do `.env`)

### Login inicial

Utilizador admin criado pelo seed a partir das variáveis `APP_ADMIN_*`:
- Email: valor de `APP_ADMIN_EMAIL`
- Password: valor de `APP_ADMIN_PASSWORD`
- Perfil: `PLATFORM_ADMIN` (acesso total, bypassa feature flags e limites de plano)

---

## Comandos úteis

Todos correm **dentro dos containers** (não no host).

### Backend (`awesome-project-app-backend`)

```bash
# Hot reload já está activo em dev — basta editar ficheiros .ts

# Após alterar prisma/schema.prisma:
docker exec awesome-project-app-backend npx prisma generate
docker exec awesome-project-app-backend npx prisma migrate dev --name <descricao>

# Re-correr seed (idempotente)
docker exec awesome-project-app-backend npm run seed

# Re-split de translations.json (após export do backoffice)
docker exec awesome-project-app-backend npm run seed:split

# Build (produção)
docker exec awesome-project-app-backend npm run build
```

### Frontend (`awesome-project-app-frontend`)

```bash
# Hot reload activo — alterações .tsx aplicam-se automaticamente

# Build (produção)
docker exec awesome-project-app-frontend npm run build
```

### Stack

```bash
# Parar tudo
docker compose -f docker-compose.local.yml down

# Reset completo (apaga volumes — INCLUI BD!)
docker compose -f docker-compose.local.yml down -v

# Reiniciar um serviço (necessário após alterar vite.config.ts ou main.ts)
docker compose -f docker-compose.local.yml restart frontend
docker compose -f docker-compose.local.yml restart backend
```

> Reiniciar o container apenas quando: instalar novas deps npm, alterar
> `vite.config.ts` ou `backend/src/main.ts`. Para todo o resto, o hot reload
> de Nest e Vite trata da actualização.

---

## Variáveis de ambiente principais

Ver [`.env.example`](.env.example) para a lista completa. Obrigatórias:

| Variável | Descrição |
|----------|-----------|
| `APP_NAME` | Prefixo de nome dos containers (default `awesome-project-app`) |
| `APP_BASE_PATH` | Apenas para `docker-compose.yml` (Portainer). Em local usa `.` ou ignora com `docker-compose.local.yml` |
| `POSTGRES_DB/USER/PASSWORD` | Credenciais Postgres |
| `DATABASE_URL` | URL completa Prisma (`postgresql://user:pass@postgres:5432/db?schema=public`) |
| `BACKEND_PORT` / `FRONTEND_PORT` | Portas expostas no host |
| `JWT_SECRET` | **Mínimo 32 caracteres**. Gerar com `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Default `1d` (legacy) — também há `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` |
| `APP_ADMIN_*` | Credenciais do admin criado pelo seed |
| `FRONTEND_ORIGIN` | CORS — CSV para várias origens |
| `COOKIE_SECURE` | `true` em produção (requer HTTPS) |

---

## Endpoints relevantes

Prefixo global: `/api`. Lista completa em
[`docs/claude/backend.md`](docs/claude/backend.md). Highlights:

- `POST /api/auth/login` · `POST /api/auth/register` · `GET /api/auth/me`
- `GET/POST/PATCH/DELETE /api/users` · `/api/teams` · `/api/projects`
- `/api/projects/:id/planning/{tasks,links,resources,member-hours}` (Gantt)
- `/api/projects/:id/board` · `/api/projects/:id/board-config/*` (Kanban)
- `/api/projects/:id/calendar/{events,event-types}` (Calendar)
- `/api/projects/:id/timesheets/*` + `/api/timesheets/*` (project + global)
- `/api/holidays` · `/api/projects/:id/holidays`
- `/api/plans` · `/api/feature-flags` · `/api/usage`
- `/api/notifications` · `/api/notifications/preferences`
- `/api/i18n` (export/import de traduções)
- `/api/platform-config/{email,limits}`

---

## Deploy em Portainer (`docker-compose.yml`)

A versão `docker-compose.yml` (sem `.local`) usa `${APP_BASE_PATH}` para mapear
volumes para um caminho persistente fora da pasta do projecto (ex.:
`/volume2/data-ssd/AppData/Awesome-Project-App` num NAS). Adequado para
deployment em Portainer:

1. Copiar a pasta para o caminho de `APP_BASE_PATH` no host.
2. **Stacks → Add stack** no Portainer.
3. Nome: `awesome-project-app`.
4. Upload do `docker-compose.yml`.
5. Carregar variáveis de ambiente (do `.env`).
6. **Deploy the stack**.

---

## Documentação interna

A pasta [`docs/claude/`](docs/claude/) contém documentação modular usada como
contexto para o assistente Claude Code (não versionada — ver `.gitignore`).
Inclui: arquitectura, auth, db, backend, frontend, i18n, timezone, permissões,
notificações, e overview/data-model/interactions/rendering por ferramenta
(gantt, board, calendar, timesheet, permissions). O ficheiro raiz `CLAUDE.md`
é a fonte de verdade das regras de projecto.

---

## Licença

Repositório privado — todos os direitos reservados.
