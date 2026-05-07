# Claude: carregar para qualquer tarefa de storage de ficheiros

## O que é

Wrapper sobre AWS S3 para upload e remoção de ficheiros pertencentes a
utilizadores. Centralizado num único módulo `@Global()` para que qualquer
service possa injectar `StorageService` sem importações cruzadas.

**Casos de uso actuais (Mai 2026):**
- Avatar do utilizador (bucket público) — `avatars/{userPublicId}.webp`.

**Casos de uso planeados (out of scope):**
- Anexos de tarefas/comentários (bucket privado, presigned URL).
- Documentos de projecto (bucket privado).

## Arquitectura

```
backend/src/storage/
├── storage.module.ts     # @Global() — providers: [StorageService]
├── storage.service.ts    # wrapper sobre @aws-sdk/client-s3
└── storage.config.ts     # readS3Env() — lê env vars
```

`StorageModule` está registado em `app.module.ts` como global. Não precisa de
`imports: [StorageModule]` em cada feature module.

## Configuração — env vars only

Diferente de `EmailConfig` (singleton em BD com kill-switch admin), o
`StorageService` lê as credenciais directamente das env vars no boot. Nada é
editável pelo admin via UI:

| Variável | Descrição |
|---|---|
| `AWS_REGION` | Ex.: `eu-west-3` (Paris) |
| `AWS_ACCESS_KEY_ID` | IAM user `awesomeproject-s3-{ambiente}` |
| `AWS_SECRET_ACCESS_KEY` | Segredo do IAM user (apenas em `.env`, nunca em git) |
| `AWS_BUCKET` | Bucket privado (planeado para docs futuros) |
| `AWS_BUCKET_PUBLIC` | Bucket público (avatares) |

> **Razão**: nada deste set é editável em runtime. Region e keys são secrets;
> bucket é fixo por ambiente. `EmailConfig` em BD existe porque tem campos
> editáveis (`fromEmail`/`fromName`). Adicionar `StorageConfig` em BD será
> feito **só** se houver necessidade de kill-switch global ou múltiplos
> providers.

Ao recriar o container backend após alterar `.env`, o `StorageService` regista:

```
[StorageService] S3 ready (eu-west-3, public bucket=awesomeproject-dev-public)
```

Se faltar alguma env var:
```
[StorageService] S3 disabled — env vars em falta: AWS_REGION, AWS_ACCESS_KEY_ID, ...
```

> **Importante para Docker**: o `docker-compose.local.yml` tem que listar as
> env vars no bloco `environment:` do serviço backend para que sejam
> propagadas do host `.env` para o container. Não basta o `.env` da raiz.

## Pipeline de upload — defesa em camadas

```
Cliente (browser)
   │ multipart/form-data, campo `file`
   ▼
Multer (memoryStorage, 5 MB hard limit)        ← camada 1: tamanho
   │ Buffer
   ▼
file-type (magic bytes)                         ← camada 2: MIME real
   │ valida ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
   │ rejeita SVG (XSS via <script>)
   ▼
sharp (.rotate().resize(256, 256, cover).webp(85))   ← camada 3: re-encode
   │ • strip EXIF / metadata
   │ • normaliza dimensões (256×256)
   │ • output canónico WebP q=85
   │ • anula payloads embebidos (EXIF malicioso, polyglots)
   ▼
StorageService.putAvatar(publicId, processed)    ← camada 4: write S3
   │ Bucket: AWS_BUCKET_PUBLIC
   │ Key:    avatars/{publicId}.webp
   │ Cache-Control: public, max-age=86400
   ▼
prisma.user.update({ avatarKey, avatarUpdatedAt })
   │
   ▼
attachAvatarUrl(updated)  →  { ...user, avatarUrl: 'https://...' }
```

Cada camada bloqueia uma classe de ataque diferente. Confiar só na primeira
(Content-Type declarado) é ingénuo — o cliente pode mentir. Confiar só na
última (S3 não corre código) também não chega — ficheiros HTML/SVG hospedados
em domínio público podem habilitar XSS via `<script>` quando alguém os abre.

## Path conventions

| Tipo | Path | Bucket | Acesso |
|---|---|---|---|
| Avatar | `avatars/{userPublicId}.webp` | público | URL directa |
| Docs (futuro) | `documents/{projectPublicId}/{docPublicId}.{ext}` | privado | Presigned URL |

> Sempre `publicId` (UUID v7), nunca `id` numérico. O path é predizível mas
> isso é OK no bucket público — o conteúdo é por desenho público.

## Cache busting

`User.avatarUpdatedAt` é incrementado em cada upload. O frontend anexa
`?v={avatarUpdatedAt}` ao `<img src>`:

```tsx
src={`${user.avatarUrl}?v=${encodeURIComponent(user.avatarUpdatedAt)}`}
```

Sem isto, o browser cacha a versão antiga (mesmo path), e mudar avatar não
reflecte visualmente. `Cache-Control: max-age=86400` no S3 é generoso porque
o `?v=` invalida.

## API — `StorageService`

