import { Controller, Get, Inject } from '@nestjs/common';

import { ENV, type Env } from '../config/env';

/**
 * The API lives at `/v1`. Opening the service domain in a browser hits `/`,
 * which Nest otherwise reports as `Cannot GET /`. Answer with a pointer
 * instead of a 404.
 */
@Controller()
export class RootController {
  constructor(@Inject(ENV) private readonly env: Env) {}

  @Get()
  index(): { service: string; environment: string; health: string } {
    return {
      service: 'aura-api',
      environment: this.env.APP_ENV,
      health: '/health',
    };
  }
}
