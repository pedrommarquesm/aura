# Aura — Work Plan & Tracker

Single source of truth for what is planned, in flight, and done.

- Product spec: [product-spec.md](./product-spec.md)
- Backend architecture: [backend-architecture.md](./backend-architecture.md)

---

## How this file works

**Every PR must update at least one row in this file.** A PR that changes behaviour without moving a row here is incomplete.

Rules:

1. Find your task's ID (e.g. `MOB-02`) and update its **Status** and **PR** columns in the same PR that does the work.
2. Set status to `In review` when you open the PR, not after it merges. The person merging can see the rest.
3. If the work reveals a task nobody planned, **add a row** rather than silently expanding an existing one. Use the next free ID in that prefix.
4. If you deliberately skip something, mark it `Dropped` with a one-line reason. Do not delete rows — knowing what we decided against is worth as much as knowing what we built.
5. Keep each PR inside one prefix where possible. Rows are grouped so parallel work does not collide in this file.

Status values: `Not started` · `In progress` · `In review` · `Done` · `Blocked` · `Dropped`

ID prefixes:

| Prefix | Area |
|---|---|
| `FND` | Foundations: repo, tooling, CI, shared packages |
| `MOB` | React Native app (Expo) |
| `WEB` | Web app (landing + public feed) |
| `API` | Backend service (NestJS) |
| `MEDIA` | Upload, processing, CDN |
| `AURA` | Aura ledger, leaderboards, economy |
| `TS` | Trust, safety, anti-abuse |
| `OPS` | Infra, deploy, observability |

---

## Now / Next / Later

**Now** — seed staging (`OPS-08`) so the wired clients have data, then the upload pipeline (`MEDIA-02` … `MEDIA-05`), the last piece of the V0 loop that does not exist.

**Next** — native auth on mobile (`MOB-10` … `MOB-12`), then likes and the rest of the client loop against the real API.

**Later** — V1 competition systems. The seams are designed; do not build them yet.

Worth doing early rather than late: `FND-03`, and the three things waiting on it — `FND-04` (API types), `FND-09` (design tokens), and `FND-11` (message catalogs). Each client currently holds its own copy of all three, so every parallel PR widens the gap.

---

## Milestone M0 — Foundations

Goal: a repo where four people can work in parallel without stepping on each other.

