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

Product endpoints live under `/v1`; health is deliberately outside it.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | — | Liveness. Checks nothing external, so a dependency blip does not trigger a restart loop |
| GET | `/health/ready` | — | Readiness. Verifies Postgres and Redis, 503 when either is down |
| POST | `/v1/auth/apple` | — | Verify an Apple identity token, issue our tokens |
| POST | `/v1/auth/google` | — | Verify a Google ID token, issue our tokens |
| POST | `/v1/auth/refresh` | — | Rotate the refresh token, with reuse detection |
| POST | `/v1/auth/logout` | required | Revoke the current device session |
| POST | `/v1/auth/username` | required | Claim a handle during onboarding |
| GET | `/v1/auth/me` | required | Current user |
| GET | `/v1/feed` | optional | Latest, cursor paginated |
| GET | `/v1/feed/trending` | optional | Precomputed `trending_score` order |
| POST | `/v1/posts/:id/like` | required | Idempotent |
| DELETE | `/v1/posts/:id/like` | required | Writes a `REVERSAL` event |
| GET | `/v1/leaderboards/global` | optional | Top N plus the viewer's own rank |

**Optional** auth means the endpoint works signed out. That is what makes guest
browsing possible: a new install scrolls immediately and only meets an auth
prompt on its first Aura action. Anonymous callers get `likedByMe: false`.

An invalid token is still rejected on those routes — treating it as anonymous
would hide client bugs and silently downgrade a signed-in user to a guest feed.

### Feed pagination

```text
GET /v1/feed?cursor=<opaque>&limit=10   →   { items, nextCursor, hasMore }
```

Cursors are keyset-based and signed. Offset pagination would drift as new posts
arrive, showing duplicates and skipping items mid-scroll — on an infinite feed
that is the difference between smooth and broken. Signing keeps the cursor
shape ours to change rather than an accidental part of the public contract.

## Seeding

```bash
npm run db:seed
```

Creates users, published posts with media variants, likes, and the matching
ledger events, so the clients have something real to render before the upload
pipeline exists. Aura totals are derived from the ledger, exactly as the
application does it. Refuses to run when `NODE_ENV=production`.

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
