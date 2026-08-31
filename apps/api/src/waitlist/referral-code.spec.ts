import { describe, expect, it } from 'vitest';

import {
  generateReferralCode,
  JOIN_AURA,
  normalizeReferralCode,
  REFERRAL_AURA,
  REFERRAL_CODE_LENGTH,
  REFERRAL_CODE_PATTERN,
  waitlistClaimIdempotencyKey,
} from './referral-code';
import { parseWaitlistEmail } from './waitlist-email';

describe('referral codes', () => {
  it('generates an 8-character unambiguous code', () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(REFERRAL_CODE_LENGTH);
    expect(code).toMatch(REFERRAL_CODE_PATTERN);
    expect(code).not.toMatch(/[01ILO]/);
  });

  it('does not emit the same code twice in a short burst', () => {
    const codes = new Set(Array.from({ length: 40 }, () => generateReferralCode()));
    expect(codes.size).toBe(40);
  });

  it('normalises case and rejects junk', () => {
    expect(normalizeReferralCode('ab23cd45')).toBe('AB23CD45');
    expect(normalizeReferralCode('  ab23cd45  ')).toBe('AB23CD45');
    expect(normalizeReferralCode('too-short')).toBeNull();
    expect(normalizeReferralCode('ILO0ILO0')).toBeNull();
    expect(normalizeReferralCode(null)).toBeNull();
  });

  it('keeps claim writes retry-safe', () => {
    expect(waitlistClaimIdempotencyKey('w_1')).toBe('waitlist-claim:w_1');
  });

  it('awards a flat 10 for joining and 10 per referral', () => {
    expect(JOIN_AURA).toBe(10);
    expect(REFERRAL_AURA).toBe(10);
  });
});

describe('waitlist email', () => {
  it('lowercases and trims', () => {
    expect(parseWaitlistEmail('  Alex@Aura.COM ')).toBe('alex@aura.com');
  });

  it('rejects values that are not an email', () => {
    expect(parseWaitlistEmail('')).toBeNull();
    expect(parseWaitlistEmail('not-an-email')).toBeNull();
    expect(parseWaitlistEmail('@aura.com')).toBeNull();
  });
});
