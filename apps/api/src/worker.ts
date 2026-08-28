import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Worker, type Job, type Queue } from 'bullmq';
import type { Redis } from 'ioredis';

import { AppModule } from './app.module';
import { ENV, type Env } from './config/env';
import { QueueName, TrendingJob } from './queue/queue.constants';
import { QUEUE_CONNECTION, TRENDING_QUEUE } from './queue/queue.module';
import { TrendingService } from './trending/trending.service';

const REPEAT_JOB_KEY = 'trending-recompute';

/**
 * Background worker.
 *
 * Runs the same codebase as the API with no HTTP server, so it can be scaled
 * and restarted independently. Deployed as a separate service from the same
 * image with a different start command.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Worker');
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: false });
  app.enableShutdownHooks();

  const env = app.get<Env>(ENV);
  const connection = app.get<Redis>(QUEUE_CONNECTION);
  const trendingQueue = app.get<Queue>(TRENDING_QUEUE);
  const trendingService = app.get(TrendingService);

  // Job schedulers are upserts keyed by id, so redeploying or running several
  // worker replicas re-registers the same schedule instead of stacking
  // duplicate timers.
  await trendingQueue.upsertJobScheduler(
    REPEAT_JOB_KEY,
    { every: env.TRENDING_INTERVAL_MS },
    { name: TrendingJob.RECOMPUTE, data: {} },
  );

  const trendingWorker = new Worker(
    QueueName.TRENDING,
    async (job: Job) => {
      if (job.name !== TrendingJob.RECOMPUTE) {
        throw new Error(`unknown trending job: ${job.name}`);
      }
      return trendingService.recompute();
    },
    { connection, concurrency: 1 },
  );

  trendingWorker.on('failed', (job, error) => {
    logger.error(`trending job ${job?.id ?? 'unknown'} failed: ${error.message}`, error.stack);
  });

  // The media queue is created by QueueModule so the API can enqueue uploads,
  // but its processor lands with the media pipeline (MEDIA-04). Registering a
  // no-op consumer here would silently mark real jobs complete.

  logger.log(
    `worker ready; trending recompute every ${Math.round(env.TRENDING_INTERVAL_MS / 1000)}s`,
  );

  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`received ${signal}, draining workers`);
    // Let in-flight jobs finish before the connection closes, so a deploy does
    // not leave half-processed work behind.
    await trendingWorker.close();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap();
