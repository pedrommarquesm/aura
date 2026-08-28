import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';

import { ENV, type Env } from '../config/env';

export const REDIS = Symbol('REDIS');

export function createRedisClient(env: Env, options: { forQueue?: boolean } = {}): Redis {
  return new Redis(env.REDIS_URL, {
    // BullMQ blocks on commands and requires this to be null; a retry limit
    // would make long-lived workers give up and stall the queue.
    maxRetriesPerRequest: options.forQueue ? null : 3,
    enableReadyCheck: true,
    lazyConnect: false,
    retryStrategy: (attempt) => Math.min(attempt * 200, 5_000),
  });
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ENV],
      useFactory: (env: Env) => createRedisClient(env),
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
