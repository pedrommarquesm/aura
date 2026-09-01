import type { Redis } from 'ioredis';

/** Same INCR + expire pattern as votes. Fail closed if Redis is down. */
export async function consumePasswordSlot(
  redis: Redis,
  key: string,
  max: number,
  windowMs: number,
): Promise<boolean> {
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.pexpire(key, windowMs);
  }

  return count <= max;
}
