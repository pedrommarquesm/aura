import { describe, expect, it } from 'vitest';

import { MAX_VOTE_AURA, MIN_VOTE_AURA, isValidVoteAmount } from './vote-amount';

describe('isValidVoteAmount', () => {
  it('accepts any nonzero integer inside the cap', () => {
    expect(isValidVoteAmount(1)).toBe(true);
    expect(isValidVoteAmount(-1)).toBe(true);
    expect(isValidVoteAmount(85)).toBe(true);
    expect(isValidVoteAmount(-85)).toBe(true);
    expect(isValidVoteAmount(MAX_VOTE_AURA)).toBe(true);
    expect(isValidVoteAmount(MIN_VOTE_AURA)).toBe(true);
  });

  it('rejects zero — a 0 release is a client-side cancel, never a vote (Q2)', () => {
    expect(isValidVoteAmount(0)).toBe(false);
  });

  it('rejects anything outside the +/-100 cap (Q7)', () => {
    expect(isValidVoteAmount(101)).toBe(false);
    expect(isValidVoteAmount(-101)).toBe(false);
    expect(isValidVoteAmount(200)).toBe(false);
    expect(isValidVoteAmount(-500)).toBe(false);
  });

  it('rejects non-integers and non-numbers', () => {
    expect(isValidVoteAmount(45.5)).toBe(false);
    expect(isValidVoteAmount('45')).toBe(false);
    expect(isValidVoteAmount(null)).toBe(false);
    expect(isValidVoteAmount(undefined)).toBe(false);
  });
});
