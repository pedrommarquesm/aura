import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

const N = 16_384;
const R = 8;
const P = 1;
const KEY_LEN = 32;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * `scrypt$N$r$p$salt$hash`. scrypt is in Node's stdlib so Railway does not
 * need a native argon2/bcrypt addon.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4]!, 'base64url');
    expected = Buffer.from(parts[5]!, 'base64url');
  } catch {
    return false;
  }

  if (salt.length === 0 || expected.length === 0) return false;

  const actual = await scrypt(password, salt, expected.length, { N: n, r, p });
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function looksLikeEmail(raw: string): boolean {
  return raw.includes('@');
}

/** Apple Hide My Email. Not a stable address and not the inbox the user typed. */
export const APPLE_PRIVATE_RELAY_SUFFIX = '@privaterelay.appleid.com';

/**
 * Email we may use to attach a first Apple/Google sign-in to a password
 * account. Returns null when there is no email, or when it is Apple's
 * private relay — those addresses are not a reliable identity key.
 *
 * Why Apple email is unreliable:
 * - Hide My Email issues `…@privaterelay.appleid.com`. It is unique per app
 *   and is not the address the user would type into a password form.
 * - Apple sends email (and name) only on the first authorization. Later
 *   sign-ins often have no email at all.
 * - The user can turn Hide My Email on or off, or revoke the app, and the
 *   next token's email changes or disappears.
 *
 * So we never key OAuth identity on email. We only *link* when the token
 * carries a non-relay address that already exists as a password identity.
 */
export function linkableOauthEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const email = normalizeEmail(raw);
  if (!email.includes('@')) return null;
  if (email.endsWith(APPLE_PRIVATE_RELAY_SUFFIX)) return null;
  return email;
}
