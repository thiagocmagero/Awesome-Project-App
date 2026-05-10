# Claude: carregar para qualquer tarefa de Audit Logs

## O que é

Audit trail técnico/de segurança transversal a toda a API. Cada chamada
HTTP é registada automaticamente em `AuditLog` pelo
`AuditLogInterceptor` global — sem código nos controllers. Endpoints
mutating (`@Post`/`@Patch`/`@Put`/`@Delete`) enriquecem o log com
semântica (`action`, `resourceType`, `resourceId`) via decorator
`@Audit({ ... })`.

Visível apenas a `PLATFORM_ADMIN` em duas superfícies:
- **`/audit`** — página dedicada com todos os logs da plataforma.
- **`/clients`** → modal "Ver detalhes" → tab **"Audit"** — logs
  filtrados pelo cliente em causa.

> **Distinto** de `TimesheetApprovalLog` (audit funcional do timesheet,
> existente). Distinto também de `SessionActivityInterceptor` (toca
> `Session.lastUsedAt`). É um **terceiro** mecanismo, complementar.

## Modelo Prisma

```prisma
enum AuditLogStatus { SUCCESS  ERROR  FORBIDDEN }

model AuditLog {
  id            Int             @id @default(autoincrement())
  publicId      String          @unique @default(uuid(7))
  userId        Int?            // SetNull (audit field)
  user          User?           @relation(..., onDelete: SetNull)
  sessionId     Int?            // SetNull
  session       Session?        @relation(..., onDelete: SetNull)
  method        String          @db.VarChar(10)
  url           String          @db.VarChar(2000)
  statusCode    Int
  duration      Int             // ms
  ip            String?         @db.VarChar(45)
  userAgent     String?         @db.VarChar(500)
  action        String?         @db.VarChar(100)
  resourceType  String?         @db.VarChar(50)
  resourceId    String?         @db.VarChar(100)
  status        AuditLogStatus
  errorMessage  String?         @db.VarChar(1000)
  createdAt     DateTime        @default(now()) @db.Timestamptz(6)  // MOMENTO REAL

  @@index([userId, createdAt])
  @@index([createdAt])
  @@index([action])
  @@index([resourceType, resourceId])
  @@index([statusCode])
  @@index([status])
}
```

Política `onDelete`: cumpre a regra "User cascade rule"
(@docs/claude/db.md). `userId`/`sessionId` são audit fields → `SetNull`
(história sobrevive a hard delete do user / revogação da sessão).

`createdAt` é **MOMENTO REAL** (regra timezone) → `Timestamptz(6)`,
formatado com `formatMoment(d, tz)` no frontend.

## Mapeamento `status`

| Resposta | `status` |
|---|---|
| `statusCode < 400` | `SUCCESS` |
| `statusCode === 401` ou `403` | `FORBIDDEN` |
| `statusCode >= 400` (resto) | `ERROR` |

## Módulo backend — `backend/src/audit-log/`

```
audit-log/
├── audit-log.module.ts        @Global, exporta AuditLogService
├── audit-log.service.ts       create() + findAll() + findByClient()
├── audit-log.controller.ts    /audit-logs + /audit-logs/by-client/:clientId
├── audit-log.interceptor.ts   APP_INTERCEPTOR global
├── audit-log.types.ts         filtros + paginação types
├── dto/
│   ├── audit-log-query.dto.ts     query params (class-validator)
│   └── audit-log-response.dto.ts  response (sem id Int, sem sessionId Int)
└── decorators/
    └── audit.decorator.ts     @Audit({ action, resourceType, resourceId? })
```

`AuditLogModule` é `@Global()`. Registado em
[app.module.ts](backend/src/app.module.ts) como `AuditLogInterceptor`
**depois** do `SessionActivityInterceptor` (a ordem dos `APP_INTERCEPTOR`
é a de declaração; queremos `req.user` já populado pelo `JwtAuthGuard`).

## Pipeline do interceptor

```
Request HTTP
   │
   ▼
JwtAuthGuard popula `req.user = { sub, email, profileCode, sid?, internalSessionId }`
   │
   ▼
SessionActivityInterceptor (touch Session.lastUsedAt)
   │
   ▼
AuditLogInterceptor:
   ├─ shouldSkip? early return
   │   • /api/v1/hello (health)
   │   • /api/v1/audit-logs* (anti-loop)
   │   • /api/v1/auth/refresh (ruidoso, throttled, sem valor de audit)
   │   • /assets/*
   │
   ├─ Reflector.getAllAndOverride(AUDIT_KEY, [handler, class]) → meta?
   │
   ├─ next.handle().pipe(
   │     tap(()  => write(req, res, start, meta, null)),     ← SUCCESS path
   │     catchError(err => { write(...meta, err); throw }),  ← ERROR path
   │   )
   │
   └─ write(...): try/catch silencioso →
       AuditLogService.create({...})  ← fire-and-forget (.catch interno)
```

