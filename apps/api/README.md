# Aura API

Backend for Aura. NestJS on the Fastify adapter, Postgres via Drizzle, Redis for
caching, rate limits, and queues.

Design: [docs/backend-architecture.md](../../docs/backend-architecture.md).
Deployment: [docs/deployment.md](../../docs/deployment.md).

## Two processes, one image

| Entry point | Command | Role |
|---|---|---|
| `src/main.ts` | `npm start` | HTTP API |
| `src/worker.ts` | `npm run start:worker` | Background jobs |

They share the same `AppModule` and ship as the same container with a different
start command, so domain code lives in one place while the two scale
independently. Media processing is CPU-heavy and must never slow down a like.

## Local development

Postgres and Redis come from `docker-compose.yml` at the repository root:

```bash
docker compose up -d              # from the repo root
cd apps/api
cp .env.example .env
npm install
npm run db:migrate:dev
npm run dev                       # API on :3000
npm run dev:worker                # worker, in a second terminal
```

Without Docker, any local Postgres 16+ and Redis 7+ work; point `DATABASE_URL`
and `REDIS_URL` at them.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `dev:worker` | Watch mode |
| `npm run build` | Compile to `dist/` |
| `npm start` / `start:worker` | Run the compiled output |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate:dev` | Apply migrations locally |
| `npm run db:migrate` | Apply migrations from the built output (used on deploy) |
| `npm run typecheck` / `lint` / `test` | Checks |

## Layout

```text
src/
  config/       Zod-validated environment, fails fast at boot
  common/
    errors/     AppError, stable codes, the response envelope
    logging/    pino options, request id propagation
    ids.ts      UUIDv7 generation
  db/
    schema/     Drizzle tables
    migrate.ts  Standalone migration runner
  redis/        Connection provider
  queue/        BullMQ queues shared by both processes
  trending/     Trending score recompute
  health/       Liveness and readiness
```

## Conventions worth knowing

**Aura only moves through the ledger.** Every change writes an `aura_events`
row in the same transaction as the counter update on `users` and `posts`.
Nothing else may touch those counters. This is what makes auditing, reversals,
and recomputing Vote Power against history possible.

**Media rows store storage coordinates, not URLs.** `storage_provider`,
`storage_bucket`, and `storage_key` per asset; URLs are built at read time.
Persisting absolute URLs would make changing CDN a rewrite of the largest table
and would break every link already shared.

**Errors carry a stable code.** Throw `AppError` so clients can branch on
`already_liked` rather than parsing a message. Codes are a public API: add
freely, never rename.

**Validation is Zod, not class-validator**, so the same schemas can be shared
with the mobile and web clients. The exception filter maps a thrown `ZodError`
onto the `validation_failed` envelope.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Liveness. Checks nothing external, so a dependency blip does not trigger a restart loop |
| GET | `/health/ready` | Readiness. Verifies Postgres and Redis, returns 503 when either is down |

Product endpoints live under `/v1`; health is deliberately outside it. The
routes themselves land with the auth, feed, and Aura tasks in the roadmap.

## Error format

```json
{
  "error": {
    "code": "already_liked",
    "message": "You already liked this post",
    "requestId": "0f9c…"
  }
}
```

`requestId` echoes an inbound `x-request-id` when present, so one user action
can be traced across the app, the API, and the worker.
