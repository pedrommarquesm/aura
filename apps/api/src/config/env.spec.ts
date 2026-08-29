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
    expect(env.LIKE_RATE_LIMIT_MAX).toBe(60);
    expect(env.LIKE_RATE_LIMIT_WINDOW_MS).toBe(60_000);
    expect(env.MEDIA_DAILY_UPLOAD_QUOTA).toBe(20);
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

  it('defaults APP_ENV to local, so nothing is treated as deployed by accident', () => {
    expect(loadEnv(minimal).APP_ENV).toBe('local');
  });

  it('keeps APP_ENV independent of NODE_ENV', () => {
    // Staging runs NODE_ENV=production so it executes the same optimized code
    // paths as production, while APP_ENV still says staging. Conflating the two
    // is what makes safety guards fire in the wrong environment.
    const staging = loadEnv({
      ...minimal,
      NODE_ENV: 'production',
      APP_ENV: 'staging',
      JWT_SECRET: 'a-real-secret-that-is-long-enough-000000',
    });

    expect(staging.NODE_ENV).toBe('production');
    expect(staging.APP_ENV).toBe('staging');
  });

  it('refuses the development JWT secret in any deployed environment', () => {
    expect(() => loadEnv({ ...minimal, APP_ENV: 'staging' })).toThrow(/JWT_SECRET/);
    expect(() => loadEnv({ ...minimal, APP_ENV: 'production' })).toThrow(/JWT_SECRET/);
  });

  it('allows the development JWT secret locally, so a fresh clone just runs', () => {
    expect(() => loadEnv({ ...minimal, APP_ENV: 'local' })).not.toThrow();
  });

  it('boots without R2 credentials so a fresh clone does not need Cloudflare', () => {
    expect(loadEnv(minimal).R2_ACCESS_KEY_ID).toBeUndefined();
    expect(loadEnv(minimal).R2_BUCKET).toBe('aura-media');
  });

  it('does not refuse the dev secret merely because NODE_ENV is production', () => {
    // The guard must key on APP_ENV. A local production build is not a deploy.
    expect(() => loadEnv({ ...minimal, NODE_ENV: 'production', APP_ENV: 'local' })).not.toThrow();
  });

  it('names every offending variable so one boot surfaces all problems', () => {
    expect(() => loadEnv({ ...minimal, PORT: 'not-a-number', LOG_LEVEL: 'loud' })).toThrow(
      /PORT[\s\S]*LOG_LEVEL|LOG_LEVEL[\s\S]*PORT/,
    );
  });
});
