---
name: new-feature
description: >
  Use this skill when the user wants to implement a new feature, page, module, endpoint, UI component,
  or any significant addition to the Awesome-Project-App. Triggers on: "quero implementar", "criar funcionalidade",
  "nova feature", "new feature", "adicionar X ao projecto", "implement X", "build X", or any request to add
  something new to the application that requires code changes across multiple layers (backend/frontend/DB).
  Do NOT use for bug fixes, small tweaks to existing code, or documentation changes.
tools: Read, Glob, Grep, Write, Edit, Bash
argument-hint: <feature description>
---

# Skill: new-feature

You are acting as a senior full-stack architect for the **Awesome-Project-App** — a NestJS + React + PostgreSQL (Prisma) project management platform.

Your job is to guide the implementation of a new feature end-to-end, following the project's mandatory conventions, patterns, and architecture rules.

---

## HOW TO RUN THIS SKILL

### Step 1 — Understand the request

Read the feature description provided as argument (or the user's most recent message if no argument was given). Extract:
- What the feature does
- Which layers it touches (DB / backend / frontend / both)
- Whether it operates within a project context or globally

### Step 2 — Load relevant project docs

Based on what you inferred, read the appropriate doc files. Use **only** what's needed:

| If the feature... | Read |
|---|---|
| Has any UI | `docs/Codex/frontend.md`, `docs/Codex/i18n.md` |
| Persists data | `docs/Codex/db.md` |
| Exposes endpoints | `docs/Codex/backend.md` |
| Is project-scoped (tasks, members, etc.) | `docs/Codex/permissions.md` |
| Displays or edits dates | `docs/Codex/date-formatting.md` |
| Sends notifications | `docs/Codex/notifications.md` |
| Adds a new tab to PlanningPage | `docs/Codex/frontend.md` + `docs/Codex/tools/gantt/overview.md` for visual frame rules |
| Has a configuration system | `docs/Codex/tools/gantt/overview.md` §GanttConfig as pattern |

Also load the reference files in this skill:
- `references/decisions-guide.md` — to understand how to infer decisions automatically
- `references/code-templates.md` — to use as starting templates for generated code

### Step 3 — Explore existing code for analogous patterns

Use Grep and Read to find existing implementations similar to what's being requested. This ensures the generated code matches the codebase's real style, not just the docs.

Examples:
- New project-scoped module → Read `backend/src/calendar/calendar.module.ts` and `backend/src/calendar/calendar.service.ts` (first 60 lines each) as reference
- New frontend feature with data hook → Read `frontend/src/features/calendar/useCalendarData.ts` (first 80 lines)
- New Prisma model → Check `backend/prisma/schema.prisma` for the last few models added to understand convention
- New permissions → Read `backend/src/projects/project-permissions.ts` (full file — it's the source of truth)
- New i18n namespace → Check `frontend/src/i18n/index.ts` to see the current namespace list

### Step 4 — Apply decisions-guide.md to infer what applies

Read `references/decisions-guide.md` and for each of the 11 checklist items, determine:
- **Auto-apply**: apply this without asking (confidence is high from context)
- **Ask**: present your inference and ask for confirmation
- **Skip**: clearly doesn't apply to this feature

### Step 5 — Present a concise summary + ask only unresolved questions

Show the user a compact table of what you've inferred automatically, and ask **only** the questions you couldn't resolve. Format:

```
**Inferred automatically:**
✓ i18n — new namespace: `xxx` (4 locales)
✓ DB — new Prisma model: `XxxModel`
✓ Backend — NestJS module `xxx`, endpoints: GET/POST/PATCH/DELETE /api/projects/:id/xxx
✓ Permissions — new ProjectActions: XXX_CREATE, XXX_EDIT, XXX_DELETE (CONTRIBUTOR default)
✓ Auth — project-scoped, JWT + ProjectPermissionGuard
✓ Frontend — hook `useXxxData`, modal `XxxModal`
✓ Date format — uses `useResolvedDateFormat()` (project context)
✗ Deploy — always included at end

**I need your decision on:**
1. Should this be behind a feature flag?
2. Does it need a plan limit (e.g., max_xxx per project)?
```

Wait for the user's answers before generating code.

### Step 6 — Generate all files

With all decisions confirmed, generate **complete, working code** for every file that needs to change or be created. Use `references/code-templates.md` as starting templates, adapting them to the specific feature.

Files to generate (as applicable):

**Backend:**
- `backend/prisma/schema.prisma` — model additions (show the diff/additions only)
- `backend/src/xxx/xxx.module.ts`
- `backend/src/xxx/xxx.service.ts`
- `backend/src/xxx/xxx.controller.ts`
- `backend/src/xxx/dto/create-xxx.dto.ts`, `update-xxx.dto.ts`
- Changes to `backend/src/app.module.ts` — register the new module
- Changes to `backend/src/projects/project-permissions.ts` — new ProjectActions (if project-scoped)
- Changes to `backend/prisma/seed.js` — if feature flag or new plan limits

**Frontend:**
- `frontend/src/features/xxx/types.ts`
- `frontend/src/features/xxx/useXxxData.ts`
- `frontend/src/features/xxx/components/XxxModal.tsx` (if modal needed)
- Changes to `frontend/src/i18n/index.ts` — register namespace
- `backend/prisma/seeds/translations/xxx.json` — all 4 locales

**Migration note:** Never generate migration SQL. Instead, include the command:
```bash
docker exec awesome-project-app-backend npx prisma migrate dev --name add_xxx_model
docker exec awesome-project-app-backend npx prisma generate
```

### Step 7 — Always end with deploy instructions

Every response from this skill **must** end with:

```
### Para aplicar estas alterações:
**Backend** (container `awesome-project-app-backend`):
<commands>

**Frontend** (container `awesome-project-app-frontend`):
<commands>
```

---

## INVARIANT RULES — Never violate these

These rules apply to every feature, no exceptions:

**Backend:**
- Every route that mutates project data: `@UseGuards(JwtAuthGuard, ProjectPermissionGuard)` + `@RequireProjectPermission(ProjectAction.XXX)`
- Never expose `id` (numeric) in API responses — always `publicId` (UUID v7)
- Soft delete only: `status: INACTIVE`. Never `prisma.model.delete()`
- Every DTO uses `class-validator`. Every param uses `ParseUUIDPipe`
- Service always resolves `publicId → internal id` at the start of each method
- New module must be registered in `app.module.ts`
- Notifications are always fire-and-forget: `.catch(() => {})`

**Frontend:**
- No hardcoded text in JSX. All visible strings use `t()` or `tc()`
- No `alert()` — use `showToast('danger', msg)`
- No hardcoded date formats — use `formatDate(d, dateFormat)` with `useResolvedDateFormat()`
- New tab in PlanningPage: wrap with `<div style={viewFrameStyle(pageTab === 'xxx')}>`
- Never absolute URLs — use `getApiBase()` which returns `/api`
- All authenticated fetch calls: `Authorization: Bearer ${token}`

**DB:**
- Every model: `id`, `publicId @unique @default(uuid(7))`, `createdAt`, `updatedAt`, `status Status @default(ACTIVE)`
- `publicId` is UUID v7, generated by Prisma automatically
- Migrations must be safe for existing data (no destructive column removals)

**i18n:**
- 4 locales always: `en`, `es`, `pt-BR`, `pt-PT`
- Run `docker exec awesome-project-app-backend npm run seed` after adding translations
- Namespace registered in `frontend/src/i18n/index.ts`

**Deploy:**
- Restart container only when: new npm deps, `vite.config.ts` changed, or `main.ts` (backend) changed
- Hot reload applies for all `.ts`, `.tsx`, `.prisma` (after generate) changes
