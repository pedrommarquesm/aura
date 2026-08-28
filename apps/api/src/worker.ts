import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Worker, type Job, type Queue } from 'bullmq';
import type { Redis } from 'ioredis';

import { AppModule } from './app.module';
import { ENV, type Env } from './config/env';
import { ProcessMediaService } from './media/process-media.service';
import { SweepOrphansService } from './media/sweep-orphans.service';
import { MediaJob, QueueName, TrendingJob, type MediaProcessPayload } from './queue/queue.constants';
import { MEDIA_QUEUE, QUEUE_CONNECTION, TRENDING_QUEUE } from './queue/queue.module';
import { TrendingService } from './trending/trending.service';

const TRENDING_REPEAT_JOB_KEY = 'trending-recompute';
const MEDIA_SWEEP_JOB_KEY = 'media-orphan-sweep';

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
  const mediaQueue = app.get<Queue>(MEDIA_QUEUE);
  const trendingService = app.get(TrendingService);
  const processMedia = app.get(ProcessMediaService);
  const sweepOrphans = app.get(SweepOrphansService);

  // Job schedulers are upserts keyed by id, so redeploying or running several
  // worker replicas re-registers the same schedule instead of stacking
  // duplicate timers.
  await trendingQueue.upsertJobScheduler(
    TRENDING_REPEAT_JOB_KEY,
    { every: env.TRENDING_INTERVAL_MS },
    { name: TrendingJob.RECOMPUTE, data: {} },
  );

  await mediaQueue.upsertJobScheduler(
    MEDIA_SWEEP_JOB_KEY,
    { every: 60 * 60 * 1000 },
    { name: MediaJob.SWEEP, data: {} },
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

  const mediaWorker = new Worker(
    QueueName.MEDIA,
    async (job: Job) => {
      if (job.name === MediaJob.SWEEP) {
        return sweepOrphans.sweep();
      }
      if (job.name !== MediaJob.PROCESS) {
        throw new Error(`unknown media job: ${job.name}`);
      }
      const payload = job.data as MediaProcessPayload;
      return processMedia.process(payload);
    },
    { connection, concurrency: 2 },
  );

  mediaWorker.on('failed', (job, error) => {
    logger.error(`media job ${job?.id ?? 'unknown'} failed: ${error.message}`, error.stack);
  });

  logger.log(
    `worker ready; trending every ${Math.round(env.TRENDING_INTERVAL_MS / 1000)}s, media orphans hourly`,
  );

  const shutdown = async (signal: string): Promise<void> => {
    logger.log(`received ${signal}, draining workers`);
    // Let in-flight jobs finish before the connection closes, so a deploy does
    // not leave half-processed work behind.
    await Promise.all([trendingWorker.close(), mediaWorker.close()]);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap();
