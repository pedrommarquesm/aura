import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';
import { newId } from '../common/ids';
import { DB, type Database } from '../db/db.module';
import { authIdentities, users, type User } from '../db/schema';
import { resolveLocale } from '../i18n/locales';

import { AppleProvider } from './providers/apple.provider';
import { GoogleProvider } from './providers/google.provider';
import type { IdentityProvider } from './providers/identity-provider';
import { TokensService, type DeviceInfo, type IssuedTokens } from './tokens.service';

export interface SignInResult extends IssuedTokens {
  user: User;
  /** True on first sign-in, when the account still has a generated handle. */
  needsUsername: boolean;
}

const RESERVED_USERNAMES = new Set([
  'admin',
  'aura',
  'api',
  'support',
  'help',
  'about',
  'settings',
  'me',
  'you',
  'root',
  'system',
  'moderator',
]);

@Injectable()
export class AuthService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly tokens: TokensService,
    private readonly apple: AppleProvider,
    private readonly google: GoogleProvider,
  ) {}

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

    if (user.status !== 'active') {
      throw AppError.forbidden('This account is not active');
    }

    const issued = await this.tokens.issue(user.id, options.device ?? {});

    return { ...issued, user, needsUsername };
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

  async claimUsername(userId: string, requested: string): Promise<User> {
    const username = requested.trim();

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      throw AppError.badRequest('Username must be 3-30 characters, letters, numbers or underscore');
    }

    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      throw AppError.conflict(ErrorCode.CONFLICT, 'That username is not available');
    }

    const taken = await this.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`);

    if (taken.length > 0 && taken[0]!.id !== userId) {
      throw AppError.conflict(ErrorCode.CONFLICT, 'That username is taken');
    }

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
