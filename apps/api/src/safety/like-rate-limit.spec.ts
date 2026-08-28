import { describe, expect, it, vi } from 'vitest';

import { consumeLikeSlot } from './like-rate-limit';

function fakeRedis(sequence: number[]) {
  let i = 0;
  return {
    incr: vi.fn(() => Promise.resolve(sequence[i++] ?? sequence.at(-1)!)),
    pexpire: vi.fn(() => Promise.resolve(1)),
  };
}

describe('consumeLikeSlot', () => {
  it('allows the first like and starts the window', async () => {
    const redis = fakeRedis([1]);

    await expect(consumeLikeSlot(redis as never, 'user-1', 60, 60_000)).resolves.toBe(true);
    expect(redis.pexpire).toHaveBeenCalledWith('rl:like:user-1', 60_000);
  });

  it('rejects once the budget is spent', async () => {
    const redis = fakeRedis([61]);

    await expect(consumeLikeSlot(redis as never, 'user-1', 60, 60_000)).resolves.toBe(false);
    expect(redis.pexpire).not.toHaveBeenCalled();
  });

  it('does not reset the TTL on later likes in the same window', async () => {
    const redis = fakeRedis([2]);

    await expect(consumeLikeSlot(redis as never, 'user-1', 60, 60_000)).resolves.toBe(true);
    expect(redis.pexpire).not.toHaveBeenCalled();
  });
});
