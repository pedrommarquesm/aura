import type { Redis } from 'ioredis';

/**
 * Sliding-window-ish like budget: INCR + expire on first hit.
 *
 * Redis is the source of this limit. If it is down we fail closed — a like-ring
 * during an outage is worse than a few honest likes waiting a second.
 */
export async function consumeLikeSlot(
  redis: Redis,
  userId: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const key = `rl:like:${userId}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.pexpire(key, windowMs);
  }

  return count <= max;
}
