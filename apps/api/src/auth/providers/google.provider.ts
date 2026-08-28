import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import { AppError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import { ENV, type Env } from '../../config/env';

import type { IdentityProvider, VerifiedIdentity } from './identity-provider';

const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];
const GOOGLE_JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');

@Injectable()
export class GoogleProvider implements IdentityProvider {
  readonly name = 'google' as const;

  private readonly jwks = createRemoteJWKSet(GOOGLE_JWKS_URL);

  constructor(@Inject(ENV) private readonly env: Env) {}

  /**
   * iOS, Android, and web each get their own OAuth client id, and the token's
   * `aud` is whichever one requested it — so all of them must be accepted.
   */
  private get audiences(): string[] {
    return (this.env.GOOGLE_CLIENT_IDS ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  get enabled(): boolean {
    return this.audiences.length > 0;
  }

  async verify(identityToken: string, nonce?: string): Promise<VerifiedIdentity> {
    if (!this.enabled) {
      throw AppError.unavailable('Google Sign-In is not configured');
    }

    let payload: JWTPayload;

    try {
      ({ payload } = await jwtVerify(identityToken, this.jwks, {
        issuer: GOOGLE_ISSUERS,
        audience: this.audiences,
      }));
    } catch (error) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Google identity token is not valid', 401, {
        cause: error,
      });
    }

    if (nonce && payload.nonce !== nonce) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Google identity token nonce mismatch', 401);
    }

    if (!payload.sub) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Google identity token has no subject', 401);
    }

    return {
      subject: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : undefined,
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
  }
}
