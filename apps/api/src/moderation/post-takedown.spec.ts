import { describe, expect, it } from 'vitest';

import { takedownIdempotencyKey, takedownReversalAmount } from './post-takedown';

describe('takedownReversalAmount', () => {
  it('reverses the remaining post Aura as a negative integer', () => {
    expect(takedownReversalAmount(30)).toBe(-30);
  });

  it('writes nothing when the post is exactly at zero', () => {
    expect(takedownReversalAmount(0)).toBeNull();
  });

  it('reverses a negative balance (Aura Debt) back up to zero', () => {
    // A "Cooked" post in debt must contribute 0 net Aura once removed, the
    // same as a post that earned positive Aura.
    expect(takedownReversalAmount(-10)).toBe(10);
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
