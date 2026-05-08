# Claude: carregar para qualquer tarefa do wrapper AWS S3

## O que é

Wrapper sobre AWS S3 (`backend/src/storage/`). Único ponto da app que sabe
da existência dum cliente S3. `StorageModule` é `@Global()` — qualquer service
injecta `StorageService` sem `imports` explícito.

Dois buckets:
- **Público** (`AWS_BUCKET_PUBLIC`) — URLs directas, sem TTL. Usado para
  avatares de utilizador (`avatars/{publicId}.webp`).
- **Privado** (`AWS_BUCKET`) — acesso só via presigned URL com TTL curto.
  Usado pelo feature de upload de ficheiros project-scoped — ver
  @docs/claude/uploads.md.

> Este documento cobre apenas o wrapper S3 (config, API, anti-padrões
> genéricos). Para o feature de uploads de ficheiros (modelos, permissões,
> pipeline, GuardDuty, UI), ver @docs/claude/uploads.md.

## Arquitectura

```
backend/src/storage/
├── storage.module.ts     # @Global() — providers: [StorageService]
├── storage.service.ts    # wrapper sobre @aws-sdk/client-s3
└── storage.config.ts     # readS3Env() — lê env vars
```

`StorageModule` está registado em `app.module.ts` como global. Não precisa
de `imports: [StorageModule]` em cada feature module.

## Configuração — env vars only

Diferente de `EmailConfig` (singleton em BD com kill-switch admin), o
`StorageService` lê as credenciais directamente das env vars no boot.
Nada é editável pelo admin via UI:

| Variável | Descrição |
|---|---|
| `AWS_REGION` | Ex.: `eu-west-3` (Paris) |
| `AWS_ACCESS_KEY_ID` | IAM user `awesomeproject-s3-{ambiente}` |
| `AWS_SECRET_ACCESS_KEY` | Segredo do IAM user (apenas em `.env`, nunca em git) |
| `AWS_BUCKET` | Bucket privado (uploads project-scoped) |
| `AWS_BUCKET_PUBLIC` | Bucket público (avatares) |

> **Razão**: nada deste set é editável em runtime. Region e keys são
> secrets; bucket é fixo por ambiente. Adicionar `StorageConfig` em BD será
> feito **só** se houver necessidade de kill-switch global ou múltiplos
> providers.

Ao recriar o container backend após alterar `.env`, o `StorageService`
regista:

```
[StorageService] S3 ready (eu-west-3, public=awesomeproject-dev-public, private=awesomeproject-dev)
```

Se faltar alguma env var:
```
[StorageService] S3 disabled — env vars em falta: AWS_REGION, AWS_ACCESS_KEY_ID, ...
```

> **Importante para Docker**: o `docker-compose.local.yml` tem que listar
> as env vars no bloco `environment:` do serviço backend para que sejam
> propagadas do host `.env` para o container. Não basta o `.env` da raiz.

## API — `StorageService`

### Bucket público

| Método | Descrição |
|---|---|
| `isReady(): boolean` | Env vars presentes e cliente inicializado |
| `buildPublicUrl(key): string` | Constrói `https://{bucket}.s3.{region}.amazonaws.com/{key}` |
| `putAvatar(userPublicId, buffer): Promise<string>` | PUT no bucket público; devolve o key. `Cache-Control: public, max-age=86400` |
| `deletePublicObject(key): Promise<void>` | DELETE no bucket público; silencioso em falha |
| `static get allowedAvatarMime` | Lista de MIME types aceites para avatar |
| `static get maxAvatarBytes` | 5 MB |

### Bucket privado

| Método | Descrição |
|---|---|
| `putPrivateObject(key, buffer, contentType): Promise<void>` | PUT no bucket privado, sem Cache-Control |
| `deletePrivateObject(key): Promise<void>` | DELETE no bucket privado; silencioso em falha |
| `getSignedDownloadUrl(key, ttl=900s, originalName?): Promise<string>` | Gera URL presigned para download. Quando `originalName` é passado, injecta `ResponseContentDisposition: attachment; filename*=UTF-8''<percent-encoded>` para o browser descarregar com o nome humano |

> O caller é responsável por construir o `key` opaco (UUID random, sem
> informação que indique propriedade). Validações de MIME/tamanho/conteúdo
> são responsabilidade do caller — `StorageService` apenas put/delete/sign.

## Pipeline de validação — defesa em camadas

Independentemente do use case, qualquer upload deve passar pelas 3 camadas
abaixo **antes** de chegar ao `StorageService`:

```
Cliente (browser)
   │ multipart/form-data, campo `file`
   ▼
Multer (memoryStorage, hard limit por feature)         ← camada 1: tamanho
   │ Buffer
   ▼
file-type (magic bytes)                                 ← camada 2: MIME real
   │ rejeita SVG (XSS via <script> embebido)
   │ rejeita executáveis disfarçados
   ▼
[opcional] sharp/transcoder                             ← camada 3: re-encode
   │ • strip EXIF / metadata
   │ • normaliza formato
   │ • anula payloads embebidos (EXIF malicioso, polyglots)
   ▼
StorageService.put{Avatar,PrivateObject}                ← camada 4: write S3
```

