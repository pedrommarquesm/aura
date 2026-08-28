import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

import { HealthService, type ReadinessReport } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Liveness. Deliberately checks nothing external: this answers "is the
   * process up", and the platform restarts the container when it fails.
   * Wiring dependency checks in here would take the API down during a blip
   * that it could otherwise ride out.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  live(): { status: 'ok'; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.round(process.uptime()) };
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
