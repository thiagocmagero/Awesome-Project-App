# Claude: carregar para qualquer tarefa do mecanismo de Upload de Ficheiros

## O que é

Sistema de upload e gestão de ficheiros project-scoped. Bytes guardados em
**bucket privado AWS S3** (`awesomeproject-dev`); acesso só via presigned
URL com TTL curto. Ficheiros podem ser anexados a uma tarefa (`Task`)
ou ao próprio projecto (project-level, sem task).

Gated por feature flag `upload`. Sub-flag `upload_secured` activa scan AWS
GuardDuty Malware Protection — escolhida no momento do upload com base no
plano do **dono do projecto** (não do uploader).

> Para o wrapper genérico AWS S3 (env vars, `StorageService`, avatares), ver
> @docs/claude/storage.md. Este documento cobre apenas o feature de uploads
> de ficheiros project-scoped.

## Feature flags

| Key | Pai | Default | Descrição |
|---|---|---|---|
| `upload` | — | inactivo | Acesso à funcionalidade de uploads |
| `upload_secured` | `upload` | inactivo | Path `uploads/secured/` + scan GuardDuty |

**Resolução owner-aware** — chave da spec colaborativa:

- **Frontend** usa `useFeatureFlag('upload', projectPublicId)` (resolução
  context-aware via Subscription/seats — LICENSED member herda owner's plan).
- **Backend** `FilesService.upload` resolve `project.ownerId` e chama
  `featureFlagsService.isEnabledForUser(ownerId, 'upload_secured')`. O
  membro nunca decide; o owner do projecto dita se uploads ali são scanned.

Ficheiros antigos **não migram** quando o plano muda. Apenas novos uploads
seguem a regra activa no momento do upload.

## Modelo de dados

### Enum `FileScanStatus`

```prisma
enum FileScanStatus {
  PENDING    // path secured, à espera de GuardDuty
  CLEAN      // sem ameaças (escudo verde)
  INFECTED   // bloqueado, bytes removidos do bucket (audit preservado)
}
```

### Modelo `File`

```prisma
model File {
  id            Int             @id @default(autoincrement())
  publicId      String          @unique @default(uuid(7))
  bucketKey     String          @unique         // path opaco, imutável
  isSecuredPath Boolean         @default(false) // espelha prefixo uploads/secured/
  originalName  String          // nome humano (renomeável)
  mimeType      String          // detectado por magic bytes
  sizeBytes     Int
  projectId     Int             // CASCADE: apagar projecto remove files
  taskId        Int?            // SetNull: apagar task converte para project-level
  uploadedById  Int?            // SetNull: authorship sobrevive a delete do user
  scanStatus    FileScanStatus?
  status        Status          @default(ACTIVE)  // soft delete
  createdAt     DateTime        @default(now()) @db.Timestamptz(6)
  updatedAt     DateTime        @updatedAt @db.Timestamptz(6)

  @@index([projectId, status])
  @@index([taskId, status])
  @@index([uploadedById])
}
```

> **`scanStatus` semantics**:
> - `null` → ficheiro fora do path secured, **sem escudo no UI**
> - `PENDING` → escudo cinza pulsante "A verificar..."
> - `CLEAN` → escudo verde "Verificado"
> - `INFECTED` → bytes apagados do bucket, registo preservado, download
>   bloqueado (403 `FILE_INFECTED_BLOCKED`)

### `PlatformLimits` — extensões para uploads

```prisma
model PlatformLimits {
  // ...
  maxUploadSizeMb       Int   @default(50)        // cap absoluto da plataforma
  allowedMimeTypes      Json  @default("[]")      // string[], allowlist MIME
  allowedFileExtensions Json  @default("[]")      // string[], allowlist extensão
}
```

**Defaults seeded** (35 MIMEs / 35 extensões), editáveis pelo PLATFORM_ADMIN
em `/settings/limits`:

- **Documentos**: `pdf, doc, docx, xls, xlsx, ppt, pptx, odt, ods, odp, rtf`
- **Imagens**: `png, jpg, webp, gif, bmp, tiff, ico, avif, heic`
- **Áudio**: `mp3, m4a, wav, ogg, flac`
- **Vídeo**: `mp4, webm, mov, mkv, avi`
- **Arquivos**: `zip, 7z, rar, tar, gz`

> **Nota**: o `file-type` lib detecta apenas formatos com magic bytes. Plain
> text (`txt`/`csv`/`md`/`json`/`html`) não é detectável e fica fora dos
> defaults. SVG é deliberadamente excluído (XSS via `<script>` embebido).
> Executáveis (`exe`/`dll`/`bat`/`sh`/`jar`/`apk`) ficam fora por segurança.

## Path conventions

Bucket privado `awesomeproject-dev`. **Leaf** sempre opaco — UUID v4 random
sem informação que indique propriedade. **Hierarquia** espelha a do browser
URL (`/<wsId>/projects/:id/...`) para audit + batch cleanup eficientes.

```
Normal task-level:     uploads/workspaces/{workspacePublicId}/projects/{projectPublicId}/tasks/{taskPublicId}/{uuid}.{ext}
Normal project-level:  uploads/workspaces/{workspacePublicId}/projects/{projectPublicId}/_root/{uuid}.{ext}
Secured task-level:    uploads/secured/workspaces/{workspacePublicId}/projects/{projectPublicId}/tasks/{taskPublicId}/{uuid}.{ext}
Secured project-level: uploads/secured/workspaces/{workspacePublicId}/projects/{projectPublicId}/_root/{uuid}.{ext}
```

A escolha entre normal/secured é fixada **no momento do upload** com base
na flag `upload_secured` do owner. Replace mantém o path actual (não migra
quando a flag muda).

GuardDuty observa apenas o prefixo `uploads/secured/` — uploads normais
não geram custos de scan. O segmento `workspaces/{wsId}/` é interno a esse
prefixo e não afecta a configuração SNS.

**Files legacy** (uploads antes da introdução de workspace) mantêm o formato
antigo `uploads/projects/{projectId}/...`. O `bucketKey` em DB é a fonte de
verdade para downloads — não há migração de paths em massa. Replace de um
ficheiro legacy preserva o formato antigo (apenas o leaf UUID muda).

**Workspace orphan** (`Project.workspaceId === null`, raro): segmento
`_unknown` substitui o `workspacePublicId` no path, preservando uniqueness e
listing-friendliness.

## Permissões — `ProjectAction`

4 acções em `backend/src/projects/project-permissions.ts`:

| Acção | OWNER | CONTRIBUTOR | READER | Delegável |
|---|:-:|:-:|:-:|:-:|
| `FILE_VIEW` | ✓ | ✓ | ✓ | — (segue padrão de PROJECT_VIEW) |
| `FILE_UPLOAD` | ✓ | ✓ | — | ✓ (delegável a READER) |
| `FILE_RENAME` | ✓ | ✓ | — | ✓ |
| `FILE_DELETE` | ✓ | — | — | ✓ |

Group em `ACTION_GROUPS`: `key: 'files'`, `labelKey: 'group.files'`.

`FILE_DELETE` default só OWNER por desenho — eliminação irreversível de
bytes em mãos do owner; delegável.

## Plan limits

EAV em `PlanLimit` — 2 chaves novas + 1 reutilizada:

| `limitKey` | Significado | Tracking |
|---|---|---|
| `max_uploads_count` | Total de ficheiros activos do owner em todos os projectos owned | Real count via `prisma.file.count` em `UsageService.countReal` |
| `max_upload_size_mb` | Tamanho máximo por ficheiro (`-1` = só limitado pelo PlatformLimits) | Check-only no upload, sem contador |
| `max_storage_mb` | Total agregado de MB ocupados | `UsageRecord` counter, sync via `incrementBy`/`decrementBy`/`adjustBy` |

Quota cobrada **sempre no plano do dono do projecto** — `@CheckPlanLimit('max_uploads_count', { projectIdFrom: 'params.id' })` no controller resolve owner via `resolveEffectiveOwnerId`.

## Pipeline de upload

```
Cliente (multipart/form-data, campo `file`)
   │
   ▼
Multer (memoryStorage, hard-cap MULTER_MAX_BYTES = 2 GB)
   │ Buffer + file.originalname (raw, ainda em Latin-1)
   ▼
@RequireFeature('upload', { projectIdFrom: 'params.id' })
   │
   ▼
@CheckPlanLimit('max_uploads_count', { projectIdFrom: 'params.id' })
   │
   ▼
@RequireProjectPermission(FILE_UPLOAD)
   │
   ▼
FilesService.upload(projectPublicId, requestingUserId, file, dto)
   │
   ├── decodeMultipartFilename(file.originalname)
   │   └── Latin-1 → UTF-8 round-trip via TextDecoder fatal=true.
   │       Skip ASCII puro. Fallback para original se UTF-8 inválido.
   │
   ├── platformConfig.getMaxUploadBytes() → 413 se exceder
   │
   ├── detectAndValidateMime(buffer, originalName)
   │   ├── file-type magic bytes (rejeita SVG, executáveis disfarçados)
   │   ├── platformConfig.getAllowedMimeTypes() → 415 com {mime, allowed_mimes[]}
   │   └── platformConfig.getAllowedFileExtensions() → 415 com {extension, allowed_extensions[]}
   │
   ├── Resolve task se taskPublicId fornecido (assert task ∈ project)
   │
   ├── featureFlags.isEnabledForUser(project.ownerId, 'upload_secured')
   │
   ├── buildBucketKey({ isSecured, projectPublicId, taskPublicId, ext })
   │   └── UUID v4 random + ext canónica do file-type
   │
   ├── storage.putPrivateObject(key, buffer, contentType)
   │   └── S3-first; se DB falhar a seguir, cleanup do object
   │
   ├── prisma.file.create({ ... scanStatus: isSecured ? PENDING : null })
   │
   └── usage.increment(ownerId, 'max_uploads_count')
       usage.incrementBy(ownerId, 'max_storage_mb', sizeMb)
```

### Replace — `POST /api/projects/:id/files/:fileId/replace`

Substitui bytes mantendo o `publicId`:
- Mesmo `publicId`, novo `bucketKey` (UUID novo).
- Mantém `isSecuredPath` actual — não migra entre normal/secured se a flag
  do owner mudou desde o upload original.
- Apaga o key antigo best-effort após PUT do novo.
- Re-valida MIME + extensão + tamanho.
- Se `isSecuredPath === true` → `scanStatus = PENDING` (conteúdo é novo,
  scan tem que correr outra vez).
- Ajusta storage usage pelo delta de bytes (pode ser negativo).

### Erros — formato canónico com contexto

`AppException` propaga campos extra no body para o frontend interpolar nas
mensagens i18n:

| `error_code` | Status | Contexto |
|---|---|---|
| `FILE_TOO_LARGE_PLATFORM` | 413 | `{ size_mb, max_mb }` |
| `MIME_NOT_ALLOWED` | 415 | `{ mime, allowed_mimes[] }` |
| `EXTENSION_NOT_ALLOWED` | 415 | `{ extension, allowed_extensions[] }` |
| `UNRECOGNIZED_FILE_TYPE` | 400 | `{ extension }` (do filename) |
| `FILE_INFECTED_BLOCKED` | 403 | — |
| `FILE_NOT_FOUND` | 404 | — |
| `FILE_MISSING` | 400 | — |
| `STORAGE_NOT_READY` | 503 | — |

Mensagem final no toast (i18n): `Ficheiros com extensão .exe não são permitidos. Extensões aceites: pdf, png, jpg, ...`

## Filename UTF-8 — fix do default Multer

Multer (via busboy) descodifica o `filename` do multipart como **Latin-1
por defeito**. Os browsers enviam UTF-8 → `ç` (UTF-8: `0xC3 0xA7`) lido
como Latin-1 vira `Ã§`.

`FilesService.decodeMultipartFilename(name)`:

```typescript
private decodeMultipartFilename(name: string): string {
  if (!name) return name;
  if (/^[ -]*$/.test(name)) return name;       // ASCII puro, skip
  try {
    return new TextDecoder('utf-8', { fatal: true })
      .decode(Buffer.from(name, 'latin1'));
  } catch {
    return name;                                           // já estava bem
  }
}
```

Heurística `TextDecoder({ fatal: true })` distingue automaticamente:

| Input | Bytes Latin-1 | UTF-8 válido? | Output |
|---|---|---|---|
| `report.pdf` (ASCII) | — (skip fast-path) | — | `report.pdf` ✓ |
| `Aplicações.docx` (já UTF-8) | byte 0xE7, 0xF5 isolados | ❌ | `Aplicações.docx` (mantém) ✓ |
| `AplicaÃ§Ãµes.docx` (mangled) | `0xC3 0xA7`, `0xC3 0xB5` | ✓ | `Aplicações.docx` ✓ |

Aplicado no início de `upload()` e `replace()`. O nome corrigido propaga
para `originalName` em DB e para os erros (`UNRECOGNIZED_FILE_TYPE.extension`
usa o filename corrigido).

## Download — presigned URL com nome humano

`StorageService.getSignedDownloadUrl(key, ttl=900s, originalName?)`:

- Default TTL 15 min.
- Quando `originalName` é passado, injecta `ResponseContentDisposition` no
  presigned:
  ```
  attachment; filename*=UTF-8''<percent-encoded-name>
  ```
- O bucket key continua opaco (UUID hash). O browser faz download com o
  nome original guardado em `File.originalName`.
- Strip de control chars (` -`) defensivo contra CRLF
  injection no header (`buildContentDisposition` helper privado).

`FilesService.getDownloadUrl` passa sempre `file.originalName`.
`scanStatus === INFECTED` → 403 `FILE_INFECTED_BLOCKED` antes de gerar URL.

## GuardDuty — webhook flow

```
GuardDuty Malware Protection (scan async, prefixo uploads/secured/)
   │
   ▼
EventBridge rule (aws.guardduty + "GuardDuty Malware Protection Object Scan Result")
   │
   ▼
SNS Topic
   │
   ▼ HTTPS subscription
POST /api/webhooks/guardduty   (público, @SkipCsrf, sem JWT)
   │
   ├── verifySnsSignature(body)
   │   ├── SigningCertURL matches /^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\/.+\.pem$/
   │   ├── Cert cacheado 24h em memória
   │   └── createVerify('SHA256').verify(cert, signature, 'base64')
   │
   ├── Type === 'SubscriptionConfirmation' → fetch SubscribeURL (one-time, idempotente)
   │
   └── Type === 'Notification':
       parseGuardDutyVerdict(message.Message)
       └── { bucketKey, verdict: 'CLEAN' | 'INFECTED' }
           │
           ▼
       FilesService.recordScanResult(bucketKey, verdict)
           │
           ├── verdict === INFECTED:
           │   ├── storage.deletePrivateObject(key)               ← apaga bytes
           │   ├── prisma.file.update({ scanStatus: INFECTED })   ← preserva audit
           │   └── notifications.createFileInfectedNotification(uploaderId, ...)
           │       └── fan-out IN_APP + EMAIL
           │
           └── verdict === CLEAN:
               └── prisma.file.update({ scanStatus: CLEAN })
```

**Idempotente** — `recordScanResult` faz no-op se `file.scanStatus === verdict`
já. Múltiplos events para o mesmo bucketKey não criam duplicados nem re-disparam
notificações.

Implementação SNS verifier em `backend/src/files/guardduty-sns-verifier.ts` —
sem dependência externa (`aws-sns-validator` está unmaintained), baseado em
`crypto.createVerify`. Aceita `Notification`, `SubscriptionConfirmation`, e
`UnsubscribeConfirmation`; rejeita silenciosamente outros types.

Resposta sempre 200 — SNS reentrega via outras vias se há problema; melhor
logar e ack do que reentregar payloads malformados em loop.

## Notifications + Email

Novo `NotificationType.FILE_INFECTED`:

- Disparado pelo `FilesService.recordScanResult` quando GuardDuty devolve
  `INFECTED`.
- Destinatário: o uploader (`File.uploadedById`).
- Fan-out IN_APP (registo `Notification`) + EMAIL
  (`emailService.sendFileInfectedEmail` → template
  `backend/src/emails/templates/file-infected.email.tsx`).
- Fire-and-forget; ambos os canais com `.catch(() => {})`.
- **Sem CTA** — informativo de segurança, não há acção do user a tomar
  (bytes já foram apagados do bucket).

Ver @docs/claude/notifications.md e @docs/claude/email.md para os patterns
gerais de criação de notificações.

## Endpoints REST

> **Convenção obrigatória de IDs**: `:id` no path = `projectPublicId`,
> `:fileId` = `File.publicId`, `taskPublicId` no body/query = `Task.publicId`.
> **Nunca** trafega `id` numérico interno. `bucketKey` também **nunca** é
> exposto pela API — apenas via presigned URL gerada em `/download`.

### Project-scoped — `/api/projects/:id/files`

Todos com `JwtAuthGuard + FeatureFlagGuard + ProjectPermissionGuard` +
`@RequireFeature('upload', { projectIdFrom: 'params.id' })`:

| Método | Rota | Permission | Descrição |
|---|---|---|---|
| GET | `/?taskPublicId=&scope=` | `FILE_VIEW` | Lista. `taskPublicId=UUID` filtra por task; `scope=project` só os _root |
| POST | `/` | `FILE_UPLOAD` + `@CheckPlanLimit('max_uploads_count')` | Multipart upload. Body inclui `taskPublicId?` (omitir = project-level) |
| POST | `/:fileId/replace` | `FILE_RENAME` | Multipart — substitui bytes mantendo `publicId` |
| GET | `/:fileId/download` | `FILE_VIEW` | `{ url, expiresAt }`. 403 se INFECTED |
| PATCH | `/:fileId` | `FILE_RENAME` | Body `{ originalName }`. Bucket key e bytes intactos |
| DELETE | `/:fileId` | `FILE_DELETE` | Soft delete + cleanup S3 best-effort + decrement usage |

### Webhook + admin gate

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| POST | `/api/webhooks/guardduty` | `@SkipCsrf` + SNS signature | Recebe scan results |
| GET | `/api/platform-config/uploads/availability` | JWT | `{ available: boolean }` (storage ready + flag `upload`) |
| GET | `/api/platform-config/limits` | JWT | Inclui `maxUploadSizeMb`, `allowedMimeTypes[]`, `allowedFileExtensions[]` |
| PATCH | `/api/platform-config/limits` | JWT + PLATFORM_ADMIN | Edita os limits acima |

### `FileResponseDto` — formato canónico

```json
{
  "publicId": "01951b...",
  "originalName": "Relatório de Vendas Q3.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 345678,
  "scanStatus": "CLEAN",
  "isSecured": true,
  "uploadedBy": { "publicId": "0195...", "name": "Don Draper" },
  "uploadedAt": "2026-05-07T10:23:00Z",
  "updatedAt": "2026-05-07T10:23:00Z",
  "task": { "publicId": "0195..." }
}
```

**Nunca sai pela API**: `id` numérico, `bucketKey`, `uploadedById`,
`projectId`/`taskId` numéricos.

## Backend — módulos

```
backend/src/files/
├── files.module.ts                 # importa Projects+FeatureFlags+PlatformConfig+Usage+Notifications
├── files.controller.ts             # /api/projects/:id/files/...
├── files.service.ts                # upload/replace/list/download/rename/remove/recordScanResult
├── guardduty-webhook.controller.ts # POST /api/webhooks/guardduty (@SkipCsrf)
├── guardduty-sns-verifier.ts       # SNS signature + EventBridge payload parse
└── dto/
    ├── upload-file.dto.ts          # taskPublicId? UUID
    ├── rename-file.dto.ts          # originalName 1..255
    └── file-response.dto.ts        # FileResponseDto + FileDownloadResponseDto
```

`StorageService` ganha 3 métodos no bucket privado:
`putPrivateObject(key, buffer, contentType)`,
`deletePrivateObject(key)`,
`getSignedDownloadUrl(key, ttl, originalName?)`.
Ver @docs/claude/storage.md.

## Frontend

```
frontend/src/features/files/
├── types.ts                       # AppFile, FileScanStatus mirror enum
├── useFiles.ts                    # GET list + mutações + useUploadsAvailability
├── errors.ts                      # parseErrorContext + formatUploadError
└── components/
    ├── FilesPanel.tsx             # painel reutilizável (TaskModal + PlanningPage)
    ├── FileUploadButton.tsx       # input file hidden + upload handler
    ├── FileListItem.tsx           # nome, tamanho, autor, data, escudo, acções
    └── ScanStatusBadge.tsx        # ✓ verde / ⏳ pulsante / ✕ vermelho / nenhum
```

### Pontos de integração

- **`TaskModal`** ([`frontend/src/features/planning/components/TaskModal.tsx`](frontend/src/features/planning/components/TaskModal.tsx)):
  tab "Ficheiros" ao lado de Detalhes/Comentários/Vínculos. Lista files
  com `taskPublicId === task.publicId`. Visível só com flag `upload` +
  `canDo(FILE_VIEW)`.
- **`PlanningPage`** ([`frontend/src/pages/PlanningPage.tsx`](frontend/src/pages/PlanningPage.tsx)):
  tab "Ficheiros do Projeto" ao lado de Planning/Gantt/Board/Calendar/Timesheet.
  Lista files com `taskId === null` (project-level). Wrapper segue
  `viewFrameStyle()` — regra obrigatória do frame visual unificado.
- **`UnifiedToolbar`**: novo entry de tab visível conforme `showFiles` prop.
- **`PlatformLimitsPage`** (`/settings/limits`, PLATFORM_ADMIN): card
  "Uploads" com input `maxUploadSizeMb`, "Extensões permitidas" (separadas
  por `;`) e "Tipos MIME permitidos" (uma linha por MIME).
- **Availability gate**: `useUploadsAvailability()` consulta
  `/platform-config/uploads/availability` para mostrar/ocultar o botão de
  upload (storage ready + flag `upload` activa para o user).

### Pattern do upload — Multipart

```tsx
const fd = new FormData();
fd.append('file', file);
if (taskPublicId) fd.append('taskPublicId', taskPublicId);
await apiFetch(`${api}/projects/${projectPublicId}/files`, { method: 'POST', body: fd });
//  ↑ NÃO definir Content-Type — browser injecta o boundary correcto
```

### Erros com contexto

`useFiles.upload` propaga o body completo via
`throw new Error(JSON.stringify({ error_code, ...context }))`.
`features/files/errors.ts` parse + formata:

```tsx
catch (err) {
  showToast('danger', formatUploadError(t, parseErrorContext(err)));
}
```

Mensagem final ao user (interpolada com placeholders):
- `"Ficheiros com extensão .exe não são permitidos. Extensões aceites: pdf, png, jpg, ..."`
- `"O ficheiro tem 73 MB e excede o limite de 50 MB."`
- `"Tipo de ficheiro \"application/x-msdownload\" não permitido."`

### Escudos (`<ScanStatusBadge>`)

| `scanStatus` | `isSecured` | Badge | Cor | Tooltip |
|---|---|---|---|---|
| `null` | `false` | nenhum | — | — |
| `null` | `true` | nenhum (estado raro) | — | — |
| `PENDING` | — | "A verificar..." | cinza pulsante | "A aguardar verificação de malware" |
| `CLEAN` | — | "Verificado" | verde | "Ficheiro verificado pelo AWS GuardDuty" |
| `INFECTED` | — | "Bloqueado" | vermelho | "Ameaça detectada — ficheiro bloqueado para download" |

`FileListItem` desactiva o botão de download (cinza) com tooltip de erro
quando `scanStatus === INFECTED`.

## i18n

Namespace **`files`** em `backend/prisma/seeds/translations/files.json`
(4 locales: pt-PT, pt-BR, en, es). Registado em
`frontend/src/i18n/index.ts`.

Chaves principais:
- `page.tab_label`, `page.project_tab_label`
- `actions.upload`, `actions.replace`, `actions.rename`, `actions.delete`, `actions.download`
- `scan.shield_clean` / `_pending` / `_infected` + tooltips
- `errors.file_too_large` / `mime_not_allowed` / `extension_not_allowed` / `unrecognized` /
  `infected` / `feature_disabled` / `storage_unavailable` — todos com placeholders
  (`{{sizeMb}}`/`{{maxMb}}`/`{{mime}}`/`{{ext}}`/`{{allowed}}`)
- `rename.*`, `delete.*`, `upload.*`

Chaves cross-namespace adicionadas:
- `permissions:action.FILE_VIEW` / `FILE_UPLOAD` / `FILE_RENAME` / `FILE_DELETE`
- `permissions:group.files`
- `notifications:type.FILE_INFECTED` + `desc.FILE_INFECTED`
- `email:file_infected.subject` + `body_p1` + `body_p2`
- `platform_config:uploads.tab_label` / `max_upload_size_mb` /
  `allowed_extensions` / `allowed_mime_types` (+ hints)

## Dependências

- `@aws-sdk/client-s3` (já existia para avatares)
- `@aws-sdk/s3-request-presigner` (instalado para esta feature — gera
  presigned URLs com `ResponseContentDisposition`)
- `file-type@16.x` (CommonJS exports — versões 17+ são ESM-only e quebram
  o build NestJS)
- `multer` (já existia)
- `@nestjs/platform-express` (`FileInterceptor` + `memoryStorage`)

## Anti-padrões

- ❌ Expor `bucketKey` na API — sempre opaco. Apenas `publicId` UUID v7 e
  presigned URL para download.
- ❌ Confiar no Content-Type declarado pelo cliente — usar sempre `file-type`
  (magic bytes) como verdade canónica.
- ❌ Usar a extensão derivada do filename ignorando `detected.ext` — `file-type`
  é a verdade.
- ❌ Skipar a allowlist de extensões — defesa em camadas exige **ambas**
  (MIME + extensão), não uma ou a outra.
- ❌ Aceitar SVG, executáveis (`exe`/`dll`/`bat`/`sh`/`jar`/`apk`), HTML —
  vectors XSS / RCE.
- ❌ Passar o filename do Multer directamente sem `decodeMultipartFilename`
  — acentos virão mangled (`Ã§` em vez de `ç`).
- ❌ Fazer DB-first em vez de S3-first — em caso de falha de DB ficamos com
  o registo apontando a key inexistente. S3 first; key UUID evita colisão.
- ❌ Migrar paths de normal→secured (ou inverso) quando a flag muda —
  ficheiros antigos seguem a regra do upload original. Replace mantém o
  path corrente.
- ❌ Cobrar plan limit no uploader em vez do owner do projecto — quebra o
  paralelo com seats LICENSED. `usage.increment(ownerId, ...)` sempre.
- ❌ Apagar `File` em hard delete sem apagar antes o object do bucket —
  orphan no bucket privado. Soft delete é o caminho default; hard delete
  só por PLATFORM_ADMIN com cleanup explícito.
- ❌ Esquecer de resetar `scanStatus` para `PENDING` em replace de ficheiro
  secured — conteúdo é novo, scan tem que correr outra vez.
- ❌ Não verificar SNS signature no webhook — qualquer atacante poderia
  POST `INFECTED` para apagar ficheiros legítimos do bucket.
- ❌ Tratar `SubscriptionConfirmation` como erro — é parte normal do flow,
  fazer GET ao `SubscribeURL` (idempotente).
- ❌ Mostrar escudo (`ScanStatusBadge`) para ficheiros normais
  (`scanStatus === null && isSecured === false`) — só faz sentido em path
  secured. Default: sem badge.
- ❌ Permitir `@SkipCsrf` em endpoints de upload do user — são mutações
  autenticadas e devem manter CSRF token. Apenas o webhook GuardDuty é
  `@SkipCsrf` (validação por SNS signature substitui).
- ❌ Esquecer o `ResponseContentDisposition` no presigned URL — browser
  descarrega com o UUID hash em vez do nome humano.

# Relacionados: @docs/claude/storage.md @docs/claude/permissions.md @docs/claude/backend.md @docs/claude/db.md @docs/claude/notifications.md @docs/claude/email.md @docs/claude/i18n.md @docs/claude/frontend.md
