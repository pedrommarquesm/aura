import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true' || value === '1'));

const envSchema = z.object({
  /**
   * Runtime mode for Node and the libraries under it. Controls optimizations,
   * warning output, and dependency behaviour — nothing about *where* we run.
   *
   * Deployed environments all set this to `production`, staging included,
   * because a staging box should execute the same optimized code paths that
   * production will. Setting it to anything else silently changes library
   * behaviour and makes staging stop resembling production, which defeats the
   * point of having a staging environment at all.
   */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /**
   * Which deployment this is. Never conflate with NODE_ENV.
   *
   * This is what guards destructive and unsafe operations: seeding refuses to
   * run against `production`, and the development JWT secret is refused
   * anywhere but `local`. Keying those guards off NODE_ENV instead is the
   * classic mistake — staging correctly runs `NODE_ENV=production`, so a guard
   * on NODE_ENV would treat staging as production and block the very things
   * staging exists to allow.
   */
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),

  // Railway injects PORT. Binding to 0.0.0.0 is required behind its proxy.
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  DATABASE_SSL: booleanish.default(false),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Comma-separated list, or "*" to allow any origin.
  CORS_ORIGINS: z.string().default('*'),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  // Trending recompute cadence. Lag here is invisible to users; see
  // docs/backend-architecture.md §8.2.
  TRENDING_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
  TRENDING_MAX_POSTS: z.coerce.number().int().positive().default(5_000),
  TRENDING_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  TRENDING_HALF_LIFE_HOURS: z.coerce.number().positive().default(18),
  TRENDING_MAX_AGE_HOURS: z.coerce.number().positive().default(168),
  /**
   * Cold-start floor. With a pure velocity term every post scores zero until
   * someone likes it, which would leave the trending feed unordered on a quiet
   * day. A small floor makes recency and engagement break the tie instead.
   */
  TRENDING_BASE_VELOCITY: z.coerce.number().nonnegative().default(0.05),

  /**
   * Signs access tokens and feed cursors. Required in production; the
   * development fallback exists so a fresh clone runs without ceremony, and is
   * refused outside development so it can never reach a real deployment.
   */
  JWT_SECRET: z.string().min(32).default('dev-only-insecure-secret-change-me-0000000000'),
  /** Short-lived by design: a JWT cannot be revoked mid-life. */
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  /** Long by design: a social app that logs you out is one you stop opening. */
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(60),

  /** Apple `aud` — the app's bundle id. Sign-in is disabled when unset. */
  APPLE_CLIENT_ID: z.string().optional(),
  /** Comma-separated Google client ids (iOS, Android, and web differ). */
  GOOGLE_CLIENT_IDS: z.string().optional(),

  /**
   * Our own domain in front of whichever CDN is current, so changing vendor is
   * a DNS change and every already-shared link keeps working.
   */
  MEDIA_CDN_BASE_URL: z.string().default('https://cdn.aurarankd.com'),
  /** Selects the edge transform syntax. See docs/backend-architecture.md §6.6. */
  MEDIA_EDGE: z.enum(['cloudflare', 'bunny', 'none']).default('cloudflare'),
  /**
   * Optional per-provider base URLs as JSON, e.g. {"bunny":"https://b-cdn.aurarankd.com"}.
   * Lets a storage migration serve old and new assets simultaneously.
   */
  MEDIA_PROVIDER_BASE_URLS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    // Crash before the DI container starts. A half-configured service that
    // boots and then fails per-request is much harder to diagnose than one
    // that refuses to start.
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const env = parsed.data;

  if (env.APP_ENV !== 'local' && env.JWT_SECRET.startsWith('dev-only-')) {
    throw new Error(
      `JWT_SECRET is still the development default and APP_ENV is "${env.APP_ENV}". ` +
        'Set a real secret before deploying.',
    );
  }

  return env;
}

export const ENV = Symbol('ENV');
