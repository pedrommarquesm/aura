import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('WaitlistService claim seam', () => {
  const source = readFileSync('src/waitlist/waitlist.service.ts', 'utf8');

  it('ports waitlist Aura through the ledger as BONUS', () => {
    expect(source).toContain("type: 'BONUS'");
    expect(source).toContain('waitlistClaimIdempotencyKey');
    expect(source).toContain("source: 'waitlist'");
  });

  it('refuses to claim a row that already belongs to an account', () => {
    expect(source).toContain('isNull(waitlistEntries.claimedUserId)');
  });

  it('does not mint ledger Aura at join time', () => {
    expect(source).not.toMatch(/this\.ledger\.apply[\s\S]*JOIN/);
    expect(source).toContain('aura: JOIN_AURA');
  });
});

describe('WaitlistService referral awards', () => {
  const source = readFileSync('src/waitlist/waitlist.service.ts', 'utf8');

  it('stores the referrer at join but pays them only when the friend signs up', () => {
    expect(source).toContain('referredById: referrer?.id ?? null');
    expect(source).not.toMatch(/await this\.creditReferrer\(/);
    expect(source).toContain('creditReferrerOnClaim');
    expect(source).toContain('waitlistReferralIdempotencyKey');
    expect(source).toContain("source: 'waitlist_referral'");
    expect(source).toContain('waitlist_joined');
    expect(source).toContain('waitlist_referral');
  });

  it('ignores a self-referral', () => {
    expect(source).toContain('referrer.email === joinerEmail');
  });
});

describe('WaitlistService submit limits', () => {
  const source = readFileSync('src/waitlist/waitlist.service.ts', 'utf8');

  it('rate-limits new joins per IP, per email, and globally', () => {
    expect(source).toContain('rl:waitlist:${ip}');
    expect(source).toContain('rl:waitlist:email:');
    expect(source).toContain('rl:waitlist:global');
    expect(source).toContain('WAITLIST_EMAIL_RATE_LIMIT_MAX');
    expect(source).toContain('WAITLIST_GLOBAL_RATE_LIMIT_MAX');
  });

  it('still spends an IP slot on a garbage email', () => {
    expect(source).toContain('assertJoinLimits(ip, null)');
  });
});
