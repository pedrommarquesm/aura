import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { AppError } from '../common/errors/app-error';
import type { User } from '../db/schema';

import { AuthService } from './auth.service';
import { TokensService } from './tokens.service';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: User;
  sessionId?: string;
}

function bearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;

  const token = header.slice(7).trim();
  return token.length > 0 ? token : undefined;
}

async function attachUser(
  request: AuthenticatedRequest,
  tokens: TokensService,
  auth: AuthService,
  token: string,
): Promise<void> {
  const claims = await tokens.verifyAccessToken(token);

  // Access tokens are stateless so the hot paths validate without a database
  // round trip, but a banned or logged-out user must lose access immediately
  // rather than when their token happens to expire. Hence the session check.
  if (!(await tokens.isSessionActive(claims.sid))) {
    throw AppError.unauthorized('Session is no longer active');
  }

  const user = await auth.findUserById(claims.sub);

  if (!user) throw AppError.unauthorized('Account no longer exists');
  if (user.status !== 'active') throw AppError.forbidden('This account is not active');

  request.user = user;
  request.sessionId = claims.sid;
}

/** Requires a valid session. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request);

    if (!token) throw AppError.unauthorized();

    await attachUser(request, this.tokens, this.auth, token);
    return true;
  }
}

/**
 * Attaches the user when a valid token is present, and allows the request
 * through when it is not.
 *
 * This is what makes guest browsing work: a new install scrolls the feed
 * immediately and only hits an auth prompt on its first Aura action, which
 * converts far better than a cold signup wall. An invalid token is still
 * rejected — silently treating it as anonymous would hide client bugs and
 * quietly downgrade a signed-in user to a guest feed.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: TokensService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerToken(request);

    if (token) {
      await attachUser(request, this.tokens, this.auth, token);
    }

    return true;
  }
}
