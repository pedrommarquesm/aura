import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { loadEnv } from '../config/env';

/**
 * Standalone migration runner.
 *
 * Runs as the deploy's pre-deploy step so schema changes land before the new
 * code serves traffic. Uses its own single connection and exits, rather than
 * booting the Nest container.
 */
async function main(): Promise<void> {
  const env = loadEnv();

  const client = postgres(env.DATABASE_URL, {
    max: 1,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    prepare: false,
    onnotice: () => {},
  });

  try {
    console.log('[migrate] applying migrations');
    await migrate(drizzle(client), { migrationsFolder: `${__dirname}/../../drizzle` });
    console.log('[migrate] up to date');
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error('[migrate] failed', error);
  process.exit(1);
});
