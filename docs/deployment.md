# Deployment

Aura runs on Railway. Everything needed to recreate the environment is in this
repository, so it can be rebuilt from any machine without clicking through a
dashboard.

## Environments

**There is one deployed environment: `staging`.** Production does not exist
yet and is created when the product is ready for real users. An idle production
environment is worse than none — it invites someone to point traffic at
something that has never been through a release process.

| | Where | `NODE_ENV` | `APP_ENV` | Data |
|---|---|---|---|---|
| **Development** | Your machine | `development` | `local` | Seeded, disposable |
| **Staging** | Railway | `production` | `staging` | Seeded, disposable |
| **Production** | *not created yet* | `production` | `production` | Real. Never seeded |

### Why there are two variables

They answer different questions, and merging them causes real bugs.

`NODE_ENV` is **runtime mode** for Node and the libraries beneath it —
optimizations, warning output, dependency behaviour. Every deployed
environment sets it to `production`, staging included, so staging executes the
same code paths production will. Setting `NODE_ENV=staging` quietly changes
library behaviour and makes staging stop resembling the thing it exists to
rehearse.

`APP_ENV` is **which deployment this is**, and it guards the unsafe
operations:

- `npm run db:seed` refuses to run when `APP_ENV=production`
- The development `JWT_SECRET` is refused anywhere except `local`
- `GET /health` reports it, so "which environment am I hitting" is one request
  rather than a guess from a hostname

Guarding on `NODE_ENV` instead is the classic mistake: staging correctly runs
`NODE_ENV=production`, so the guard would treat staging as production and block
exactly the things staging exists to allow.

### Adding production later

1. Create the environment: `railway environment new production`
2. Apply this same IaC file against it
3. Set `APP_ENV=production` and a fresh `JWT_SECRET`
4. Provision its own Postgres and Redis — **never point it at staging's data**
5. Add its domains, then deploy

Nothing in the repository needs restructuring for that; it is configuration.

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

### Seeding staging

`npm run db:seed` runs against `local` and `staging`, and refuses `production`.

Staging's Postgres is only reachable on Railway's private network, and there is
no public proxy, so the seed cannot be run from a laptop. Run it on the
platform instead, as a one-off:

1. Temporarily set the `worker` service's start command to `node dist/db/seed.js`
2. Deploy it and wait for `[seed] done` in the logs
3. Restore the start command and redeploy

Do not leave the seed in any start or pre-deploy command. It **truncates every
table** before inserting, which is fine for a disposable staging database and
catastrophic anywhere else.

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

Web Google Sign-In needs `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` on the **web**
service (a Web application OAuth client, inlined at image build time) and the
same id listed in the API's `GOOGLE_CLIENT_IDS`. The iOS client cannot be reused
for GIS.

## Current environment

Project `aura`, environment **`staging`**, region `europe-west4`.

| Service | URL |
|---|---|
| api | https://api-production-aa71.up.railway.app |
| web | https://web-production-e1282.up.railway.app |

The hostnames still read `-production-` because Railway generated them before
the environment was renamed and does not rewrite existing domains. They serve
**staging**. Confirm with `curl <api>/health`, which reports `APP_ENV`, rather
than trusting the hostname — and give production its own domains rather than
inheriting these.

## Troubleshooting

**A Railway URL returns `{"error":{"code":"not_found","message":"Cannot GET /"}}`.** That JSON is the API, not the web app. The API's routes live under `/v1`; opening the API hostname at `/` used to 404 with that envelope. `GET /` now returns a service index. The landing page is the **web** domain in the table above. Confirm which service you hit with `GET /health` on the API (reports `environment`) or `GET /api/health` on the web.

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

**`railway config plan` always shows the same pending change.** `plan` reports
`deploy.restartPolicyType` (and the worker's `restartPolicyMaxRetries`) as
outstanding no matter how many times you apply, and `apply` reports success
each time. The values are genuinely set; the diff reads a layer that stays
null rather than the resolved service instance. Confirm actual state before
chasing it:

```bash
curl -s -X POST https://backboard.railway.com/graphql/v2 \
  -H "Authorization: Bearer $RAILWAY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"query($e:String!,$s:String!){serviceInstance(environmentId:$e,serviceId:$s){serviceName restartPolicyType restartPolicyMaxRetries healthcheckPath startCommand dockerfilePath}}","variables":{"e":"<environmentId>","s":"<serviceId>"}}'
```

Treat any *other* pending change in the plan as real.

**A service reports `builder: RAILPACK` but you configured a Dockerfile.**
Expected. `dockerfilePath` is what selects the Dockerfile builder; the `builder`
field keeps its default value. Confirm from the build log rather than the
field — `railway logs --service api --build` shows `load build definition from
Dockerfile` and your own stage names when the Dockerfile is in use.
