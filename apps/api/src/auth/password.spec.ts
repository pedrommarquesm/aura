import { describe, expect, it } from 'vitest';

import {
  hashPassword,
  linkableOauthEmail,
  looksLikeEmail,
  normalizeEmail,
  verifyPassword,
} from './password';

describe('hashPassword / verifyPassword', () => {
  it('accepts the original password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct-horse');

    expect(await verifyPassword('correct-horse', stored)).toBe(true);
    expect(await verifyPassword('wrong-horse', stored)).toBe(false);
  });

  it('rejects a truncated or foreign hash string', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('anything', 'scrypt$1$1$1$xxx')).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  E2E@AuraClimb.TEST  ')).toBe('e2e@auraclimb.test');
  });
});

describe('looksLikeEmail', () => {
  it('splits identifier routing on @', () => {
    expect(looksLikeEmail('alice')).toBe(false);
    expect(looksLikeEmail('alice@aura.test')).toBe(true);
  });
});

describe('linkableOauthEmail', () => {
  it('accepts a real inbox the user could have typed', () => {
    expect(linkableOauthEmail('  Tester@Aura.TEST  ')).toBe('tester@aura.test');
  });

  it('refuses Apple Hide My Email and a missing address', () => {
    expect(linkableOauthEmail(null)).toBeNull();
    expect(linkableOauthEmail('abc@privaterelay.appleid.com')).toBeNull();
  });
});