| Método | Descrição |
|---|---|
| `isReady(): boolean` | Env vars presentes e cliente inicializado |
| `buildPublicUrl(key): string` | Constrói `https://{bucket}.s3.{region}.amazonaws.com/{key}` |
| `putAvatar(userPublicId, buffer): Promise<string>` | PUT no bucket público; devolve o key |
| `deletePublicObject(key): Promise<void>` | DELETE no bucket público; silencioso em falha |
| `static get allowedAvatarMime` | Lista de MIME types aceites |
| `static get maxAvatarBytes` | 5 MB |

## Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/users/me/avatar` | JWT + CSRF | Multipart upload do avatar próprio |
| `DELETE` | `/api/users/me/avatar` | JWT + CSRF | Remove o avatar próprio (S3 + BD) |
| `GET` | `/api/platform-config/storage/availability` | JWT | `{ available: boolean }` para gating UI |

> Os endpoints `/me/avatar` **não** usam `@SkipCsrf` — são mutações
> autenticadas via cookie e devem manter CSRF token (anti-CSRF defence).

## Frontend — pattern

```tsx
const fileInputRef = useRef<HTMLInputElement>(null);
const [storageAvailable, setStorageAvailable] = useState(true);
const [uploadingAvatar, setUploadingAvatar] = useState(false);
const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

useEffect(() => {
  apiFetch(`${api}/platform-config/storage/availability`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { if (d) setStorageAvailable(d.available); })
    .catch(() => {});
}, [api]);

// Upload:
const fd = new FormData();
fd.append('file', file);
await apiFetch(`${api}/users/me/avatar`, { method: 'POST', body: fd });
//  ↑ NÃO definir Content-Type — o browser injecta o boundary correcto
```

UI gated:
```tsx
<button disabled={!storageAvailable || uploadingAvatar}>...</button>
{!storageAvailable && <small>{t('avatar.unavailable')}</small>}
```

Display do avatar:
```tsx
{user.avatarUrl ? (
  <img src={`${user.avatarUrl}?v=${user.avatarUpdatedAt}`} />
) : (
  <Initials />
)}
```

## attachAvatarUrl — convenção do UsersService

`User.avatarKey` (path relativo) **nunca** é exposto na API. O service tem
um helper `attachAvatarUrl()` que remove `avatarKey` e injecta `avatarUrl`
(URL pública completa) em **todos** os returns que devolvem user.

Razão: portabilidade. Se mudarmos de bucket via env var, a BD continua
intacta (paths são relativos). Apenas a função `buildPublicUrl()` no service
sabe construir a URL.

## Adicionar novo tipo de upload

1. **Path**: definir o key pattern (ex.: `documents/{projectId}/{docId}.pdf`).
2. **Bucket**: público se URL directa, privado se requer assinatura.
3. **Validações**: definir MIME aceites + tamanho máximo. Adicionar getters
   estáticos no `StorageService` (ex.: `allowedDocumentMime`, `maxDocumentBytes`).
4. **Pipeline**: Multer + file-type + (opcional) sharp/conversor + put.
5. **Schema**: nova coluna `xxxKey` + `xxxUpdatedAt` no model relevante.
6. **Helper**: `attachXxxUrl()` análogo ao do avatar.
7. **Endpoint**: `POST /xxx/upload` com `FileInterceptor` e validações.
8. **Frontend**: input file hidden + handler optimista + cache busting.
9. **Privado**: para bucket privado, adicionar `getSignedUrl` ao
   `StorageService` (importar `@aws-sdk/s3-request-presigner`).

## Anti-padrões

- ❌ Confiar no `Content-Type` declarado pelo cliente — usar `file-type`
  (magic bytes).
- ❌ Aceitar SVG em uploads de imagem — vector para XSS via `<script>`
  embebido.
- ❌ Saltar o re-encode com sharp — preservar EXIF/metadata expõe localização
  GPS, dispositivo, etc.; também permite polyglots (ficheiro válido em 2
  formatos).
- ❌ Expor `avatarKey` (ou qualquer `xxxKey`) directamente na API. Usar
  sempre `attachXxxUrl()` para devolver a URL completa.
- ❌ Guardar URL completa em BD em vez do key. Mudar de bucket exigia migration.
- ❌ Esquecer cache busting via `?v={timestamp}` — browser mostra avatar
  antigo após upload.
- ❌ Definir `Content-Type` manualmente no fetch quando o body é `FormData`
  — quebra o boundary multipart automático do browser.
- ❌ Adicionar env var nova ao `.env` do host sem propagá-la no
  `docker-compose.local.yml` (`environment:` block do backend).
- ❌ Permitir `@SkipCsrf` em endpoints de upload — são mutações autenticadas
  e devem manter CSRF token.
- ❌ Throw 500 quando `StorageService.isReady() === false` — devolver 503
  `STORAGE_NOT_READY` para diferenciar erro temporário (sysadmin) de bug.
- ❌ Reutilizar a mesma chave para diferentes utilizadores no bucket público
  — cada utilizador tem `avatars/{publicId}.webp` (predizível mas único).

# Relacionados: @docs/claude/backend.md @docs/claude/db.md @docs/claude/auth.md