**Regras críticas (NUNCA bloquear o request):**
- `try/catch` silencioso em `write()`.
- `void this.auditLogService.create(...)` — sem await dentro do `tap()`.
- `service.create()` tem o seu try/catch + `logger.warn` se falhar.

## Sanitização

- `url`: query params com `token`/`password`/`secret`/`api[_-]?key` mascarados como `***`. Truncado a 2000 chars.
- `userAgent`: truncado a 500 chars.
- `errorMessage`: extracto do `error_code` (canónico em `AppException`),
  fallback para `message` do body, fallback para `err.message`. Truncado a 1000.
- `ip`: extraído de `x-forwarded-for` (1º elemento) ou `req.ip`. Truncado a 45 chars (IPv6 max).
- `resourceId`: limitado a 100 chars; se o resolver devolve array (Express
  wildcard params) toma o 1º elemento.

## Decorator `@Audit`

```typescript
import { Audit } from '../audit-log/decorators/audit.decorator';

@Audit({
  action: 'PROJECT_DELETED',
  resourceType: 'project',
  resourceId: (req) => req.params.id,   // resolver dinâmico
})
@Delete(':id')
remove(@Param('id') id: string) { ... }
```

`resourceId` aceita:
- `string` literal (raro — geralmente é dinâmico),
- `(req: Request) => string | string[] | null | undefined` — função
  pura. Se rebenta, é silenciosamente ignorada e o log fica sem
  `resourceId`.

**Convenção `action`**: `SCREAMING_SNAKE_CASE`, verbo no passado (foi feita).
Exemplos: `USER_LOGIN`, `USER_LOGOUT`, `USER_REGISTERED`, `USER_CREATED`,
`USER_UPDATED`, `USER_DELETED`, `PASSWORD_RESET`, `PROJECT_CREATED`,
`PROJECT_UPDATED`, `PROJECT_DELETED`.

**Convenção `resourceType`**: substantivo singular minúsculo. Exemplos:
`user`, `session`, `project`, `task`, `file`.

**Convenção `resourceId`**: sempre `publicId` UUID v7 do recurso (nunca
`id` Int).

## Endpoints

Ambos `@UseGuards(JwtAuthGuard, ProfilesGuard) @RequireProfiles('PLATFORM_ADMIN')`.
Excluídos do auto-log para evitar loop (admin a consultar logs gera logs).

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/v1/audit-logs` | Todos os logs com filtros + paginação |
| GET | `/api/v1/audit-logs/by-client/:clientId` | Logs do cliente (`clientId` = User.publicId) |

### Query params

Todos opcionais.

| Param | Tipo | Notas |
|---|---|---|
| `userId` | UUID v7 (publicId) | Resolvido para `id` interno no service. **Não usado** em `by-client` (path param já fixa). |
| `action` | string | Match exacto |
| `status` | `SUCCESS`\|`ERROR`\|`FORBIDDEN` | |
| `method` | `GET`\|`POST`\|`PUT`\|`PATCH`\|`DELETE` | |
| `url` | string | `contains` case-insensitive |
| `ip` | string | Match exacto |
| `resourceType` | string | Match exacto |
| `resourceId` | string (UUID) | Match exacto |
| `statusCode` | int 100..599 | Match exacto |
| `startDate` | ISO 8601 | `createdAt >= startDate` |
| `endDate` | ISO 8601 | `createdAt <= endDate` |
| `page` | int >= 1 | Default 1 |
| `limit` | int 1..100 | Default 10 |

### Response

```json
{
  "data": [
    {
      "publicId": "01...",
      "user": { "publicId": "...", "name": "...", "email": "..." } | null,
      "method": "POST",
      "url": "/api/v1/projects/.../delete",
      "statusCode": 200,
      "duration": 47,
      "ip": "203.0.113.5",
      "userAgent": "Mozilla/5.0 ...",
      "action": "PROJECT_DELETED",
      "resourceType": "project",
      "resourceId": "01...",
      "status": "SUCCESS",
      "errorMessage": null,
      "createdAt": "2026-05-10T22:40:23.120Z"
    }
  ],
  "meta": { "total": 1234, "page": 1, "limit": 10, "totalPages": 124 }
}
```

> **Nunca expostos**: `id` numérico interno, `sessionId` numérico, ownership
> oculta. Apenas `publicId` UUID v7.

## Frontend

```
frontend/src/features/audit/
├── types.ts                              tipos + EMPTY_FILTERS + HTTP_METHODS
├── useAuditLogs.ts                       hook com state + paginação + filtros
└── components/
    └── AuditLogTable.tsx                 painel filtros + tabela + paginação
