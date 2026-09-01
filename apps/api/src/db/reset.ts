import postgres from 'postgres';

import { loadEnv } from '../config/env';

/**
 * Drops every table this app owns and lets the next deploy's migrate step
 * (`node dist/db/migrate.js`, `0000_init.sql`) recreate the schema from
 * scratch.
 *
 * Exists because the redesign squashed migration history into one file
 * (docs/redesign-tracker.md — "there is no upgrade migration from the old
 * schema"). Applying that file to a database that still has the previous
 * tables fails with "relation already exists"; the target has to be empty
 * first. Drops both `public` (the tables) and `drizzle` (drizzle-orm's own
 * migration-tracking table) so the migrator treats the target as brand new
 * rather than skipping `0000_init.sql` as "already applied".
 *
 * Guarded on APP_ENV, same as seed.ts, and for the same reason: staging runs
 * NODE_ENV=production, so that is not a safe guard here.
 */
async function main(): Promise<void> {
  const env = loadEnv();

  if (env.APP_ENV === 'production') {
    throw new Error('Refusing to reset a production database');
  }

  console.log(`[reset] target: APP_ENV=${env.APP_ENV}`);

  const client = postgres(env.DATABASE_URL, {
    max: 1,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    prepare: false,
    onnotice: () => {},
  });

  try {
    console.log('[reset] dropping schemas public, drizzle');
    await client`DROP SCHEMA IF EXISTS public CASCADE`;
    await client`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    await client`CREATE SCHEMA public`;
    console.log('[reset] done — empty database, ready for a fresh migrate');
  } finally {
    await client.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error('[reset] failed', error);
  process.exit(1);
});
