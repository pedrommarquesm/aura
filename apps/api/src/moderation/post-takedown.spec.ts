import { describe, expect, it } from 'vitest';

import { takedownIdempotencyKey, takedownReversalAmount } from './post-takedown';

describe('takedownReversalAmount', () => {
  it('reverses the remaining post Aura as a negative integer', () => {
    expect(takedownReversalAmount(30)).toBe(-30);
  });

  it('writes nothing when the post never earned Aura', () => {
    expect(takedownReversalAmount(0)).toBeNull();
  });

  it('does not invent a positive grant if the counter already went negative', () => {
    // A leftover negative would mean a prior reversal overshot. Writing a
    // compensating LIKE here would hide that bug in the ledger.
    expect(takedownReversalAmount(-10)).toBeNull();
  });

  it('refuses a fractional amount rather than rounding it', () => {
    expect(() => takedownReversalAmount(10.5)).toThrow(/integer/);
  });
});

describe('takedownIdempotencyKey', () => {
  it('is stable for the first pass so a retried takedown cannot double-reverse', () => {
    expect(takedownIdempotencyKey('post_1')).toBe('takedown:post_1');
    expect(takedownIdempotencyKey('post_1', 0)).toBe('takedown:post_1');
  });

  it('namespaces later passes so a raced like can still be reversed', () => {
    expect(takedownIdempotencyKey('post_1', 1)).toBe('takedown:post_1:1');
  });
});
