import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../common/errors/app-error';
import { ErrorCode } from '../common/errors/error-codes';

import { AuthService } from './auth.service';
import { hashPassword } from './password';

function createDb(identity?: Record<string, unknown>, user?: Record<string, unknown>) {
  const insertValues = vi.fn();
  const tx = {
    insert: vi.fn((table: { insert?: unknown }) => ({
      values: vi.fn((row: unknown) => {
        insertValues(table, row);
        return {
          returning: vi.fn().mockResolvedValue([
            user ?? { id: 'u_new', username: 'tester', status: 'active' },
          ]),
        };
      }),
    })),
  };

  return {
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

function createService(db: ReturnType<typeof createDb>, envOverrides: Record<string, unknown> = {}) {
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

  return {
    service: new AuthService(
      db as never,
      env as never,
      redis as never,
      tokens as never,
      {} as never,
      {} as never,
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
});
