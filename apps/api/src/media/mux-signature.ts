import { createHmac, timingSafeEqual } from 'node:crypto';

/** Mux's SDKs reject a webhook older than five minutes to limit replay. */
export const MUX_WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Verifies `Mux-Signature: t=…,v1=…` as HMAC-SHA256 of `timestamp.rawBody`.
 * https://www.mux.com/docs/core/verify-webhook-signatures
 */
export function verifyMuxWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string | undefined;
  secret: string;
  nowMs?: number;
  toleranceMs?: number;
}): boolean {
  if (!input.secret || !input.signatureHeader) return false;

  const parsed = parseMuxSignatureHeader(input.signatureHeader);
  if (!parsed) return false;

  const nowMs = input.nowMs ?? Date.now();
  const toleranceMs = input.toleranceMs ?? MUX_WEBHOOK_TOLERANCE_MS;
  if (Math.abs(nowMs - parsed.timestampMs) > toleranceMs) return false;

  const expected = createHmac('sha256', input.secret)
    .update(`${parsed.timestamp}.${input.rawBody}`, 'utf8')
    .digest('hex');

  return parsed.signatures.some((signature) => safeEqualHex(expected, signature));
}

export function parseMuxSignatureHeader(
  header: string,
): { timestamp: string; timestampMs: number; signatures: string[] } | null {
  let timestamp: string | undefined;
  const signatures: string[] = [];

  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') timestamp = value;
    if (key === 'v1' && value) signatures.push(value);
  }

  if (!timestamp || signatures.length === 0) return null;

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs)) return null;

  return { timestamp, timestampMs, signatures };
}

function safeEqualHex(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, 'hex');
    const b = Buffer.from(right, 'hex');
    if (a.length === 0 || a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
