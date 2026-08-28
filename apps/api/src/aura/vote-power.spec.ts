import { describe, expect, it } from 'vitest';

import { BASE_LIKE_AURA, auraForLike, auraForSuperLike } from './vote-power';

const newcomer = { id: 'u1', aura: 0, votePower: '1' };
const whale = { id: 'u2', aura: 5_000_000, votePower: '3.4' };

describe('auraForLike', () => {
  it('awards the flat base rate in V0', () => {
    expect(auraForLike(newcomer)).toBe(BASE_LIKE_AURA);
  });

  it('does not yet vary by the voter, so Vote Power is genuinely off', () => {
    expect(auraForLike(whale)).toBe(auraForLike(newcomer));
  });

  it('is an integer, because Aura is never fractional', () => {
    expect(Number.isInteger(auraForLike(whale))).toBe(true);
    expect(Number.isInteger(auraForSuperLike(whale))).toBe(true);
  });

  it('uses a base above 1 so V1 can multiply without decimals', () => {
    // A 1.4x multiplier has to land on a whole number. With a base of 1 it
    // could not, and the economy would need floats.
    expect(BASE_LIKE_AURA).toBeGreaterThan(1);
    expect(Number.isInteger(BASE_LIKE_AURA * 1.4)).toBe(true);
    expect(Number.isInteger(BASE_LIKE_AURA * 2.4)).toBe(true);
  });
});