| ID | Task | Status | PR |
|---|---|---|---|
| FND-01 | Product spec + backend architecture proposal in-repo | Done | [#1](https://github.com/pedrommarquesm/aura/pull/1) |
| FND-02 | Work plan & tracker (this file) | Done | [#2](https://github.com/pedrommarquesm/aura/pull/2) |
| FND-03 | Monorepo tooling (workspaces, TypeScript config, lint/format) | Not started | |
| FND-04 | `packages/contracts` — shared Zod schemas + inferred types, replacing the local `lib/api/types.ts` in both clients | Not started | |
| FND-05 | CI: typecheck, lint, test on PR | Not started | |
| FND-06 | Environment/secrets convention (`.env.example` per app) | Not started | |
| FND-07 | Shared design tokens ([design-tokens.md](./design-tokens.md)) | Done | [#2](https://github.com/pedrommarquesm/aura/pull/2) |
| FND-08 | Media storage/CDN portability design (architecture §6.6) | Done | [#3](https://github.com/pedrommarquesm/aura/pull/3) |
| FND-09 | Promote design tokens into a shared package — mobile and web each hold a copy today | Not started | |
| FND-10 | i18n contract ([i18n.md](./i18n.md)): locales, ICU, key naming, translation boundary | Done | [#9](https://github.com/pedrommarquesm/aura/pull/9) |
| FND-11 | Merge the per-app message catalogs into a shared package (follows FND-03) | Not started | |

### Mobile bootstrap

| ID | Task | Status | PR |
|---|---|---|---|
| MOB-01 | Expo + Expo Router app scaffold, runs on iOS and Android | Done | [#4](https://github.com/pedrommarquesm/aura/pull/4) |
| MOB-02 | NativeWind / Tailwind setup + design tokens (Aura visual identity) | Done | [#4](https://github.com/pedrommarquesm/aura/pull/4) |
| MOB-03 | Tab navigation shell: Home, Discover, Create, Rank, Profile | Done | [#4](https://github.com/pedrommarquesm/aura/pull/4) |
| MOB-04 | Base UI primitives (Text, Button, Avatar, Card, Skeleton) | Done | [#4](https://github.com/pedrommarquesm/aura/pull/4) |
| MOB-05 | TanStack Query + API client with auth interceptor and single-flight refresh | Done | [#4](https://github.com/pedrommarquesm/aura/pull/4) |
| MOB-06 | Zustand store for client/session state | Done | [#4](https://github.com/pedrommarquesm/aura/pull/4) |
| MOB-07 | Reanimated + Gesture Handler + Haptics wired and verified | Done | [#4](https://github.com/pedrommarquesm/aura/pull/4) |
| MOB-50 | i18n: i18next + expo-localization, English + Portuguese | Done | [#12](https://github.com/pedrommarquesm/aura/pull/12) |
| MOB-51 | Locale-aware number and plural formatting for Aura values | Done | [#12](https://github.com/pedrommarquesm/aura/pull/12) |

### Web bootstrap

| ID | Task | Status | PR |
|---|---|---|---|
| WEB-01 | Next.js app scaffold (App Router, TypeScript) | Done | [#5](https://github.com/pedrommarquesm/aura/pull/5) |
| WEB-02 | Tailwind setup sharing the mobile design tokens | Done | [#5](https://github.com/pedrommarquesm/aura/pull/5) |
| WEB-03 | Landing page: hero, what is Aura, how it works, download CTA | Done | [#5](https://github.com/pedrommarquesm/aura/pull/5) |
| WEB-04 | Base UI primitives matching the mobile visual language | Done | [#5](https://github.com/pedrommarquesm/aura/pull/5) |
| WEB-05 | SEO baseline: metadata, Open Graph, sitemap, robots | Done | [#5](https://github.com/pedrommarquesm/aura/pull/5) |
| WEB-06 | Data layer ready for the public API (typed fetch from `contracts`) | Done | [#5](https://github.com/pedrommarquesm/aura/pull/5) |
| WEB-07 | Real App Store / Play Store links — placeholders today, must be set before any real traffic | Not started | |
| WEB-08 | Replace mock vector posters with real content once the feed API exists | Not started | |
| WEB-09 | Containerize the web app and deploy it to Railway | Done | [#8](https://github.com/pedrommarquesm/aura/pull/8) |
| WEB-20 | i18n: next-intl, English + Portuguese, translated routes | Done | [#14](https://github.com/pedrommarquesm/aura/pull/14) |
| WEB-21 | Localized SEO: hreflang, per-locale sitemap and metadata | Done | [#14](https://github.com/pedrommarquesm/aura/pull/14) |
| WEB-22 | Point the public landing (trending + leaderboard) at the live API | In review | [#15](https://github.com/pedrommarquesm/aura/pull/15) |

---

## Milestone M1 — V0 core loop

Goal: **Discover → Like → Gain Aura → Climb → Post → Repeat**, end to end.

### Backend foundations

| ID | Task | Status | PR |
|---|---|---|---|
| API-01 | NestJS (Fastify adapter) app skeleton, health check, config module | Done | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| API-02 | Postgres + Drizzle schema and migrations (users, posts, media, likes, aura_events) | Done | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| API-03 | Redis + BullMQ wiring, worker process | Done | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| API-04 | Error envelope, stable error codes, request logging | Done | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| API-05 | Rate limiting middleware (Redis-backed, shared across replicas) | Done | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| API-06 | OpenTelemetry tracing (split out of API-04, not yet wired) | Not started | |
| API-07 | `users.locale` + `Accept-Language` negotiation for server-rendered copy | Done | [#9](https://github.com/pedrommarquesm/aura/pull/9) |
| API-08 | Seed script for client development | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |

### Auth

| ID | Task | Status | PR |
|---|---|---|---|
| API-10 | `AuthIdentity` + `DeviceSession` models | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| API-11 | Sign in with Apple: server-side identity token verification | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| API-12 | Google Sign-In: server-side ID token verification | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| API-13 | JWT access + opaque refresh, rotation with reuse detection | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| MOB-10 | Native Apple/Google sign-in screens + SecureStore token storage | Not started | |
| MOB-11 | Username claim / onboarding flow | Not started | |
| MOB-12 | Guest browsing + auth prompt on first Aura action, replaying the pending action | Not started | |

### Media pipeline

| ID | Task | Status | PR |
|---|---|---|---|
| MEDIA-00 | `MediaUrlResolver` + per-asset provider registry (architecture §6.6) | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| MEDIA-09 | `ObjectStore` port (presign, head, delete, copy) — lands with uploads | Not started | |
| MEDIA-01 | R2 buckets, own CDN domain (`cdn.aura.app`), cache policy | Not started | |
| MEDIA-02 | `POST /posts/uploads` presigned upload + validation | Not started | |
| MEDIA-03 | `POST /posts/:id/complete` + object verification | Not started | |
| MEDIA-04 | Image processing worker: feed/thumb variants, blurhash | Not started | |
| MEDIA-05 | Post lifecycle states and orphan-upload cleanup job | Not started | |
| MEDIA-06 | Video: managed provider integration, always retaining our own master (decision open, architecture §18) | Not started | |
| MEDIA-07 | Storage migration worker: copy, verify checksum, repoint asset, resumable | Not started | |
| MOB-20 | Create flow: camera, picker, preview, caption | Not started | |
| MOB-21 | Resilient upload: progress, cancel, retry, background-safe | Not started | |

### Feed

| ID | Task | Status | PR |
|---|---|---|---|
| API-20 | `GET /feed` latest, cursor pagination | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| API-21 | Feed card projection (author + media variants + `likedByMe`, no N+1) | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| API-22 | `GET /feed/trending` backed by `trendingScore` | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| API-23 | Trending worker + tunable scoring config | Done | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| MOB-30 | FlashList feed, infinite scroll, prefetch, pull to refresh | In review | [#15](https://github.com/pedrommarquesm/aura/pull/15) |
| MOB-31 | Loading, empty, and error/retry states | In review | [#15](https://github.com/pedrommarquesm/aura/pull/15) |
| MOB-32 | Video autoplay in viewport, muted by default, tap for sound | Not started | |
| WEB-10 | Public read-only feed | Not started | |
| WEB-11 | Public post page `/a/@username/post/:postId` + deep link to app | Not started | |

### Aura

| ID | Task | Status | PR |
|---|---|---|---|
| AURA-01 | `AuraLedger`: single writer, transactional event + counter update | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| AURA-02 | `auraForLike()` seam, flat 10, with the Vote Power warning comment (architecture §7.4) | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| AURA-03 | Like / unlike endpoints, idempotent, no self-like, `REVERSAL` on unlike | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| AURA-04 | Reconciliation job: rebuild `users.aura` from the ledger | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| AURA-05 | Global leaderboard: Redis sorted set + SQL fallback + viewer rank | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| MOB-40 | Optimistic like with animation, haptics, and rollback on failure | Not started | |
| MOB-41 | Aura counter animation and `+Aura` feedback | Not started | |
| MOB-42 | Leaderboard screen incl. own rank when outside the top 100 | In review | [#15](https://github.com/pedrommarquesm/aura/pull/15) |
| MOB-43 | Profile as competitive identity card | Not started | |
| WEB-12 | Basic public leaderboard | Not started | |

### Launch minimums

| ID | Task | Status | PR |
|---|---|---|---|
| TS-01 | Report + block models and endpoints | Not started | |
| TS-02 | User status enforcement (suspend/ban revokes sessions) | Not started | |
| TS-03 | Post removal → `REVERSAL` of Aura earned | Not started | |
| TS-04 | Upload quotas and like rate limits | Not started | |
| OPS-01 | Staging environment on Railway (api, worker, Postgres, Redis, web) | Done | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| OPS-02 | Deploy pipeline | Not started | |
| OPS-03 | Dashboards + alerts for feed and like latency | Not started | |
| OPS-04 | Postgres connection pooling (PgBouncer) | Not started | |
| OPS-05 | Separate `APP_ENV` from `NODE_ENV`; staging-only deployment | Done | [#13](https://github.com/pedrommarquesm/aura/pull/13) |
| OPS-06 | Infrastructure as code (`.railway/railway.ts`) + local docker-compose | Done | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| OPS-07 | Production environment — create when the product is ready for real users | Not started | |
| OPS-08 | Seed staging with demo content so the clients have data to integrate against | Not started | |
| ANL-01 | Analytics SDK + core loop events | Not started | |
| ANL-02 | North star instrumentation: Aura Actions / Active User / Day | Not started | |

---

## Milestone M2 — V1 competition

Not started, and deliberately not designed in detail yet. Listed so the V0 seams stay honest.

| ID | Task | Status | PR |
|---|---|---|---|
| AURA-10 | Vote Power — **requires the economics guardrails in architecture §7.5** | Not started | |
| AURA-11 | Aura Sense (prediction quality) | Not started | |
| AURA-12 | Voter rewards worker | Not started | |
| AURA-13 | Super Likes with remote-configurable daily allowance | Not started | |
| AURA-14 | Seasons: season Aura, reset, historical records | Not started | |
| AURA-15 | Leaderboards: country, city, friends, weekly | Not started | |
| AURA-16 | Levels and titles | Not started | |
| API-30 | Following graph + following feed (fan-in) | Not started | |
| API-31 | Comments | Not started | |
| API-32 | Aura Battles | Not started | |
| API-33 | Daily Challenges | Not started | |
| API-34 | Notifications, aggregated (never one push per like) | Not started | |
| TS-10 | Like-ring / multi-account detection over the ledger | Not started | |
| TS-11 | NSFW + spam detection in the media worker | Not started | |
| TS-12 | Admin/moderation dashboard | Not started | |
| MEDIA-10 | Evaluate Bunny (CDN and/or storage) against real traffic — likely R2 origin + Bunny edge | Not started | |

---

## Changelog

Notable decisions, newest first. Link the PR that made them.

| Date | Decision | PR |
|---|---|---|
| 2026-08-28 | Clients read the live API. Web landing and the mobile feed/rank screens hit staging; mocks stay only as an explicit opt-in | [#15](https://github.com/pedrommarquesm/aura/pull/15) |
| 2026-08-28 | Web i18n: next-intl, translated routes (`/about` → `/pt/sobre`), `hreflang` + `x-default`. Format Aura with `pt`, never `pt-PT` | [#14](https://github.com/pedrommarquesm/aura/pull/14) |
| 2026-08-28 | Staging-only deployments. `APP_ENV` (local/staging/production) guards unsafe operations, separate from `NODE_ENV` runtime mode | [#13](https://github.com/pedrommarquesm/aura/pull/13) |
| 2026-08-28 | Mobile i18n: i18next + ICU, English + European Portuguese, locale-aware Aura number formatting (`pt`, not `pt-PT`) | [#12](https://github.com/pedrommarquesm/aura/pull/12) |
| 2026-08-28 | V0 API surface: auth, feed, likes on the ledger, leaderboard. Feed and leaderboard readable signed out, for guest browsing | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| 2026-08-28 | i18n: English + European Portuguese, ICU catalogs, translated web routes. API stays locale-agnostic; clients translate stable error codes | [#9](https://github.com/pedrommarquesm/aura/pull/9) |
| 2026-08-28 | Backend deployed to Railway; infrastructure as code in `.railway/railway.ts` (Railway deprecated `railway.json`) | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| 2026-08-28 | Media portability: provider stored per asset, keys not URLs, served from our own domain. Bunny to be evaluated post-V0 | [#3](https://github.com/pedrommarquesm/aura/pull/3) |
| 2026-08-28 | Mobile auth: Apple + Google native, API-issued tokens, no passwords in V0. Web has no auth in V0 | [#2](https://github.com/pedrommarquesm/aura/pull/2) |
| 2026-08-28 | NestJS on Fastify; Cloudflare R2 for storage | [#2](https://github.com/pedrommarquesm/aura/pull/2) |
| 2026-08-28 | Aura unit: flat 10 per like in V0, integer always, Vote Power deferred behind `auraForLike()` | [#2](https://github.com/pedrommarquesm/aura/pull/2) |
| 2026-08-28 | Backend architecture: modular monolith, ledger-based Aura, media plane off the API | [#1](https://github.com/pedrommarquesm/aura/pull/1) |
