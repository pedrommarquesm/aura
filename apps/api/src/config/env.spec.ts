import { describe, expect, it } from 'vitest';

import { loadEnv } from './env';

const minimal = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/aura',
  REDIS_URL: 'redis://localhost:6379',
};

describe('loadEnv', () => {
  it('applies defaults when only the required variables are set', () => {
    const env = loadEnv(minimal);

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.HOST).toBe('0.0.0.0');
    expect(env.RATE_LIMIT_MAX).toBe(300);
  });

  it('coerces numeric strings, since every value arrives as a string', () => {
    const env = loadEnv({ ...minimal, PORT: '8080', RATE_LIMIT_MAX: '25' });

    expect(env.PORT).toBe(8080);
    expect(env.RATE_LIMIT_MAX).toBe(25);
  });

  it('treats "true" and "1" as true for booleans', () => {
    expect(loadEnv({ ...minimal, DATABASE_SSL: 'true' }).DATABASE_SSL).toBe(true);
    expect(loadEnv({ ...minimal, DATABASE_SSL: '1' }).DATABASE_SSL).toBe(true);
    expect(loadEnv({ ...minimal, DATABASE_SSL: 'false' }).DATABASE_SSL).toBe(false);
  });

  it('fails fast when a required variable is missing', () => {
    expect(() => loadEnv({ REDIS_URL: 'redis://localhost:6379' })).toThrow(/DATABASE_URL/);
  });

  it('names every offending variable so one boot surfaces all problems', () => {
    expect(() => loadEnv({ ...minimal, PORT: 'not-a-number', LOG_LEVEL: 'loud' })).toThrow(
      /PORT[\s\S]*LOG_LEVEL|LOG_LEVEL[\s\S]*PORT/,
    );
  });
});
