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
| `admin` | `apps/admin/Dockerfile` | Staff backoffice |
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
cd apps/admin && railway up --service admin  # backoffice
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

The public hostnames are on **`auraclimb.com`**. Staging is the only
environment, so these point at staging until production exists.

| Hostname | Service | Notes |
|---|---|---|
| `www.auraclimb.com` | web | Canonical site. Railway custom domain, port 3000 |
| `auraclimb.com` | web | Same app. Apex → www is a DNS redirect, not the Next proxy |
| `api.auraclimb.com` | api | Railway custom domain, port 3000 |
| `admin-staging-ea68.up.railway.app` | admin | Staff backoffice. Same Google Web OAuth client as web |
| `cdn.auraclimb.com` | Cloudflare R2 bucket `aura-media` | Not a Railway domain. Attach in the R2 dashboard |

Railway already has the three HTTP hostnames. DNS for `auraclimb.com`,
`www.auraclimb.com`, and `api.auraclimb.com` answers; certificates are issued.
The apex → `www` hop is at DNS so the app never 308s Flight (`?_rsc=`) requests.

Generated `*.up.railway.app` URLs keep working. Web and mobile now point at
`https://api.auraclimb.com`. `NEXT_PUBLIC_*` is inlined at image build time, so
a web rebuild is required after changing it.

### DNS records to create

Best path: add `auraclimb.com` as a zone on the **same Cloudflare account as
R2**, then point the registrar nameservers at Cloudflare. Apex CNAME needs
Cloudflare's CNAME flattening (most registrars cannot CNAME `@`). R2 custom
domains also require the zone to live on that Cloudflare account.

Create these at the DNS host. Railway CNAMEs should be **DNS-only** (grey
cloud) so Railway can terminate TLS. Orange-cloud proxying them through
Cloudflare usually breaks certificate issuance.

**Traffic (CNAME)**

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `@` | `4mgnbezx.up.railway.app` | DNS only |
| CNAME | `www` | `1iloffwk.up.railway.app` | DNS only |
| CNAME | `api` | `ttboedb9.up.railway.app` | DNS only |

**Ownership (TXT)** — Railway will not issue a certificate without these.

| Type | Name | Content |
|---|---|---|
| TXT | `_railway-verify` | `railway-verify=4e707f8bd074c62017a0d193e8e31dfb2514c4d1c0e28d44a6f7fa7160a4b856` |
| TXT | `_railway-verify.www` | `railway-verify=aacd188e8e4bc897f8b607e7fa3054860823fc47e237e7ad912ad36ba6bc82c8` |
| TXT | `_railway-verify.api` | `railway-verify=5c923769da78d691b7505fb5efa3070106fdd2343be9a92e4e018c330642603d` |

**CDN** — do not CNAME `cdn` at the registrar by guesswork. In Cloudflare:
R2 → bucket `aura-media` → Custom Domains → add `cdn.auraclimb.com`. If the
zone is on this account, Cloudflare writes the record. If it is not, the
dashboard shows the CNAME target to copy.

After DNS answers (web + api are live):

1. Railway marks the three HTTP domains verified and issues certificates. **Done.**
2. Set web `NEXT_PUBLIC_API_BASE_URL=https://api.auraclimb.com` and rebuild web.
   The IaC value is set; the running image still needs a **new Docker build**,
   not a restart of the old image.
3. Point a new mobile build at `https://api.auraclimb.com/v1`.
4. Attach `cdn.auraclimb.com` to the R2 bucket `aura-media` as a custom domain.
   Public reads on `cdn.auraclimb.com` stay 404 until that hostname is Active
   **and** `MEDIA_CDN_BASE_URL` on api + worker matches it.

Google Cloud Console, Web application OAuth client: add Authorized JavaScript
origins `https://auraclimb.com` and `https://www.auraclimb.com` (keep
`http://localhost:3000` and the current Railway web URL). The admin app uses
that same client — add origin
`https://admin-staging-ea68.up.railway.app` and redirect
`https://admin-staging-ea68.up.railway.app/api/auth/callback/google`
(plus `http://localhost:3001/api/auth/callback/google` for local).

Railway injects `PORT`, and a generated domain targets a fixed port. If those
disagree the service returns **502 "Application failed to respond"** while
looking perfectly healthy in its own logs — the app is up, the proxy is just
pointed at the wrong port.

`api` pins `PORT=3000` in the IaC to match its domain. When adding a service,
either let Railway pick the port and target the same one, or pin both.

## Environment variables

`apps/api/.env.example`, `apps/web/.env.example` and `apps/mobile/.env.example`
are the contract for what each app reads. Copy to `.env` locally. `.env` is
gitignored; the examples are the files that stay in the repo.

Rules:

1. **Never commit secrets.** Values that live only in the Railway dashboard
   use `preserve()` in `.railway/railway.ts` so `config apply` cannot clobber
   them. Database URLs are referenced from the managed services, not copied.
2. **`NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` are public.** They ship in the
   browser / app binary and are inlined at **image or app build time**, not
   read from the running container. Changing one requires a rebuild, not just
   a variable edit.
3. **`GOOGLE_CLIENT_SECRET` is on the web service only.** It is never
   `NEXT_PUBLIC_*` and never in git. GIS does not send it.

