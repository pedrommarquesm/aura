import { z } from 'zod';

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === 'boolean' ? value : value === 'true' || value === '1'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

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

  return parsed.data;
}

export const ENV = Symbol('ENV');
