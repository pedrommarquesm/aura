import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

import { ENV, type Env } from '../config/env';
import { createRedisClient } from '../redis/redis.module';

import { QueueName } from './queue.constants';

export const QUEUE_CONNECTION = Symbol('QUEUE_CONNECTION');
export const MEDIA_QUEUE = Symbol('MEDIA_QUEUE');
export const TRENDING_QUEUE = Symbol('TRENDING_QUEUE');

const DEFAULT_JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 1_000 },
  // Keep enough history to debug a bad day without letting Redis grow forever.
  removeOnComplete: { age: 3_600, count: 1_000 },
  removeOnFail: { age: 86_400 },
};

/**
 * Owns the BullMQ connection and the queue handles.
 *
 * Loaded by both processes: the API enqueues, the worker consumes. Producing
 * and consuming are separated so a slow media job can never delay a like.
 */
@Global()
@Module({
  providers: [
    {
      provide: QUEUE_CONNECTION,
      inject: [ENV],
      useFactory: (env: Env) => createRedisClient(env, { forQueue: true }),
    },
    {
      provide: MEDIA_QUEUE,
      inject: [QUEUE_CONNECTION],
      useFactory: (connection: Redis) =>
        new Queue(QueueName.MEDIA, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS }),
    },
    {
      provide: TRENDING_QUEUE,
      inject: [QUEUE_CONNECTION],
      useFactory: (connection: Redis) =>
        new Queue(QueueName.TRENDING, {
          connection,
          defaultJobOptions: { ...DEFAULT_JOB_OPTIONS, attempts: 2 },
        }),
    },
  ],
  exports: [QUEUE_CONNECTION, MEDIA_QUEUE, TRENDING_QUEUE],
})
export class QueueModule implements OnApplicationShutdown {
  constructor(
    @Inject(QUEUE_CONNECTION) private readonly connection: Redis,
    @Inject(MEDIA_QUEUE) private readonly mediaQueue: Queue,
    @Inject(TRENDING_QUEUE) private readonly trendingQueue: Queue,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([this.mediaQueue.close(), this.trendingQueue.close()]);
    await this.connection.quit();
  }
}
