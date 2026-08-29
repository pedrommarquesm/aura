import { createHash, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AppError } from '../common/errors/app-error';
import { ENV, type Env } from '../config/env';

/**
 * Compare without leaking the secret length or allowing a byte-by-byte guess.
 * Hashing both sides first keeps `timingSafeEqual` happy when the presented
 * value is a different length from the configured one.
 */
export function secretsEqual(presented: string, expected: string): boolean {
  const left = createHash('sha256').update(presented).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

/**
 * The V0 stand-in for an admin dashboard (TS-12).
 *
 * A shared secret in `X-Moderation-Key` is enough to suspend, ban, and take
 * posts down from staging without inventing a second auth system. Unset means
 * the routes are parked — they 503 rather than fail open.
 */
@Injectable()
export class ModerationGuard implements CanActivate {
  constructor(@Inject(ENV) private readonly env: Env) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.env.MODERATION_SECRET) {
      throw AppError.unavailable('Moderation is not configured');
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const presented = request.headers['x-moderation-key'];

    if (typeof presented !== 'string' || !secretsEqual(presented, this.env.MODERATION_SECRET)) {
      throw AppError.unauthorized('Invalid moderation key');
    }

    return true;
  }
}
