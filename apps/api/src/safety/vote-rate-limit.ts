import type { Redis } from 'ioredis';

/**
 * Sliding-window-ish vote budget: INCR + expire on first hit.
 *
 * Redis is the source of this limit. If it is down we fail closed — a script
 * probing the vote endpoint during an outage is worse than a few honest votes
 * waiting a second. Tighter than the old like limit by default: every call
 * here is now a permanent, capped-at-100 economic event, not a togglable
 * like (docs/redesign-tracker.md, "Economy notes" §7).
 */
export async function consumeVoteSlot(
  redis: Redis,
  userId: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const key = `rl:vote:${userId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.pexpire(key, windowMs);
  }

  return count <= max;
}
