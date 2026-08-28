# Deployment

Aura runs on Railway. Everything needed to recreate the environment is in this
repository, so it can be rebuilt from any machine without clicking through a
dashboard.

## What runs where

| Service | Source | Role |
|---|---|---|
| `api` | `apps/api/Dockerfile` | HTTP API, `node dist/main.js` |
| `worker` | `apps/api/Dockerfile` (same image) | Background jobs, `node dist/worker.js` |
| `web` | `apps/web/Dockerfile` | Public landing and read-only feed |
| `Postgres` | Railway managed | Source of truth |
| `Redis` | Railway managed | Cache, rate limits, queues |

The API and worker are the **same image with a different start command**. Build
once, run two roles.

## Infrastructure as code

The whole project is declared in [`.railway/railway.ts`](../.railway/railway.ts):
services, databases, volumes, health checks, start commands, and the variable
wiring between them.

```bash
npm install            # repo root, installs the Railway IaC SDK
npm run infra:plan     # review the diff against Railway
npm run infra:apply    # apply it
```

`plan` is safe and read-only. Always read it before applying — it reports adds,
changes, and destroys in Terraform style, and a destroy against a database
volume is not something to discover afterwards.

Secrets are never committed. Database credentials are referenced from the
managed services (`Postgres.env.DATABASE_URL`), and anything set by hand in the
dashboard uses `preserve()` so applying never clobbers it.

> Railway deprecated `railway.json` / `railway.toml` in favour of this model;
> the old files stop working on 2026-12-01. Do not reintroduce them, and do not
> manage one service with both models — Railway blocks dual ownership.

## First-time setup on a new machine

```bash
npm i -g @railway/cli
```

Authenticate. Two token types matter, and the distinction costs an hour if you
get it wrong:

| Token | Env var | Works with |
|---|---|---|
| Account | `RAILWAY_API_TOKEN` | CLI and GraphQL |
| **Workspace** | `RAILWAY_API_TOKEN` | **GraphQL only** — the CLI rejects it |
| Project | `RAILWAY_TOKEN` | CLI, scoped to one environment |

A workspace token fails `railway whoami` and `railway list` because those call
the `me` query, which is personal-account scoped. That is not a sign the token
is invalid. Verify a workspace token with GraphQL instead:

```bash
curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { projects { edges { node { id name } } } }"}'
```

For CLI work, create a project token (Project settings → Tokens) and export it
as `RAILWAY_TOKEN`.

## Deploying

`railway up` uploads the current directory as the build context, so run it from
the app being deployed:

```bash
export RAILWAY_TOKEN=<project token>

cd apps/api && railway up --service api      # API
cd apps/api && railway up --service worker   # worker, same directory
cd apps/web && railway up --service web      # web
```

A deploy is not finished when the command returns — that only means the build
was queued. Poll until terminal:

```bash
railway deployment list --service api --json
```

`SUCCESS` is the only state that means deployed. Then check the service
actually answers, because a container can start and still serve nothing:

```bash
curl -s https://<api-domain>/health/ready
```

## Database migrations

Migrations run automatically as the API's pre-deploy step
(`node dist/db/migrate.js`), so schema changes land before new code serves
traffic. The `drizzle/` directory is copied into the image for this reason.

To add a migration:

```bash
cd apps/api
# edit src/db/schema/*
npm run db:generate       # writes drizzle/NNNN_name.sql
npm run db:migrate:dev    # apply locally
```

Commit the generated SQL. Never edit an applied migration; add a new one.

## Domains and ports

Railway injects `PORT`, and a generated domain targets a fixed port. If those
disagree the service returns **502 "Application failed to respond"** while
looking perfectly healthy in its own logs — the app is up, the proxy is just
pointed at the wrong port.

`api` pins `PORT=3000` in the IaC to match its domain. When adding a service,
either let Railway pick the port and target the same one, or pin both.

## Environment variables

`apps/api/.env.example` documents every variable the API reads, with defaults.
Required in production: `DATABASE_URL`, `REDIS_URL`. Everything else has a
sensible default.

Trending scoring constants (`TRENDING_*`) are environment variables rather than
code so the feed can be tuned without a deploy.

## Current environment

Project `aura`, environment `production`, region `europe-west4`.

| Service | URL |
|---|---|
| api | https://api-production-aa71.up.railway.app |
| web | https://web-production-e1282.up.railway.app |

## Troubleshooting

**502 on a service that logs a successful start.** Port mismatch. See above.

**`railway add` prints "Project not found" but the resource appears anyway.**
A known CLI quirk when using a project token. Always check
`railway service list --json` before retrying, or you will create duplicates.

**Deploy succeeded but the app cannot reach Postgres.** Check the variable
references resolved: `railway variables --service api`. `DATABASE_URL` should
expand to a `postgres.railway.internal` host, not a literal `${{...}}` string.

**Worker looks idle.** It has no HTTP surface, so there is nothing to curl.
Check `railway logs --service worker` for the recompute line it logs on every
run.