Required in a deployed API: `DATABASE_URL`, `REDIS_URL`. Everything else has a
sensible default documented in the example file.

`MODERATION_SECRET` (api + worker, `preserve()`) is the break-glass
`X-Moderation-Key` for scripts. Staff JWTs from the admin app work without it.
Unset parks only the key path. Generate with `openssl rand -base64 32`.

The admin app (`apps/admin`) uses NextAuth as a thin client of
`POST /v1/staff/auth/google`. Staging is
`https://admin-staging-ea68.up.railway.app`. It reuses the public site's Web
OAuth client: `AUTH_GOOGLE_ID` matches `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`, and
`AUTH_GOOGLE_SECRET` is the same value as web's `GOOGLE_CLIENT_SECRET`. Set
`AUTH_SECRET` on `admin` (`preserve()`). Add the admin origin's
`/api/auth/callback/google` to that Google Web client, and keep the client id
in the API's `GOOGLE_CLIENT_IDS`. `STAFF_OWNER_EMAIL` defaults to
`pedrommarquesm@gmail.com` — first Google sign-in with that address claims
owner. `STAFF_ALLOWED_DOMAINS` is empty (invite-only) until you open an org
domain.

Trending scoring constants (`TRENDING_*`) are environment variables rather than
code so the feed can be tuned without a deploy.

Mobile sign-in needs `APPLE_CLIENT_ID` (the iOS bundle id `app.aurarankd.mobile`) and
`GOOGLE_CLIENT_IDS` (comma-separated iOS, Android, and web OAuth client ids) on
the **api** service. Staging already has the iOS and web Google clients.
Until Apple's id is set, `POST /v1/auth/apple` still returns
`service_unavailable`. The iOS Google id is baked into the mobile app; extra
`EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` values override it at build time. Google on
iOS needs a development build (`npx expo run:ios`) — Expo Go cannot register
the reversed client-id URL scheme.

Web Google Sign-In needs `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` on the **web**
service (a Web application OAuth client, inlined at image build time) and the
same id listed in the API's `GOOGLE_CLIENT_IDS` alongside the iOS client. The
Google client secret is `GOOGLE_CLIENT_SECRET` on **web** only — GIS does not
send it, and it must never be `NEXT_PUBLIC_*`.

Media lives on Cloudflare R2. The **api** and **worker** both need
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`
(`aura-media`), and `R2_ENDPOINT`. Those are secrets except the bucket name —
`preserve()` in the IaC file. Clients PUT directly to a presigned URL; the API
never sees the bytes. Public reads go through `MEDIA_CDN_BASE_URL`, which is
`https://cdn.auraclimb.com` once that hostname is attached to the bucket as an
R2 custom domain. Until then, enable the bucket's `r2.dev` public development
URL and point `MEDIA_CDN_BASE_URL` at it. `MEDIA_EDGE=none` until Cloudflare
Image Resizing is on — we store our own 1080 / 400 JPEG variants.

Do not `railway config apply` this file just to add R2 variables; set them on
the two services (skip deploys, then `railway up` the image that reads them).
The known `restartPolicy` false drift is still there.

Video uses Mux. Set these in the dashboard (`preserve()` in IaC — do not
`config apply` just to add them):

| Variable | Service | What it is |
|---|---|---|
| `MUX_TOKEN_ID` | api + worker | Mux access token id (Video write) |
| `MUX_TOKEN_SECRET` | api + worker | Mux access token secret. **Not** the webhook secret |
| `MUX_WEBHOOK_SECRET` | **api only** | HMAC for `POST /v1/webhooks/mux` |

Create the webhook in the Mux dashboard against
`https://api.auraclimb.com/v1/webhooks/mux` for `video.asset.ready` and
`video.asset.errored`. Playback policy is `public`; video quality is `basic`.
Mux keys never go in clients or `NEXT_PUBLIC_*`.

Waitlist mail uses Resend. Set these in the dashboard (`preserve()` for the
key in IaC — do not `config apply` just to add it):

| Variable | Service | What it is |
|---|---|---|
| `RESEND_API_KEY` | api + worker | Send-only Resend key. **Never** in git or `NEXT_PUBLIC_*` |
| `MAIL_FROM` | api + worker | From header. Staging is `Aura <hello@auraclimb.com>` |

The sending domain must be verified in the Resend dashboard. Unset
`RESEND_API_KEY` parks delivery: rendered messages stay in `email_outbox` as
`queued`. A send error marks the row `failed` and does not fail the waitlist
join. Contact form submissions stay persist-only.

## Current environment

Project `aura`, environment **`staging`**, region `europe-west4`.

| Service | Generated URL | Custom domain (after DNS) |
|---|---|---|
| api | https://api-production-aa71.up.railway.app | https://api.auraclimb.com |
| web | https://web-production-e1282.up.railway.app | https://www.auraclimb.com (apex → www at DNS) |
| admin | https://admin-staging-ea68.up.railway.app | — |
| media | — | https://cdn.auraclimb.com |

The generated hostnames still read `-production-` because Railway created them
before the environment was renamed and does not rewrite existing domains. They
serve **staging**. Confirm with `curl <api>/health`, which reports `APP_ENV`,
rather than trusting the hostname — and give production its own domains rather
than inheriting these.

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
