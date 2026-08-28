import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';
import { TrendingModule } from './trending/trending.module';

/**
 * Shared by the HTTP process and the worker process.
 *
 * Both run the same image with a different entry point, which keeps domain
 * code in one place while letting the two scale independently — media
 * processing is CPU-heavy and must never slow down a like.
 */
@Module({
  imports: [ConfigModule, DbModule, RedisModule, QueueModule, TrendingModule, HealthModule],
})
export class AppModule {}
