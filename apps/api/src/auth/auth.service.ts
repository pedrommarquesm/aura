import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';

import { assertAccountActive } from '../common/errors/account-status';
import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { newId } from '../common/ids';
import { ENV, passwordAuthEnabled, type Env } from '../config/env';
import { DB, type Database } from '../db/db.module';
import { authIdentities, users, type User } from '../db/schema';
import { resolveLocale } from '../i18n/locales';
import { REDIS } from '../redis/redis.module';
import { isReservedUsername, isValidUsernameFormat } from '../users/username';
import { WaitlistService } from '../waitlist/waitlist.service';

import { consumePasswordSlot } from './password-rate-limit';
import {
  hashPassword,
  linkableOauthEmail,
  looksLikeEmail,
  normalizeEmail,
  verifyPassword,
} from './password';
import { AppleProvider } from './providers/apple.provider';
import { GoogleProvider } from './providers/google.provider';
import type { IdentityProvider } from './providers/identity-provider';
import { TokensService, type DeviceInfo, type IssuedTokens } from './tokens.service';

let dummyPasswordHash: Promise<string> | undefined;

function dummyHash(): Promise<string> {
  dummyPasswordHash ??= hashPassword('not-a-real-password-dummy');
  return dummyPasswordHash;
}

export interface SignInResult extends IssuedTokens {
  user: User;
  /** True on first sign-in, when the account still has a generated handle. */
  needsUsername: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(ENV) private readonly env: Env,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly tokens: TokensService,
    private readonly apple: AppleProvider,
    private readonly google: GoogleProvider,
    private readonly waitlist: WaitlistService,
  ) {}

  private assertPasswordAuth(): void {
    if (!passwordAuthEnabled(this.env)) {
      throw AppError.notFound();
    }
  }

  private provider(name: 'apple' | 'google'): IdentityProvider {
    return name === 'apple' ? this.apple : this.google;
  }

  async signInWithProvider(
    providerName: 'apple' | 'google',
    identityToken: string,
    options: { nonce?: string; locale?: string; device?: DeviceInfo } = {},
  ): Promise<SignInResult> {
    const identity = await this.provider(providerName).verify(identityToken, options.nonce);

    const existing = await this.db.query.authIdentities.findFirst({
      where: (table, { and: both, eq: equals }) =>
        both(equals(table.provider, providerName), equals(table.providerSub, identity.subject)),
    });

    let user: User;
    let needsUsername = false;

    if (existing) {
      const found = await this.db.query.users.findFirst({
        where: (table, { eq: equals }) => equals(table.id, existing.userId),
      });

      if (!found) {
        throw AppError.notFound('Account no longer exists');
      }

      user = found;

      await this.db
        .update(authIdentities)
        .set({ lastLoginAt: new Date() })
        .where(eq(authIdentities.id, existing.id));
    } else {
      const linked = await this.linkOauthToPasswordAccount(providerName, identity);

      if (linked) {
        user = linked;
        needsUsername = false;
      } else {
        const created = await this.db.transaction(async (tx) => {
          const [newUser] = await tx
            .insert(users)
            .values({
              id: newId(),
              username: this.generatePlaceholderUsername(),
              locale: resolveLocale(options.locale) ?? 'en',
            })
            .returning();

          await tx.insert(authIdentities).values({
            id: newId(),
            userId: newUser!.id,
            provider: providerName,
            providerSub: identity.subject,
            // Apple sends name and email only on the very first authorization.
            // If it is not captured here it is gone for good, and the only way
            // back is the user revoking the app in system settings.
            emailAtSignup: identity.email ?? null,
            lastLoginAt: new Date(),
          });

          return newUser!;
        });

        user = created;
        needsUsername = true;
      }
    }

    assertAccountActive(user.status);

    if (identity.email) {
      try {
        // Only a brand-new account (still on its generated placeholder) may
        // have its waitlist-reserved username auto-claimed here — an
        // existing account's real username is never touched.
        const claim = await this.waitlist.claimForAccount(user.id, identity.email, {
          claimReservedUsername: needsUsername,
        });
        const refreshed = await this.findUserById(user.id);
        if (refreshed) user = refreshed;
        if (claim.claimedUsername) needsUsername = false;
      } catch {
        // Claiming early-beta Aura must never block sign-in. The waitlist
        // row stays unclaimed and the next sign-in retries.
      }
    }

    const issued = await this.tokens.issue(user.id, options.device ?? {});

    return { ...issued, user, needsUsername };
  }

  async registerWithPassword(
    input: { email: string; username: string; password: string },
    options: { locale?: string; device?: DeviceInfo } = {},
  ): Promise<SignInResult> {
    this.assertPasswordAuth();

    const email = normalizeEmail(input.email);
    const username = this.requireClaimableUsername(input.username);

    await this.assertUsernameFree(username);

    const existingEmail = await this.db.query.authIdentities.findFirst({
      where: (table, { and: both, eq: equals }) =>
        both(equals(table.provider, 'password'), equals(table.providerSub, email)),
    });

    if (existingEmail) {
      throw new AppError(ErrorCode.EMAIL_TAKEN, 'That email is already in use', 409);
    }

    const passwordHash = await hashPassword(input.password);

    const created = await this.db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          id: newId(),
          username,
          locale: resolveLocale(options.locale) ?? 'en',
        })
        .returning();

      await tx.insert(authIdentities).values({
        id: newId(),
        userId: newUser!.id,
        provider: 'password',
        providerSub: email,
        emailAtSignup: email,
        passwordHash,
        lastLoginAt: new Date(),
      });

      return newUser!;
    });

    let user = created;
    try {
      await this.waitlist.claimForAccount(user.id, email);
      const refreshed = await this.findUserById(user.id);
      if (refreshed) user = refreshed;
    } catch {
      // Same as OAuth: waitlist claim must not block sign-in.
    }

    const issued = await this.tokens.issue(user.id, options.device ?? {});
    return { ...issued, user, needsUsername: false };
  }

  async signInWithPassword(
    identifier: string,
    password: string,
    options: { device?: DeviceInfo } = {},
  ): Promise<SignInResult> {
    this.assertPasswordAuth();

    const identity = await this.findPasswordIdentity(identifier);
    const stored = identity?.passwordHash ?? (await dummyHash());
    const ok = await verifyPassword(password, stored);

    if (!identity || !identity.passwordHash || !ok) {
      throw new AppError(ErrorCode.INVALID_CREDENTIALS, 'Invalid credentials', 401);
    }

    let user = await this.db.query.users.findFirst({
      where: (table, { eq: equals }) => equals(table.id, identity.userId),
    });

    if (!user) {
      throw AppError.notFound('Account no longer exists');
    }

    assertAccountActive(user.status);

    await this.db
      .update(authIdentities)
      .set({ lastLoginAt: new Date() })
      .where(eq(authIdentities.id, identity.id));

    if (identity.emailAtSignup) {
      try {
        await this.waitlist.claimForAccount(user.id, identity.emailAtSignup);
        const refreshed = await this.findUserById(user.id);
        if (refreshed) user = refreshed;
      } catch {
        // Same as OAuth: waitlist claim must not block sign-in.
      }
    }

    const issued = await this.tokens.issue(user.id, options.device ?? {});
    return { ...issued, user, needsUsername: false };
  }

  /**
   * First Apple/Google sign-in: if the token carries a real (non-relay) email
   * that already belongs to a password account, attach this provider to that
   * user instead of creating a second one.
   */
  private async linkOauthToPasswordAccount(
    providerName: 'apple' | 'google',
    identity: { subject: string; email?: string },
  ): Promise<User | undefined> {
    const email = linkableOauthEmail(identity.email);
    if (!email) return undefined;

    const passwordIdentity = await this.db.query.authIdentities.findFirst({
      where: (table, { and: both, eq: equals }) =>
        both(equals(table.provider, 'password'), equals(table.providerSub, email)),
    });

    if (!passwordIdentity) return undefined;

    const user = await this.db.query.users.findFirst({
      where: (table, { eq: equals }) => equals(table.id, passwordIdentity.userId),
    });

    if (!user) return undefined;

    await this.db.insert(authIdentities).values({
      id: newId(),
      userId: user.id,
      provider: providerName,
      providerSub: identity.subject,
      emailAtSignup: identity.email ?? null,
      lastLoginAt: new Date(),
    });

    return user;
  }

  private async findPasswordIdentity(identifier: string) {
    const trimmed = identifier.trim();
    if (!trimmed) return undefined;

    if (looksLikeEmail(trimmed)) {
      const email = normalizeEmail(trimmed);
      return this.db.query.authIdentities.findFirst({
        where: (table, { and: both, eq: equals }) =>
          both(equals(table.provider, 'password'), equals(table.providerSub, email)),
      });
    }

    const handle = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
    const [match] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.username}) = lower(${handle})`)
      .limit(1);

    if (!match) return undefined;

    return this.db.query.authIdentities.findFirst({
      where: (table, { and: both, eq: equals }) =>
        both(equals(table.provider, 'password'), equals(table.userId, match.id)),
    });
  }

  async consumePasswordAttempt(ip: string, identifier: string): Promise<void> {
    this.assertPasswordAuth();

    const keys = [`rl:pw:${ip}`];
    const trimmed = identifier.trim();
    if (trimmed) {
      keys.push(`rl:pw:id:${looksLikeEmail(trimmed) ? normalizeEmail(trimmed) : trimmed.toLowerCase()}`);
    }

    for (const key of keys) {
      const allowed = await consumePasswordSlot(
        this.redis,
        key,
        this.env.PASSWORD_AUTH_MAX,
        this.env.PASSWORD_AUTH_WINDOW_MS,
      );
      if (!allowed) {
        throw new AppError(ErrorCode.RATE_LIMITED, 'Slow down for a second, then try again', 429);
      }
    }
  }

  /**
   * A placeholder handle so the account is valid before onboarding finishes.
   *
   * Not shown as a real username: `needsUsername` tells the app to prompt.
   * Using a random suffix rather than a sequence avoids leaking how many
   * accounts exist.
   */
  private generatePlaceholderUsername(): string {
    return `aura_${Math.random().toString(36).slice(2, 10)}`;
  }

  private requireClaimableUsername(requested: string): string {
    const username = requested.trim();

    if (!isValidUsernameFormat(username)) {
      throw AppError.badRequest('Username must be 3-30 characters, letters, numbers or underscore');
    }

    if (isReservedUsername(username)) {
      throw AppError.conflict(ErrorCode.CONFLICT, 'That username is not available');
    }

    return username;
  }

  private async assertUsernameFree(username: string, userId?: string): Promise<void> {
    const taken = await this.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`);

    if (taken.length > 0 && taken[0]!.id !== userId) {
      throw AppError.conflict(ErrorCode.CONFLICT, 'That username is taken');
    }
  }

  async claimUsername(userId: string, requested: string): Promise<User> {
    const username = this.requireClaimableUsername(requested);
    await this.assertUsernameFree(username, userId);

    const [updated] = await this.db
      .update(users)
      .set({ username, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw AppError.notFound('Account no longer exists');
    }

    return updated;
  }

  async findUserById(userId: string): Promise<User | undefined> {
    return this.db.query.users.findFirst({
      where: (table, { eq: equals }) => equals(table.id, userId),
    });
  }
}
