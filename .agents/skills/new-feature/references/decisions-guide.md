# Decisions Guide — new-feature skill (internal reference)

This file is read by the skill to decide which of the 11 checklist items apply
to a given feature, and whether to auto-apply or ask the user.

---

## Decision rules per checklist item

### 1. i18n (Internationalisation)

**Auto-apply** if: any mention of UI, page, modal, button, table, label, tooltip.
**Skip** if: purely backend change (migration, service refactor, endpoint rename).
**Ask** only: "Should this use a new i18n namespace or an existing one?"
- New namespace: feature is a standalone area (new page, new tool tab)
- Existing namespace: small addition to a feature that already has a namespace

Rules:
- Common keys (3+ pages): add to `common` namespace
- New page/tool: create new namespace file in `prisma/seeds/translations/`
- Register in `frontend/src/i18n/index.ts`

### 2. Permissions (project-scoped)

**Auto-apply** if: any of these keywords → "projecto", "tarefa", "task", "membro", "member", "recurso", "resource", "board", "calendar", "timesheet", "planning" — anything that lives inside a project.
**Skip** if: global platform management feature (users, plans, feature flags, platform config).
**Ask** only: "Which roles should have this by default? (CONTRIBUTOR, READER, or neither)"
- CONTRIBUTOR default: if it's a write action that team members typically do
- READER default: if it's read/view-only
- Neither (OWNER only): if it's admin-level project management
- Is it delegatable? Default yes for most actions; no for management actions (PERMISSIONS_MANAGE, PROJECT_DELETE)

Steps:
1. Add to `enum ProjectAction` in `backend/src/projects/project-permissions.ts`
2. Add to `DEFAULT_PERMISSIONS` (CONTRIBUTOR and/or READER)
3. Add to `DELEGATABLE_ACTIONS` if delegatable
4. Add to appropriate `ACTION_GROUPS` entry
5. Add i18n key `action.NEW_ACTION` to `permissions` namespace

### 3. Feature Flags

**Never auto-apply.** Always ask: "Should this feature be behind a feature flag?"
- Answer YES if: feature is monetizable, requires plan-based activation, or should be toggleable per user
- Answer NO if: core functionality, admin-only feature, or always-on enhancement

If yes:
- Add flag to `backend/prisma/seed.js` (upsert FeatureFlag)
- Backend: `@UseGuards(..., FeatureFlagGuard)` + `@RequireFeature('flag_key')`
- Frontend: `useFeatureFlag('flag_key')` to conditionally show UI
- PLATFORM_ADMIN always bypasses (never check flag for admin)

### 4. Plan Limits

**Ask** only if: feature involves creating/storing a countable resource (lists, records, uploads).
Signals: "criar", "adicionar", "novo X por projecto", "quantos X"
- If yes: `limitKey` naming convention: `max_xxx` (e.g., `max_projects`, `max_holidays`)
- Add to `backend/prisma/seed.js` plan limits
- Backend: `@UseGuards(..., PlanLimitGuard)` + `@CheckPlanLimit('max_xxx')`
- Update `LIMIT_KEYS` array in `frontend/src/pages/PlansPage.tsx`
- Value `-1` = unlimited

### 5. Database / Prisma Model

**Auto-apply** if: feature stores any persistent data.
**Infer automatically**:
- New standalone entity → new model (e.g., comments, tags, attachments)
- Attribute of existing entity → new field on existing model (e.g., adding `color` to `Project`)
- Association → new junction model or FK (e.g., tagging a task)

Every new model MUST have:
```prisma
id        Int     @id @default(autoincrement())
publicId  String  @unique @default(uuid(7))
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
status    Status  @default(ACTIVE)
```

After schema changes:
```bash
docker exec awesome-project-app-backend npx prisma migrate dev --name add_xxx
docker exec awesome-project-app-backend npx prisma generate
```

### 6. Backend / NestJS Module

**Auto-apply** if: feature has any data to expose or mutate via API.
**Infer automatically**:
- New standalone feature → new module (`src/xxx/xxx.module.ts`)
- Extension of existing feature → add methods to existing service/controller

