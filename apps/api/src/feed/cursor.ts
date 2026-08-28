import { createHmac, timingSafeEqual } from 'node:crypto';

import { AppError } from '../common/errors/app-error';

export interface FeedCursor {
  /** Sort value of the last item: publishedAt epoch ms, or trending score. */
  value: number;
  /** Tiebreaker for equal sort values. */
  id: string;
}

/**
 * Feed cursors are opaque and signed.
 *
 * Signing is not about secrecy — the contents are unremarkable — it is about
 * refusing forged cursors. An unsigned cursor is an input a caller can craft
 * to walk the table on their own terms, and it silently becomes part of the
 * API contract the moment someone depends on its shape. Signing keeps it ours
 * to change.
 */
export function encodeCursor(cursor: FeedCursor, secret: string): string {
  const payload = Buffer.from(`${cursor.value}:${cursor.id}`).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeCursor(raw: string, secret: string): FeedCursor {
  const [payload, signature] = raw.split('.');

  if (!payload || !signature) {
    throw AppError.badRequest('Malformed cursor');
  }

  const expected = sign(payload, secret);
  const provided = Buffer.from(signature);
  const computed = Buffer.from(expected);

  if (provided.length !== computed.length || !timingSafeEqual(provided, computed)) {
    throw AppError.badRequest('Malformed cursor');
  }

  const decoded = Buffer.from(payload, 'base64url').toString('utf8');
  const separator = decoded.indexOf(':');

  if (separator === -1) {
    throw AppError.badRequest('Malformed cursor');
  }

  const value = Number(decoded.slice(0, separator));
  const id = decoded.slice(separator + 1);

  if (!Number.isFinite(value) || id.length === 0) {
    throw AppError.badRequest('Malformed cursor');
  }

  return { value, id };
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}