Cada camada bloqueia uma classe de ataque diferente. Confiar só na primeira
(Content-Type declarado) é ingénuo — o cliente pode mentir. Confiar só na
última (S3 não corre código) também não chega — ficheiros HTML/SVG hospedados
em domínio público podem habilitar XSS via `<script>` quando alguém os abre.

### Avatar — pipeline completo (referência)

```
Multer (5 MB hard limit)
   │
   ▼
file-type → ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
   │ (rejeita SVG)
   ▼
sharp .rotate().resize(256, 256, cover).webp(85)
   │ strip EXIF, normaliza dimensões, output canónico WebP
   ▼
StorageService.putAvatar(publicId, processed)
   │ Bucket: AWS_BUCKET_PUBLIC; Key: avatars/{publicId}.webp
   ▼
prisma.user.update({ avatarKey, avatarUpdatedAt })
   │
   ▼
attachAvatarUrl(updated) → { ...user, avatarUrl: 'https://...' }
```

Implementação: `UsersService.updateMyAvatar` em `backend/src/users/users.service.ts`.

Para o pipeline do feature de uploads project-scoped (que adiciona allowlist
de MIME + extensão configurável pelo admin, scan GuardDuty, presigned
download), ver @docs/claude/uploads.md.

## Convenção de paths e exposição

- Keys são sempre construídos com `publicId` UUID v7, **nunca** com `id`
  numérico interno. O caller decide o pattern (ver `putAvatar` para
  avatares, ver @docs/claude/uploads.md para uploads project-scoped).
- O bucket público admite paths predizíveis (o conteúdo é por desenho
  público).
- O bucket privado deve usar UUID v4 random como leaf — o key é opaco e
  não revela propriedade nem ordem de criação.
- **`xxxKey` nunca é exposto na API**. O service tem helper
  (`attachAvatarUrl()` para avatar; `FileResponseDto.toResponse` para uploads)
  que substitui o key por uma URL/presigned-URL no DTO de resposta.
  Razão: portabilidade — se mudarmos de bucket via env var, a BD continua
  intacta (paths são relativos).

## Cache busting (bucket público)

`User.avatarUpdatedAt` é incrementado em cada upload. O frontend anexa
`?v={avatarUpdatedAt}` ao `<img src>`:

```tsx
src={`${user.avatarUrl}?v=${encodeURIComponent(user.avatarUpdatedAt)}`}
```

Sem isto, o browser cacha a versão antiga (mesmo path), e mudar avatar não
reflecte visualmente. `Cache-Control: max-age=86400` no S3 é generoso porque
o `?v=` invalida.

> Bucket privado não precisa de cache busting — cada presigned URL tem TTL
> de 15 min e o key muda em cada `replace` (UUID novo).

## Anti-padrões

- ❌ Confiar no `Content-Type` declarado pelo cliente — usar `file-type`
  (magic bytes).
- ❌ Aceitar SVG em uploads de imagem — vector para XSS via `<script>`
  embebido.
- ❌ Saltar o re-encode com sharp em uploads de imagem — preservar
  EXIF/metadata expõe localização GPS, dispositivo, etc.; também permite
  polyglots (ficheiro válido em 2 formatos).
- ❌ Expor `xxxKey` directamente na API. Usar sempre helper que devolve
  URL completa (ou presigned URL para bucket privado).
- ❌ Guardar URL completa em BD em vez do key. Mudar de bucket exigia
  migration.
- ❌ Esquecer cache busting via `?v={timestamp}` em bucket público —
  browser mostra versão antiga após upload.
- ❌ Definir `Content-Type` manualmente no fetch quando o body é
  `FormData` — quebra o boundary multipart automático do browser.
- ❌ Adicionar env var nova ao `.env` do host sem propagá-la no
  `docker-compose.local.yml` (`environment:` block do backend).
- ❌ Permitir `@SkipCsrf` em endpoints de upload — são mutações autenticadas
  e devem manter CSRF token.
- ❌ Throw 500 quando `StorageService.isReady() === false` — devolver 503
  `STORAGE_NOT_READY` para diferenciar erro temporário (sysadmin) de bug.
- ❌ Reutilizar a mesma chave para diferentes utilizadores no bucket
  público — keys têm que ser únicos por user (ex.: `avatars/{publicId}.webp`).
- ❌ Usar URLs directas para conteúdo do bucket privado — sempre presigned
  via `getSignedDownloadUrl` com TTL curto.

# Relacionados: @docs/claude/uploads.md @docs/claude/backend.md @docs/claude/db.md @docs/claude/auth.md