frontend/src/pages/AuditPage.tsx          página /audit (admin only)
```

`useAuditLogs({ endpoint, defaultLimit })`:
- `endpoint` é absoluto sem prefixo `/api/v1` (ex.: `/audit-logs`,
  `/audit-logs/by-client/{publicId}`).
- Mantém estado separado: `draftFilters` (input) vs `filters` (aplicados).
- `applyFilters()` reseta `page` para 1.
- `clearFilters()` reseta drafts + applied + page=1.
- `setLimit(n)` reseta `page` para 1.
- Race-safe: cada fetch incrementa `reqIdRef`; respostas obsoletas são
  descartadas.

`<AuditLogTable endpoint pageSizeOptions hideUserFilter hideFiltersTitle />`
é totalmente reusável — usado em:
- `/audit` → `endpoint="/audit-logs"`, `pageSizeOptions=[10,20,30,50,100]`.
- ClientsPage modal → `endpoint=/audit-logs/by-client/{publicId}`,
  `pageSizeOptions=[10,20,30]`, `hideUserFilter`, `hideFiltersTitle`.
  Wrap com `key={detailClient.publicId}` para forçar re-mount limpo
  quando o cliente seleccionado muda.

`createdAt` formatado com `formatMoment(iso, tz)` (regra timezone:
MOMENTO REAL → tz do user via `useTimezone()`).

## Sidebar

`/audit` na secção **"Plataforma"** do sidebar
([AppLayout.tsx](frontend/src/components/AppLayout.tsx)), gated por
`useIsPlatformAdmin()`.

## Page gating

`ProtectedRoute` aceita `BASIC_USER` também — `AuditPage` faz gate
defensivo extra via `useIsPlatformAdmin()` + `navigate('/', { replace })`
quando `user` está carregado mas `!isAdmin`.

## Performance

- 6 índices cobrem os filtros principais (`createdAt`, `action`,
  `(resourceType, resourceId)`, `statusCode`, `status`,
  `(userId, createdAt)`). Sem `LIKE %x%` em campos não indexados (apenas
  `url` usa `contains`, e há filtros adicionais para reduzir o universo).
- `count()` paralelizado com `findMany()` via `prisma.$transaction([...])`.
- Limite máximo `limit=100` (clamp no service).
- Nenhum `include` excessivo — apenas `user.publicId/name/email`.

## i18n

- Namespace `audit` em `backend/prisma/seeds/translations/audit.json`
  (4 locales: en, es, pt-BR, pt-PT).
- Chaves principais: `page.title/subtitle`, `tab.summary/audit`,
  `filters.*`, `table.col.*`, `status.success/error/forbidden`,
  `pagination.*`, `errors.load`.
- `nav.audit` adicionado a `common` (sidebar).
- Registado em [`frontend/src/i18n/index.ts`](frontend/src/i18n/index.ts).

## Anti-padrões

- ❌ `await this.auditLogService.create(...)` no interceptor — bloqueia
  o request se o BD estiver lento. Sempre `void` + fire-and-forget.
- ❌ Throw a partir do interceptor — auditing nunca pode propagar erro
  ao caller. `try/catch` silencioso obrigatório.
- ❌ Logar passwords / tokens em `url` — sanitizador remove `?token=...`,
  mas se acrescentares novos params sensíveis no futuro, **adicionar
  ao regex** em `sanitizeUrl()`.
- ❌ `@Audit` sem `action` — campo obrigatório (TS reforça).
- ❌ `resourceId: (req) => req.body.id` — body já foi parsed e validado;
  mas `req.params.id` é mais fiável e canónico para REST.
- ❌ Apagar entries de `AuditLog` sem retenção definida — entries são
  imutáveis. Quando a retenção for definida, deve ser via job batch,
  nunca por endpoint do user.
- ❌ Adicionar endpoint `/audit-logs/...` sem o registar nos
  `SKIPPED_PREFIXES` do interceptor — gera loop (admin pede logs → cria
  log → … infinito do ponto de vista do storage).
- ❌ Expor `id` Int no `AuditLogResponseDto` — só `publicId`.
- ❌ Filtrar por `userId` Int no controller — controller aceita
  publicId UUID, service resolve para `id`.
- ❌ Permitir `limit` arbitrariamente alto — clamp [1, 100] no service
  (defesa em profundidade além do `@Max(100)` do DTO).
- ❌ Esquecer de adicionar `@Audit({...})` num endpoint mutating novo.
  O auto-log captura, mas perde-se semântica (`action` nulo).

# Relacionados: @docs/claude/auth.md @docs/claude/permissions.md @docs/claude/db.md @docs/claude/timezone.md @docs/claude/backend.md @docs/claude/frontend.md
