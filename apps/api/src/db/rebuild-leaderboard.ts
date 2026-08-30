import { ne } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import Redis from 'ioredis';
import postgres from 'postgres';

import { loadEnv } from '../config/env';

import { users } from './schema';

/**
 * Rebuilds `lb:global` from `users.aura`.
 *
 * Redis is a projection. A like or a post delete on a cold set would otherwise
 * `ZINCRBY` a single member into existence and the board would show that one
 * row until someone seeds again. Safe on staging and production — it does not
 * touch Postgres.
 */
async function main(): Promise<void> {
  const env = loadEnv();

  const client = postgres(env.DATABASE_URL, {
    max: 1,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    prepare: false,
    onnotice: () => {},
  });
  const redis = new Redis(env.REDIS_URL);

  try {
    const rows = await drizzle(client)
      .select({ id: users.id, aura: users.aura })
      .from(users)
      .where(ne(users.status, 'banned'));

    const pipeline = redis.pipeline();
    pipeline.del('lb:global');
    for (const row of rows) {
      pipeline.zadd('lb:global', row.aura, row.id);
    }
    await pipeline.exec();

    console.log(`[rebuild-leaderboard] wrote ${rows.length} members to lb:global`);
  } finally {
    redis.disconnect();
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error('[rebuild-leaderboard] failed', error);
  process.exit(1);
});
