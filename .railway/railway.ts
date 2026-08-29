/**
 * Aura infrastructure as code.
 *
 * Declares the whole Railway project: databases, the API, the background
 * worker, and the public web app. Checked in so the environment can be
 * recreated from any machine rather than living only in the dashboard.
 *
 * **There is only a `staging` environment today.** Production infrastructure
 * is created when the product is ready for it, not before — an idle
 * production environment invites someone to point real users at something that
 * has never been through a release process.
 *
 * This same file provisions production when the time comes: create the
 * environment, apply against it, and change `APP_ENV`. See docs/deployment.md.
 *
 *   railway config plan    # review the diff against Railway
 *   railway config apply   # apply it
 *
 * Known false drift: `plan` always reports `deploy.restartPolicyType` (and the
 * worker's `restartPolicyMaxRetries`) as pending, however many times you apply.
 * The values are set correctly on the services — the diff reads a layer that
 * stays null rather than the resolved instance. Verify with the query in
 * docs/deployment.md before assuming a real change is outstanding.
 *
 * Secrets are never written here. Database credentials are referenced from the
 * managed services, and anything user-supplied uses preserve() so applying
 * this file never clobbers a value set in the dashboard.
 *
 * See docs/deployment.md for the full first-time setup.
 */
import { defineRailway, postgres, preserve, project, redis, service, volume } from 'railway/iac';

const REGION = 'europe-west4-drams3a';

export default defineRailway(() => {
  const Postgres = postgres('Postgres', { region: REGION });
  const Redis = redis('Redis', { region: REGION });

  // Imported from the managed Redis template: clears the volume's lost+found
  // before starting, which Redis otherwise refuses to boot past.
  Redis.deploy = {
    startCommand:
      '/bin/sh -c "rm -rf $RAILWAY_VOLUME_MOUNT_PATH/lost+found/ && exec docker-entrypoint.sh redis-server --requirepass $REDIS_PASSWORD --save 60 1 --dir $RAILWAY_VOLUME_MOUNT_PATH"',
  };

  const postgresVolume = volume('postgres-volume', {
    alerts: { usage: { '80': {}, '95': {}, '100': {} } },
    allowOnlineResize: true,
    region: REGION,
    sizeMB: 5000,
  });

  const redisVolume = volume('redis-volume', {
    alerts: { usage: { '80': {}, '95': {}, '100': {} } },
    allowOnlineResize: true,
    region: REGION,
    sizeMB: 5000,
  });

  /**
   * Shared by the API and the worker: same image, same dependencies, different
   * entry point.
   */
  const backendEnv = {
    DATABASE_URL: Postgres.env.DATABASE_URL,
    REDIS_URL: Redis.env.REDIS_URL,
    // Runtime mode, not a place. Staging runs the same optimized code paths as
    // production; APP_ENV is what says which deployment this actually is.
    NODE_ENV: 'production',
    APP_ENV: 'staging',
    LOG_LEVEL: 'info',
    // Postgres is reached over Railway's private network, so the connection is
    // not additionally TLS-wrapped.
    DATABASE_SSL: 'false',
    // Object storage. Secrets stay in the dashboard; applying this file must
    // never clobber them. The public CDN hostname is set; attach
    // cdn.aurarankd.com to the bucket before feed URLs resolve.
    R2_ACCOUNT_ID: preserve(),
    R2_ACCESS_KEY_ID: preserve(),
    R2_SECRET_ACCESS_KEY: preserve(),
    R2_ENDPOINT: preserve(),
    R2_BUCKET: 'aura-media',
    MEDIA_CDN_BASE_URL: 'https://cdn.aurarankd.com',
    MEDIA_EDGE: 'none',
    // V0 stand-in for the admin dashboard. Unset parks /v1/moderation/*.
    MODERATION_SECRET: preserve(),
  };

  const api = service('api', {
    // `dockerfilePath` is what actually selects the Dockerfile builder;
    // services keep reporting `builder: RAILPACK` regardless, which is a
    // reporting quirk rather than a sign the Dockerfile is being ignored.
    build: { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
    // Pinned rather than left to Railway's injected PORT so the generated
    // domain's target port and the port the app binds cannot drift apart.
    healthcheck: '/health',
    healthcheckTimeout: 60,
    replicas: { [REGION]: 1 },
    deploy: {
      startCommand: 'node dist/main.js',
      // Schema changes land before the new code serves traffic.
      preDeployCommand: ['node dist/db/migrate.js'],
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 5,
    },
    env: {
      ...backendEnv,
      PORT: '3000',
      CORS_ORIGINS: preserve(),
      RATE_LIMIT_MAX: preserve(),
      // Public OAuth audiences, not secrets. iOS + web clients we have today.
      GOOGLE_CLIENT_IDS:
        '37586478648-lje8e40652sgi8pl7hmogjd7ns6qmj5f.apps.googleusercontent.com,37586478648-trc2amkrb29fv6h9undhkljfd7t69llh.apps.googleusercontent.com',
      APPLE_CLIENT_ID: preserve(),
    },
  });

  const worker = service('worker', {
    build: { builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
    replicas: { [REGION]: 1 },
    deploy: {
      startCommand: 'node dist/worker.js',
      // No healthcheck: the worker serves no HTTP. Liveness is observed
      // through job throughput, not a probe.
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 10,
    },
    env: backendEnv,
  });

  const web = service('web', {
    build: { buildEnvironment: 'V3', builder: 'DOCKERFILE', dockerfilePath: 'Dockerfile' },
    healthcheck: '/api/health',
    healthcheckTimeout: 120,
    replicas: { [REGION]: 1 },
    deploy: { restartPolicyMaxRetries: 5 },
    env: {
      NEXT_PUBLIC_SITE_URL: 'https://www.aurarankd.com',
      PORT: preserve(),
      // NEXT_PUBLIC_* is inlined at image build time. api.aurarankd.com DNS
      // answers; a rebuild is what actually bakes this into the bundle.
      NEXT_PUBLIC_API_BASE_URL: 'https://api.aurarankd.com',
      NEXT_PUBLIC_USE_MOCK_API: 'false',
      // Public web OAuth client. The secret is GOOGLE_CLIENT_SECRET on the
      // service (preserve), never in this file.
      NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID:
        '37586478648-trc2amkrb29fv6h9undhkljfd7t69llh.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: preserve(),
    },
  });

  return project('aura', {
    resources: [Postgres, Redis, postgresVolume, redisVolume, api, worker, web],
  });
});
