import 'reflect-metadata';

import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { HttpStatus, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import type { Redis } from 'ioredis';

import { AppModule } from './app.module';
import { AppError } from './common/errors/app-error';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { ErrorCode } from './common/errors/error-codes';
import { buildLoggerOptions, generateRequestId } from './common/logging/logger';
import { loadEnv } from './config/env';
import { createRedisClient } from './redis/redis.module';

async function bootstrap(): Promise<void> {
  // Validated before the container starts so misconfiguration fails loudly at
  // boot rather than on the first request.
  const env = loadEnv();

  const adapter = new FastifyAdapter({
    logger: buildLoggerOptions(env),
    trustProxy: true,
    genReqId: (req: { headers: Record<string, string | string[] | undefined> }) =>
      generateRequestId(req.headers['x-request-id']),
    bodyLimit: 1_048_576,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  app.enableShutdownHooks();

  await app.register(helmet, { contentSecurityPolicy: false });

  // Rate limits are backed by Redis so they hold across every API replica.
  // A per-instance limiter would multiply the real limit by the replica count,
  // which defeats the point once this scales horizontally.
  const rateLimitRedis: Redis = createRedisClient(env, { forQueue: true });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    redis: rateLimitRedis,
    // Feed prefetching makes bursts normal; the window budget is what matters.
    continueExceeding: true,
    keyGenerator: (request: FastifyRequest) => request.ip,
    // Health checks must never be throttled, or a rate-limited spike would
    // look like an outage and trigger a restart loop.
    allowList: (request: FastifyRequest) => request.url.startsWith('/health'),
    // The plugin *throws* whatever this returns, so it must be an
    // HttpException. Returning a plain body object would surface as an
    // unrecognised throw and get reported as a 500.
    errorResponseBuilder: (_request: FastifyRequest, context) =>
      new AppError(
        ErrorCode.RATE_LIMITED,
        `Too many requests. Retry in ${Math.ceil(context.ttl / 1000)}s.`,
        HttpStatus.TOO_MANY_REQUESTS,
      ),
  });

  app.setGlobalPrefix('v1', { exclude: ['health', 'health/ready', '/'] });

  // Request validation is Zod at the route level, not class-validator, so the
  // same schemas can be shared with the mobile and web clients. The exception
  // filter maps a thrown ZodError onto the `validation_failed` envelope.
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: false,
  });

  await app.listen(env.PORT, env.HOST);

  new Logger('Bootstrap').log(`aura-api listening on ${env.HOST}:${env.PORT} [${env.NODE_ENV}]`);
}

void bootstrap();
