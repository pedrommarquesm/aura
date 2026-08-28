import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import { AppError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import { ENV, type Env } from '../../config/env';

import type { IdentityProvider, VerifiedIdentity } from './identity-provider';

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_JWKS_URL = new URL('https://appleid.apple.com/auth/keys');

/**
 * Verifies a Sign in with Apple identity token.
 *
 * The device never holds a client secret. It obtains a token from the native
 * sheet and posts it here; we check the signature against Apple's published
 * keys, so a forged token cannot mint a session.
 */
@Injectable()
export class AppleProvider implements IdentityProvider {
  readonly name = 'apple' as const;

  // jose caches the key set and refreshes it on rotation. Constructed once:
  // building it per request would fetch Apple's keys on every sign-in.
  private readonly jwks = createRemoteJWKSet(APPLE_JWKS_URL);

  constructor(@Inject(ENV) private readonly env: Env) {}

  get enabled(): boolean {
    return Boolean(this.env.APPLE_CLIENT_ID);
  }

  async verify(identityToken: string, nonce?: string): Promise<VerifiedIdentity> {
    if (!this.enabled) {
      throw AppError.unavailable('Sign in with Apple is not configured');
    }

    let payload: JWTPayload;

    try {
      ({ payload } = await jwtVerify(identityToken, this.jwks, {
        issuer: APPLE_ISSUER,
        audience: this.env.APPLE_CLIENT_ID,
      }));
    } catch (error) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Apple identity token is not valid', 401, {
        cause: error,
      });
    }

    // The nonce ties the token to the sign-in attempt the app just started,
    // so a token captured elsewhere cannot be replayed here.
    if (nonce && payload.nonce !== nonce) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Apple identity token nonce mismatch', 401);
    }

    if (!payload.sub) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Apple identity token has no subject', 401);
    }

    return {
      subject: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
  }
}
