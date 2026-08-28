import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { ENV, type Env } from '../config/env';

import * as schema from './schema';

export const DB = Symbol('DB');
export const PG_CLIENT = Symbol('PG_CLIENT');

export type Database = PostgresJsDatabase<typeof schema>;

export function createPostgresClient(env: Env): postgres.Sql {
  return postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
    ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
    // Prepared statements are disabled because a connection pooler in
    // transaction mode (PgBouncer, which we expect to need well before we need
    // more database) cannot support them. Paying that cost now avoids a
    // confusing failure the day pooling is switched on.
    prepare: false,
    connect_timeout: 10,
    idle_timeout: 30,
    onnotice: () => {},
  });
}

@Global()
@Module({
  providers: [
    {
      provide: PG_CLIENT,
      inject: [ENV],
      useFactory: (env: Env) => createPostgresClient(env),
    },
    {
      provide: DB,
      inject: [PG_CLIENT],
      useFactory: (client: postgres.Sql): Database => drizzle(client, { schema }),
    },
  ],
  exports: [DB, PG_CLIENT],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG_CLIENT) private readonly client: postgres.Sql) {}

  async onApplicationShutdown(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
