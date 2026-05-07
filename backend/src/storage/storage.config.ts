/**
 * Lê e valida as variáveis de ambiente AWS S3 que alimentam o `StorageService`.
 *
 * Os secrets vivem **fora** da BD — em `.env` do container backend. Não há
 * singleton equivalente ao `EmailConfig` porque nada é editável pelo admin
 * (region/keys são secrets, bucket é fixo por ambiente). Disponibilidade é
 * derivada da presença das env vars; ver
 * `GET /platform-config/storage/availability`.
 */
export interface S3Env {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketPublic: string;
}

export interface S3EnvResult {
  /** Env vars completas — `null` se algo essencial faltar. */
  env: S3Env | null;
  /** Lista de variáveis em falta (informativa para logs do admin). */
  missing: string[];
}

/** Lê o ambiente do processo Node. Devolve `env=null` se algo faltar. */
export function readS3Env(): S3EnvResult {
  const region = process.env.AWS_REGION?.trim() ?? '';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim() ?? '';
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim() ?? '';
  const bucketPublic = process.env.AWS_BUCKET_PUBLIC?.trim() ?? '';

  const missing: string[] = [];
  if (!region) missing.push('AWS_REGION');
  if (!accessKeyId) missing.push('AWS_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('AWS_SECRET_ACCESS_KEY');
  if (!bucketPublic) missing.push('AWS_BUCKET_PUBLIC');

  if (missing.length > 0) return { env: null, missing };

  return {
    env: { region, accessKeyId, secretAccessKey, bucketPublic },
    missing: [],
  };
}
