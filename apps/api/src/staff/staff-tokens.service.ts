import { createHash, randomBytes } from 'node:crypto';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { SignJWT, jwtVerify } from 'jose';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { newId } from '../common/ids';
import { ENV, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { staff, staffSessions } from '../db/schema';

import type { DeviceInfo, IssuedTokens } from '../auth/tokens.service';

export const STAFF_TOKEN_ISSUER = 'aura';
export const STAFF_TOKEN_AUDIENCE = 'aura-staff';

interface StaffAccessClaims {
  sub: string;
  sid: string;
}

@Injectable()
export class StaffTokensService {
  private readonly logger = new Logger(StaffTokensService.name);
  private readonly secret: Uint8Array;

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(DB) private readonly db: Database,
  ) {
    this.secret = new TextEncoder().encode(env.JWT_SECRET);
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async signAccessToken(staffId: string, sessionId: string): Promise<string> {
    return new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(staffId)
      .setIssuedAt()
      .setIssuer(STAFF_TOKEN_ISSUER)
      .setAudience(STAFF_TOKEN_AUDIENCE)
      .setExpirationTime(`${this.env.ACCESS_TOKEN_TTL_SECONDS}s`)
      .sign(this.secret);
  }

  async verifyAccessToken(token: string): Promise<StaffAccessClaims> {
    try {
      const { payload } = await jwtVerify(token, this.secret, {
        issuer: STAFF_TOKEN_ISSUER,
        audience: STAFF_TOKEN_AUDIENCE,
      });

      if (!payload.sub || typeof payload.sid !== 'string') {
        throw new Error('missing claims');
      }

      return { sub: payload.sub, sid: payload.sid };
    } catch (error) {
      const expired = error instanceof Error && error.constructor.name === 'JWTExpired';

      throw new AppError(
        expired ? ErrorCode.TOKEN_EXPIRED : ErrorCode.INVALID_TOKEN,
        expired ? 'Staff access token expired' : 'Staff access token is not valid',
        401,
        { cause: error },
      );
    }
  }

  async issue(staffId: string, device: DeviceInfo = {}): Promise<IssuedTokens> {
    const sessionId = newId();
    const familyId = newId();
    const refreshToken = randomBytes(32).toString('base64url');

    await this.db.insert(staffSessions).values({
      id: sessionId,
      staffId,
      refreshTokenHash: this.hash(refreshToken),
      familyId,
      deviceName: device.deviceName ?? null,
      platform: device.platform ?? null,
      appVersion: device.appVersion ?? null,
      ipAtIssue: device.ip ?? null,
      expiresAt: this.expiryDate(),
    });

    return {
      accessToken: await this.signAccessToken(staffId, sessionId),
      refreshToken,
      expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async rotate(refreshToken: string, device: DeviceInfo = {}): Promise<IssuedTokens> {
    const presentedHash = this.hash(refreshToken);

    const session = await this.db.query.staffSessions.findFirst({
      where: (table, { eq: equals }) => equals(table.refreshTokenHash, presentedHash),
    });

    if (!session) {
      throw new AppError(ErrorCode.INVALID_TOKEN, 'Staff refresh token is not valid', 401);
    }

    const [owner] = await this.db
      .select({ status: staff.status })
      .from(staff)
      .where(eq(staff.id, session.staffId));

    if (!owner || owner.status === 'deactivated') {
      await this.revokeAllForStaff(session.staffId);
      throw new AppError(
        ErrorCode.STAFF_DEACTIVATED,
        'This staff account is no longer active',
        403,
      );
    }

    if (session.revokedAt) {
      await this.revokeFamily(session.familyId);

      this.logger.warn(
        `staff refresh token reuse detected for ${session.staffId}; family ${session.familyId} revoked`,
      );

      throw new AppError(
        ErrorCode.REFRESH_REUSE_DETECTED,
        'This session was ended for security reasons. Please sign in again.',
        401,
      );
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new AppError(ErrorCode.TOKEN_EXPIRED, 'Staff refresh token expired', 401);
    }

    const nextSessionId = newId();
    const nextRefreshToken = randomBytes(32).toString('base64url');

    await this.db.transaction(async (tx) => {
      await tx
        .update(staffSessions)
        .set({ revokedAt: new Date() })
        .where(eq(staffSessions.id, session.id));

      await tx.insert(staffSessions).values({
        id: nextSessionId,
        staffId: session.staffId,
        refreshTokenHash: this.hash(nextRefreshToken),
        familyId: session.familyId,
        deviceName: device.deviceName ?? session.deviceName,
        platform: device.platform ?? session.platform,
        appVersion: device.appVersion ?? session.appVersion,
        ipAtIssue: device.ip ?? session.ipAtIssue,
        expiresAt: this.expiryDate(),
      });
    });

    return {
      accessToken: await this.signAccessToken(session.staffId, nextSessionId),
      refreshToken: nextRefreshToken,
      expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.db
      .update(staffSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(staffSessions.id, sessionId), isNull(staffSessions.revokedAt)));
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.db
      .update(staffSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(staffSessions.familyId, familyId), isNull(staffSessions.revokedAt)));
  }

  async revokeAllForStaff(staffId: string): Promise<void> {
    await this.db
      .update(staffSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(staffSessions.staffId, staffId), isNull(staffSessions.revokedAt)));
  }

  async isSessionActive(sessionId: string): Promise<boolean> {
    const session = await this.db.query.staffSessions.findFirst({
      where: (table, { eq: equals }) => equals(table.id, sessionId),
    });

    return Boolean(session && !session.revokedAt && session.expiresAt.getTime() > Date.now());
  }

  private expiryDate(): Date {
    return new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  }
}