Module structure: `XxxModule`, `XxxService`, `XxxController`.
Register in `app.module.ts` imports array.
Endpoint naming: always under `/api/projects/:id/xxx` for project-scoped, `/api/xxx` for global.

### 7. Authentication / Authorization

**Auto-apply** always (all routes need auth).
**Infer automatically**:
- If project-scoped → `@UseGuards(JwtAuthGuard, ProjectPermissionGuard)` + `@RequireProjectPermission()`
- If platform admin only → `@UseGuards(JwtAuthGuard, ProfilesGuard)` + `@RequireProfiles('PLATFORM_ADMIN')`
- If any authenticated user → `@UseGuards(JwtAuthGuard)` only

Never ask the user about this — infer from context.

### 8. Frontend / UI

**Auto-apply** if: any mention of interface, page, modal, button, list, table, form, config, panel.
**Infer automatically** (never ask):
- Data-fetching → create `useXxxData.ts` hook in `features/xxx/`
- Create/Edit operations → create `XxxModal.tsx` component
- List/table view → create `XxxTable.tsx` or `XxxList.tsx`
- Config panel → follow `BoardConfigPanel` pattern (offcanvas Bootstrap)
- New page → add route in `App.tsx`, add sidebar entry if needed

Mandatory patterns:
- Modals: `modal fade show d-block` + `modal-backdrop fade show`
- Date pickers: FlatPickr with `toFlatpickrFormat(dateFormat, withTime)`
- Selects: Choices.js
- Toasts: `showToast('success'|'danger'|'info'|'warning', msg)`

### 9. Architecture / Structure

**Infer automatically**:
- Significant new area (own data model, own endpoints, own UI pages) → new NestJS module + new `features/xxx/` folder
- Extension of existing area → add to existing module/folder
- New navigation item → add to sidebar in `AppLayout.tsx`, add route in `App.tsx`
- Phase update → update `docs/claude/architecture.md` phase table

Ask only: "Should this appear in the sidebar navigation?"

### 10. Date Format (project context)

**Auto-apply** if: feature displays or edits dates AND is inside a project context (PlanningPage, project modals).
**Skip** if: global pages (`/timesheets`, `/projects` listing, `/holidays`) — those use `formatDate(d)` directly.

Rules:
- Inside project context: `const dateFormat = useResolvedDateFormat()` + `formatDate(d, dateFormat)`
- FlatPickr inside project: `dateFormat: toFlatpickrFormat(dateFormat, withTime)` in dep array
- Global pages: `formatDate(d)` directly (falls back to `DEFAULT_DATE_FORMAT`)
- DHTMLX templates: use `dateFormatRef.current` pattern (closure-safe)

### 11. Deploy

**Always include.** Never ask. Auto-generate correct commands:

```
### Para aplicar estas alterações:
**Backend** (container `awesome-project-app-backend`):
[commands]

**Frontend** (container `awesome-project-app-frontend`):
[commands]
```

Restart needed only for: new npm packages, `vite.config.ts` changes, `main.ts` (backend) changes.
Otherwise: `npm run start:dev` (backend) and `npm run dev` (frontend) hot-reload automatically.

---

## Quick decision matrix

| Signal in description | Likely decisions needed |
|---|---|
| "nova página" | i18n (new ns), frontend (new page + route), architecture (sidebar?) |
| "criar/editar/eliminar X" | DB (new model), backend (CRUD endpoints), permissions (CREATE/EDIT/DELETE actions), i18n |
| "config de X" | DB (Config model, 3-level scope), backend (config endpoints), frontend (config panel/offcanvas) |
| "dentro do projecto" | permissions (project-scoped), auth (ProjectPermissionGuard) |
| "notificação / notificar" | notifications.md, new NotificationType enum value |
| "flag / activar por plano" | feature flags, possibly plan limits |
| "tab no Planning" | frontend (viewFrameStyle), PlanningPage changes |
| "aprovação / rejeição" | timesheet pattern reference, permissions (APPROVE action) |
| "calendário / datas" | date-formatting.md, FullCalendar or FlatPickr pattern |
