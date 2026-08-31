import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

describe('AuthService waitlist claim', () => {
  const source = readFileSync('src/auth/auth.service.ts', 'utf8');

  it('ports early-beta Aura when a matching email signs in', () => {
    expect(source).toContain('waitlist.claimForAccount');
    expect(source).toContain('identity.email');
  });

  it('does not let a claim failure block sign-in', () => {
    expect(source).toContain('must never block sign-in');
  });
});
