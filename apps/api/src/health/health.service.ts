import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import type postgres from 'postgres';

import { PG_CLIENT } from '../db/db.module';
import { REDIS } from '../redis/redis.module';

export type CheckStatus = 'ok' | 'error';

export interface DependencyCheck {
  status: CheckStatus;
  latencyMs: number;
  error?: string;
}

export interface ReadinessReport {
  status: CheckStatus;
  checks: {
    database: DependencyCheck;
    redis: DependencyCheck;
  };
}

const CHECK_TIMEOUT_MS = 2_000;

@Injectable()
export class HealthService {
  constructor(
    @Inject(PG_CLIENT) private readonly pg: postgres.Sql,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async readiness(): Promise<ReadinessReport> {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);

    return {
      status: database.status === 'ok' && redis.status === 'ok' ? 'ok' : 'error',
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<DependencyCheck> {
    return this.timed(async () => {
      await this.pg`SELECT 1`;
    });
  }

  private async checkRedis(): Promise<DependencyCheck> {
    return this.timed(async () => {
      await this.redis.ping();
    });
  }

  private async timed(probe: () => Promise<void>): Promise<DependencyCheck> {
    const startedAt = Date.now();

    try {
      await this.withTimeout(probe());
      return { status: 'ok', latencyMs: Date.now() - startedAt };
    } catch (error) {
      return {
        status: 'error',
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : 'unknown error',
      };
    }
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        promise,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error(`check timed out after ${CHECK_TIMEOUT_MS}ms`)),
            CHECK_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
