import { Controller, Get, HttpCode, HttpStatus, Inject, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { ENV, type Env } from '../config/env';

import { HealthService, type ReadinessReport } from './health.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /**
   * Liveness. Deliberately checks nothing external: this answers "is the
   * process up", and the platform restarts the container when it fails.
   * Wiring dependency checks in here would take the API down during a blip
   * that it could otherwise ride out.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  live(): { status: 'ok'; environment: string; uptimeSeconds: number } {
    // Reporting the environment makes "which deployment am I actually looking
    // at" answerable in one request, instead of inferred from a hostname.
    return {
      status: 'ok',
      environment: this.env.APP_ENV,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }

  /**
   * Readiness. Verifies Postgres and Redis, and returns 503 when either is
   * unreachable so a load balancer stops sending traffic.
   */
  @Get('ready')
  async ready(@Res({ passthrough: true }) reply: FastifyReply): Promise<ReadinessReport> {
    const report = await this.health.readiness();

    if (report.status !== 'ok') {
      void reply.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return report;
  }
}
