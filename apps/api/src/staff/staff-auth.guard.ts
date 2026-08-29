import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import type { Staff } from '../db/schema';

import { StaffService } from './staff.service';
import { StaffTokensService } from './staff-tokens.service';

export interface StaffRequest extends FastifyRequest {
  staff?: Staff;
  staffSessionId?: string;
}

function bearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;

  const token = header.slice(7).trim();
  return token.length > 0 ? token : undefined;
}

@Injectable()
export class StaffAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: StaffTokensService,
    private readonly staff: StaffService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<StaffRequest>();
    const token = bearerToken(request);

    if (!token) throw AppError.unauthorized();

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

    request.staff = member;
    request.staffSessionId = claims.sid;
    return true;
  }
}
