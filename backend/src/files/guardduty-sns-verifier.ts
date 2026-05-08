import { createVerify } from 'crypto';
import { Logger } from '@nestjs/common';

/**
 * AWS SNS HTTPS notification signature verification.
 *
 * Implementação baseada em
 * https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 * — sem dependência externa (`aws-sns-validator` está unmaintained).
 *
 * Fluxo:
 * 1. Validar `Type` ∈ {Notification, SubscriptionConfirmation, UnsubscribeConfirmation}.
 * 2. Validar `SigningCertURL` matches `^https://sns\\.[a-z0-9-]+\\.amazonaws\\.com/`.
 * 3. Fetch do cert (cacheado em memória 24h).
 * 4. Reconstruir string-to-sign (campos canónicos por tipo, ordenados, separados por `\n`).
 * 5. Verificar `Signature` (base64) com SHA1 (`SignatureVersion === '1'`) ou SHA256 (`'2'`).
 *
 * `SubscriptionConfirmation`: o handler do webhook deve fazer GET ao
 * `SubscribeURL` para confirmar a inscrição (one-time, idempotente).
 */

interface SnsMessage {
  Type: string;
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  Token?: string;
  SubscribeURL?: string;
  UnsubscribeURL?: string;
  Token0?: never;
}

const CERT_HOST_PATTERN = /^https:\/\/sns\.[a-z0-9-]+\.amazonaws\.com\/.+\.pem$/;
const CERT_TTL_MS = 24 * 60 * 60 * 1000;
const certCache = new Map<string, { cert: string; fetchedAt: number }>();

const logger = new Logger('SnsVerifier');

export function isSnsCertUrl(url: string): boolean {
  return CERT_HOST_PATTERN.test(url);
}

export async function verifySnsSignature(message: SnsMessage): Promise<boolean> {
  if (!message?.Signature || !message?.SigningCertURL) return false;
  if (!isSnsCertUrl(message.SigningCertURL)) {
    logger.warn(`Rejected SNS message — invalid SigningCertURL: ${message.SigningCertURL}`);
    return false;
  }

  const cert = await fetchSnsCert(message.SigningCertURL);
  if (!cert) return false;

  const stringToSign = buildStringToSign(message);
  if (!stringToSign) return false;

  const algorithm = message.SignatureVersion === '2' ? 'SHA256' : 'SHA1';
  const verifier = createVerify(algorithm);
  verifier.update(stringToSign, 'utf8');
  verifier.end();

  try {
    return verifier.verify(cert, message.Signature, 'base64');
  } catch (err) {
    logger.warn(`SNS verify failed: ${(err as Error).message}`);
    return false;
  }
}

async function fetchSnsCert(url: string): Promise<string | null> {
  const cached = certCache.get(url);
  if (cached && Date.now() - cached.fetchedAt < CERT_TTL_MS) {
    return cached.cert;
  }
  try {
    const res = await fetch(url);
    if (!res.ok) {
      logger.warn(`SNS cert fetch ${res.status} for ${url}`);
      return null;
    }
    const cert = await res.text();
    certCache.set(url, { cert, fetchedAt: Date.now() });
    return cert;
  } catch (err) {
    logger.warn(`SNS cert fetch error for ${url}: ${(err as Error).message}`);
    return null;
  }
}

/**
 * Reconstrói a string-to-sign exactamente como o SNS espera.
 * Order matters — fields apparecem alfabeticamente, em pares "name\nvalue\n".
 */
function buildStringToSign(message: SnsMessage): string | null {
  const fields = (() => {
    if (message.Type === 'Notification') {
      const base = ['Message', 'MessageId', 'Subject', 'Timestamp', 'TopicArn', 'Type'];
      // Campo `Subject` é opcional — só incluído se presente.
      return message.Subject ? base : base.filter((f) => f !== 'Subject');
    }
    if (message.Type === 'SubscriptionConfirmation' || message.Type === 'UnsubscribeConfirmation') {
      return ['Message', 'MessageId', 'SubscribeURL', 'Timestamp', 'Token', 'TopicArn', 'Type'];
    }
    return null;
  })();
  if (!fields) return null;

  let out = '';
  for (const field of fields) {
    const value = (message as unknown as Record<string, unknown>)[field];
    if (value === undefined || value === null) continue;
    out += `${field}\n${String(value)}\n`;
  }
  return out;
}

/**
 * Devolve o veredicto canónico extraído do `Message` do SNS — formato
 * EventBridge GuardDuty Malware Protection. O caller deve passar o
 * `message.Message` (que é JSON encoded como string).
 *
 * EventBridge envia: { "detail": { "scanResultDetails": { "scanResultStatus": "NO_THREATS_FOUND" | "THREATS_FOUND" | "FAILED" }, "s3ObjectDetails": { "objectKey": "uploads/secured/..." } } }
 *
 * Devolvemos `null` se o payload não tiver os campos esperados — caller
 * regista warning e ignora.
 */
export function parseGuardDutyVerdict(
  rawMessage: string,
): { bucketKey: string; verdict: 'CLEAN' | 'INFECTED' } | null {
  try {
    const parsed = JSON.parse(rawMessage);
    const detail = parsed?.detail ?? parsed; // alguns publishers podem mandar sem wrapper
    const status: string | undefined = detail?.scanResultDetails?.scanResultStatus;
    const bucketKey: string | undefined = detail?.s3ObjectDetails?.objectKey;
    if (!status || !bucketKey) return null;
    if (status === 'NO_THREATS_FOUND') return { bucketKey, verdict: 'CLEAN' };
    if (status === 'THREATS_FOUND') return { bucketKey, verdict: 'INFECTED' };
    return null; // FAILED ou outro estado — caller decide.
  } catch {
    return null;
  }
}
