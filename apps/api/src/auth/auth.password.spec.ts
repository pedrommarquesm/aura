import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

import { AuthService } from './auth.service';
import { hashPassword } from './password';

function createDb(identity?: Record<string, unknown>, user?: Record<string, unknown>) {
  const insertValues = vi.fn();
  const insert = vi.fn(() => ({
    values: vi.fn((row: unknown) => {
      insertValues(row);
      return {
        returning: vi.fn().mockResolvedValue([
          user ?? { id: 'u_new', username: 'tester', status: 'active' },
        ]),
      };
    }),
  }));
  const tx = { insert };

  return {
    insert,
    query: {
      authIdentities: {
        findFirst: vi.fn().mockResolvedValue(identity),
      },
      users: {
        findFirst: vi.fn().mockResolvedValue(user),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(user ? [{ id: user.id }] : []),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    insertValues,
  };
}

function createService(
  db: ReturnType<typeof createDb>,
  envOverrides: Record<string, unknown> = {},
  oauth: { provider?: 'apple' | 'google'; email?: string | undefined; subject?: string } = {},
) {
  const env = {
    APP_ENV: 'local',
    PASSWORD_AUTH_MAX: 20,
    PASSWORD_AUTH_WINDOW_MS: 60_000,
    ...envOverrides,
  };
  const redis = { incr: vi.fn().mockResolvedValue(1), pexpire: vi.fn() };
  const tokens = {
    issue: vi.fn().mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 900,
    }),
  };
  const waitlist = { claimForAccount: vi.fn().mockResolvedValue(0) };
  const verified = {
    subject: oauth.subject ?? 'google-sub-1',
    email: oauth.email,
  };
  const apple = { verify: vi.fn().mockResolvedValue(verified) };
  const google = { verify: vi.fn().mockResolvedValue(verified) };

  return {
    service: new AuthService(
      db as never,
      env as never,
      redis as never,
      tokens as never,
      apple as never,
      google as never,
      waitlist as never,
    ),
    tokens,
    waitlist,
    redis,
  };
}

describe('AuthService password', () => {
  it('registers a username + email account and issues tokens', async () => {
    const db = createDb(undefined, { id: 'u_new', username: 'tester', status: 'active' });
    db.query.authIdentities.findFirst.mockResolvedValue(undefined);
    db.select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    }));
    const { service, tokens } = createService(db);

    const result = await service.registerWithPassword({
      email: 'tester@aura.test',
      username: 'tester',
      password: 'long-enough',
    });

    expect(result.needsUsername).toBe(false);
    expect(result.accessToken).toBe('access');
    expect(tokens.issue).toHaveBeenCalledWith('u_new', {});
  });

  it('signs in by email', async () => {
    const passwordHash = await hashPassword('long-enough');
    const db = createDb(
      {
        id: 'id_1',
        userId: 'u_1',
        passwordHash,
        emailAtSignup: 'tester@aura.test',
      },
      { id: 'u_1', username: 'tester', status: 'active' },
    );
    const { service } = createService(db);

    const result = await service.signInWithPassword('tester@aura.test', 'long-enough');

    expect(result.user.id).toBe('u_1');
    expect(result.needsUsername).toBe(false);
  });

  it('rejects a wrong password without saying whether the account exists', async () => {
    const passwordHash = await hashPassword('long-enough');
    const db = createDb(
      { id: 'id_1', userId: 'u_1', passwordHash },
      { id: 'u_1', username: 'tester', status: 'active' },
    );
    const { service } = createService(db);

    await expect(service.signInWithPassword('tester@aura.test', 'nope-nope')).rejects.toMatchObject({
      code: ErrorCode.INVALID_CREDENTIALS,
    });
  });

  it('hides password routes in production', async () => {
    const db = createDb();
    const { service } = createService(db, { APP_ENV: 'production' });

    await expect(
      service.signInWithPassword('tester@aura.test', 'long-enough'),
    ).rejects.toBeInstanceOf(AppError);
  });

  it('attaches a first Google sign-in to the password account with the same email', async () => {
    const passwordAccount = { id: 'u_1', username: 'tester', status: 'active' };
    const db = createDb(undefined, passwordAccount);
    db.query.authIdentities.findFirst
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        id: 'id_pw',
        userId: 'u_1',
        provider: 'password',
        providerSub: 'tester@aura.test',
      });
    const { service, tokens } = createService(db, {}, { email: 'tester@aura.test' });

    const result = await service.signInWithProvider('google', 'id-token');

    expect(result.user.id).toBe('u_1');
    expect(result.needsUsername).toBe(false);
    expect(tokens.issue).toHaveBeenCalledWith('u_1', {});
    expect(db.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u_1',
        provider: 'google',
        providerSub: 'google-sub-1',
      }),
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('does not link when Apple only sends a Hide My Email relay', async () => {
    const db = createDb(undefined, { id: 'u_new', username: 'aura_abc', status: 'active' });
    db.query.authIdentities.findFirst.mockResolvedValue(undefined);
    const { service } = createService(
      db,
      {},
      { email: 'abc@privaterelay.appleid.com', subject: 'apple-sub' },
    );

    const result = await service.signInWithProvider('apple', 'id-token');

    expect(result.needsUsername).toBe(true);
    expect(db.transaction).toHaveBeenCalled();
  });
});
