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

  it('credits the referrer after a new join', () => {
    expect(source).toContain('creditReferrer');
    expect(source).toContain('waitlist_referral');
    expect(source).toContain('waitlist_joined');
  });

  it('ignores a self-referral', () => {
    expect(source).toContain('referrer.email === joinerEmail');
  });
});
