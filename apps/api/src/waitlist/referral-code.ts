import { randomBytes } from 'node:crypto';

/**
 * Crockford-ish alphabet: no 0/O, 1/I/L. Eight characters is short enough to
 * read off a screenshot and long enough that guessing is not a hobby.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export const REFERRAL_CODE_LENGTH = 8;

export const REFERRAL_CODE_PATTERN = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;

export function generateReferralCode(): string {
  const bytes = randomBytes(REFERRAL_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < REFERRAL_CODE_LENGTH; i += 1) {
    code += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return code;
}

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return REFERRAL_CODE_PATTERN.test(code) ? code : null;
}

export const JOIN_AURA = 10;
export const REFERRAL_AURA = 10;

export function waitlistClaimIdempotencyKey(entryId: string): string {
  return `waitlist-claim:${entryId}`;
}

/** One referral payout per joiner, even if claim or mail retries. */
export function waitlistReferralIdempotencyKey(joinerId: string): string {
  return `waitlist-referral:${joinerId}`;
}
