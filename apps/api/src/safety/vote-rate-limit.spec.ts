import { describe, expect, it, vi } from 'vitest';

import { consumeVoteSlot } from './vote-rate-limit';

function fakeRedis(sequence: number[]) {
  let i = 0;
  return {
    incr: vi.fn(() => Promise.resolve(sequence[i++] ?? sequence.at(-1)!)),
    pexpire: vi.fn(() => Promise.resolve(1)),
  };
}

describe('consumeVoteSlot', () => {
  it('allows the first vote and starts the window', async () => {
    const redis = fakeRedis([1]);

    await expect(consumeVoteSlot(redis as never, 'user-1', 60, 60_000)).resolves.toBe(true);
    expect(redis.pexpire).toHaveBeenCalledWith('rl:vote:user-1', 60_000);
  });

  it('rejects once the budget is spent', async () => {
    const redis = fakeRedis([61]);

    await expect(consumeVoteSlot(redis as never, 'user-1', 60, 60_000)).resolves.toBe(false);
    expect(redis.pexpire).not.toHaveBeenCalled();
  });

  it('does not reset the TTL on later votes in the same window', async () => {
    const redis = fakeRedis([2]);

    await expect(consumeVoteSlot(redis as never, 'user-1', 60, 60_000)).resolves.toBe(true);
    expect(redis.pexpire).not.toHaveBeenCalled();
  });
});
