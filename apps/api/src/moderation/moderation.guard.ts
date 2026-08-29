import { createHash, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { ENV, type Env } from '../config/env';
import type { Staff } from '../db/schema';
import { canModerate } from '../staff/staff-access';
import { StaffService } from '../staff/staff.service';
import { StaffTokensService } from '../staff/staff-tokens.service';

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

export interface ModerationRequest extends FastifyRequest {
  staff?: Staff;
  staffSessionId?: string;
  moderationVia?: 'staff' | 'key';
}

function bearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : undefined;
}

/**
 * Accepts a staff JWT (any moderating role) or the break-glass
 * `X-Moderation-Key`. Staff is the dashboard path; the key is for scripts.
 *
 * A consumer JWT is refused: audience is `aura-staff`, not `aura-app`.
 */
@Injectable()
export class ModerationGuard implements CanActivate {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly tokens: StaffTokensService,
    private readonly staff: StaffService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ModerationRequest>();
    const token = bearerToken(request);

    if (token) {
      await this.attachStaff(request, token);
      return true;
    }

    if (!this.env.MODERATION_SECRET) {
      throw AppError.unauthorized('Staff session or moderation key required');
    }

    const presented = request.headers['x-moderation-key'];

    if (typeof presented !== 'string' || !secretsEqual(presented, this.env.MODERATION_SECRET)) {
      throw AppError.unauthorized('Invalid moderation key');
    }

    request.moderationVia = 'key';
    return true;
  }

  private async attachStaff(request: ModerationRequest, token: string): Promise<void> {
    const claims = await this.tokens.verifyAccessToken(token);

    if (!(await this.tokens.isSessionActive(claims.sid))) {
      throw AppError.unauthorized('Session is no longer active');
    }

    const member = await this.staff.findById(claims.sub);
    if (!member) throw AppError.unauthorized('Staff account no longer exists');

    if (member.status === 'deactivated') {
      throw new AppError(
        ErrorCode.STAFF_DEACTIVATED,
        'This staff account is no longer active',
        403,
      );
    }

    if (!canModerate(member.role)) {
      throw AppError.forbidden('Your role cannot moderate');
    }

    request.staff = member;
    request.staffSessionId = claims.sid;
    request.moderationVia = 'staff';
  }
}
