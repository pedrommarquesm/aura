import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { newId } from '../common/ids';
import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { deviceSessions } from '../db/schema';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface DeviceInfo {
  deviceName?: string | undefined;
  platform?: string | undefined;
  appVersion?: string | undefined;
  ip?: string | undefined;
}

interface AccessTokenClaims {
  sub: string;
  sid: string;
}

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);
  private readonly secret: Uint8Array;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
  ) {
    this.secret = new TextEncoder().encode(env.JWT_SECRET);
  }

  /**
   * Refresh tokens are opaque random strings, not JWTs, so they carry no
   * claims and mean nothing without the matching database row.
   *
   * Only the hash is stored: a leaked database dump must not yield usable
   * sessions.
   */
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async signAccessToken(userId: string, sessionId: string): Promise<string> {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setIssuer('aura')
      .setAudience('aura-app')
      .setExpirationTime(`${this.env.ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(this.secret);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: 'aura',
        audience: 'aura-app',
      });

      if (!payload.sub || typeof payload.sid !== 'string') {
        throw new Error('missing claims');
      }

      return { sub: payload.sub, sid: payload.sid };
    } catch (error) {
      const expired = error instanceof Error && error.constructor.name === 'JWTExpired';

      throw new AppError(
        expired ? ErrorCode.TOKEN_EXPIRED : ErrorCode.INVALID_TOKEN,
        expired ? 'Access token expired' : 'Access token is not valid',
        401,
        { cause: error },
      );
    }
  }

  /** Starts a new session family for a fresh sign-in. */
  async issue(userId: string, device: DeviceInfo = {}): Promise<IssuedTokens> {
    const sessionId = newId();
    const familyId = newId();
    const refreshToken = randomBytes(32).toString('base64url');

    await this.db.insert(deviceSessions).values({
      id: sessionId,
      userId,
      refreshTokenHash: this.hash(refreshToken),
      familyId,
      deviceName: device.deviceName ?? null,
      platform: device.platform ?? null,
      appVersion: device.appVersion ?? null,
      ipAtIssue: device.ip ?? null,
      expiresAt: this.expiryDate(),
    });

    return {
      accessToken: await this.signAccessToken(userId, sessionId),
      refreshToken,
      expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  /**
   * Rotates a refresh token, with reuse detection.
   *
   * Each refresh invalidates the token it consumed. If an already-used token
   * is presented again it was captured and replayed, so the **entire family**
   * is revoked and the user must sign in again. This is the highest-value
   * control in the whole auth design, and it is nearly free.
   *
   * The cost of getting it wrong is subtle: clients that fire several refreshes
   * concurrently will trip it and log users out for no reason. That is why the
   * apps funnel refreshes through a single in-flight request.
   */
  async rotate(refreshToken: string, device: DeviceInfo = {}): Promise<IssuedTokens> {
    const presentedHash = this.hash(refreshToken);

    const session = await this.db.query.deviceSessions.findFirst({
      where: (table, { eq: equals }) => equals(table.refreshTokenHash, presentedHash),
    });

    if (!session) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Refresh token is not valid', 401);
    }

    if (session.revokedAt) {
      // A revoked token being presented means it was stolen and replayed, or
      // the family was already burned. Either way, burn what is left.
      await this.revokeFamily(session.familyId);

      this.logger.warn(
        `refresh token reuse detected for user ${session.userId}; family ${session.familyId} revoked`,
      );

      throw new AppError(
        ErrorCode.REFRESH_REUSE_DETECTED,
        'This session was ended for security reasons. Please sign in again.',
        401,
      );
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new AppError(ErrorCode.TOKEN_EXPIRED, 'Refresh token expired', 401);
    }

    const nextSessionId = newId();
    const nextRefreshToken = randomBytes(32).toString('base64url');

    await this.db.transaction(async (tx) => {
      await tx
        .update(deviceSessions)
        .set({ revokedAt: new Date() })
        .where(eq(deviceSessions.id, session.id));

      await tx.insert(deviceSessions).values({
        id: nextSessionId,
        userId: session.userId,
        refreshTokenHash: this.hash(nextRefreshToken),
        // Same family: the lineage is what makes replay detectable.
        familyId: session.familyId,
        deviceName: device.deviceName ?? session.deviceName,
        platform: device.platform ?? session.platform,
        appVersion: device.appVersion ?? session.appVersion,
        ipAtIssue: device.ip ?? session.ipAtIssue,
        expiresAt: this.expiryDate(),
      });
    });

    return {
      accessToken: await this.signAccessToken(session.userId, nextSessionId),
      refreshToken: nextRefreshToken,
      expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.db
      .update(deviceSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(deviceSessions.id, sessionId), isNull(deviceSessions.revokedAt)));
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(deviceSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(deviceSessions.familyId, familyId), isNull(deviceSessions.revokedAt)));
  }

  /** Used when a user is suspended or banned: every device loses access. */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.db
      .update(deviceSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(deviceSessions.userId, userId), isNull(deviceSessions.revokedAt)));
  }

  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.db.query.deviceSessions.findFirst({
      where: (table, { eq: equals }) => equals(table.id, sessionId),
    });

    return Boolean(session && !session.revokedAt && session.expiresAt.getTime() > Date.now());
  }

  private expiryDate(): Date {
    return new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }
}
