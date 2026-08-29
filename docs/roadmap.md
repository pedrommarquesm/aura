# Aura — Work Plan & Tracker

Single source of truth for what is planned, in flight, and done.

- Product spec: [product-spec.md](./product-spec.md)
- Backend architecture: [backend-architecture.md](./backend-architecture.md)
- Client media (pick → shrink → PUT): [client-media.md](./client-media.md)

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

**Now** — Rebuild web so it bakes `https://api.aurarankd.com`. Attach `cdn.aurarankd.com` to the R2 bucket (staging still emits `cdn.aura.app`). Then Cloudflare Stream for real video (`MEDIA-06`). Apple `APPLE_CLIENT_ID` on staging is still needed for Sign in with Apple.

**Next** — video autoplay once posts have real media on the CDN (`MEDIA-06`, then `MOB-32`).

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
| FND-05 | CI: typecheck, lint, test on PR | Done | [#21](https://github.com/pedrommarquesm/aura/pull/21) |
| FND-06 | Environment/secrets convention (`.env.example` per app) | Done | [#21](https://github.com/pedrommarquesm/aura/pull/21) |
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
| WEB-08 | Replace mock vector posters with real content once the feed API exists | Done | [#23](https://github.com/pedrommarquesm/aura/pull/23) |
| WEB-09 | Containerize the web app and deploy it to Railway | Done | [#8](https://github.com/pedrommarquesm/aura/pull/8) |
| WEB-20 | i18n: next-intl, English + Portuguese, translated routes | Done | [#14](https://github.com/pedrommarquesm/aura/pull/14) |
| WEB-21 | Localized SEO: hreflang, per-locale sitemap and metadata | Done | [#14](https://github.com/pedrommarquesm/aura/pull/14) |
| WEB-22 | Point the public landing (trending + leaderboard) at the live API | Done | [#15](https://github.com/pedrommarquesm/aura/pull/15) |

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
| MOB-10 | Native Apple/Google sign-in screens + SecureStore token storage | Done | [#17](https://github.com/pedrommarquesm/aura/pull/17) |
| MOB-11 | Username claim / onboarding flow | Done | [#17](https://github.com/pedrommarquesm/aura/pull/17) |
| MOB-12 | Guest browsing + auth prompt on first Aura action, replaying the pending action | Done | [#17](https://github.com/pedrommarquesm/aura/pull/17) |

### Media pipeline

| ID | Task | Status | PR |
|---|---|---|---|
| MEDIA-00 | `MediaUrlResolver` + per-asset provider registry (architecture §6.6) | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| MEDIA-09 | `ObjectStore` port (presign, head, delete, copy) — lands with uploads | Done | [#19](https://github.com/pedrommarquesm/aura/pull/19) |
| MEDIA-01 | R2 bucket `aura-media` + immutable Cache-Control. `cdn.aurarankd.com` still needs attaching | Done | [#19](https://github.com/pedrommarquesm/aura/pull/19) |
| MEDIA-02 | `POST /posts/uploads` presigned upload + validation | Done | [#19](https://github.com/pedrommarquesm/aura/pull/19) |
| MEDIA-03 | `POST /posts/:id/complete` + object verification | Done | [#19](https://github.com/pedrommarquesm/aura/pull/19) |
| MEDIA-04 | Image processing worker: feed/thumb JPEG variants (blurhash later) | Done | [#19](https://github.com/pedrommarquesm/aura/pull/19) |
| MEDIA-05 | Post lifecycle states and orphan-upload cleanup job | Done | [#19](https://github.com/pedrommarquesm/aura/pull/19) |
| MEDIA-06 | Video: managed provider integration, always retaining our own master (decision open, architecture §18) | Not started | |
| MEDIA-07 | Storage migration worker: copy, verify checksum, repoint asset, resumable | Not started | |
| MOB-20 | Create flow: camera, picker, preview, caption | Done | [#19](https://github.com/pedrommarquesm/aura/pull/19) |
| MOB-21 | Resilient upload: progress, cancel, retry. Background-safe is still later | Done | [#19](https://github.com/pedrommarquesm/aura/pull/19) |
| MOB-52 | Choose photo (library, images only). Take a picture stays visible and disabled. Client shrinks to 2160 JPEG before PUT; parallel pipeline is in docs/client-media.md | Done | [#29](https://github.com/pedrommarquesm/aura/pull/29) |
| MOB-53 | Choose photo must not kill the iOS process (no Photos permission prompt for PHPicker; no HEIC fast-path; no File() on ph://) | Done | [#32](https://github.com/pedrommarquesm/aura/pull/32) |
| MOB-54 | Do not list `expo-image-manipulator` as an Expo config plugin — it has none, and `expo run:ios` then loads `src/index.ts` in Node and dies | Done | [#33](https://github.com/pedrommarquesm/aura/pull/33) |

### Feed

| ID | Task | Status | PR |
|---|---|---|---|
| API-20 | `GET /feed` latest, cursor pagination | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| API-21 | Feed card projection (author + media variants + `likedByMe`, no N+1) | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| API-22 | `GET /feed/trending` backed by `trendingScore` | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| API-23 | Trending worker + tunable scoring config | Done | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| API-24 | `GET /v1/users/:username` — public competitive card (rank, title, Aura, post count) | Done | [#24](https://github.com/pedrommarquesm/aura/pull/24) |
| API-25 | `GET /v1/users/:id/posts` — published posts, cursor pagination | Done | [#24](https://github.com/pedrommarquesm/aura/pull/24) |
| MOB-30 | FlashList feed, infinite scroll, prefetch, pull to refresh | Done | [#15](https://github.com/pedrommarquesm/aura/pull/15) |
| MOB-31 | Loading, empty, and error/retry states | Done | [#15](https://github.com/pedrommarquesm/aura/pull/15) |
| MOB-32 | Video autoplay in viewport, muted by default, tap for sound | Not started | |
| WEB-10 | Public read-only feed | Done | [#18](https://github.com/pedrommarquesm/aura/pull/18) |
| WEB-11 | Public post page `/a/@username/post/:postId` + deep link to app | Done | [#23](https://github.com/pedrommarquesm/aura/pull/23) |
| WEB-14 | Share path is `/a/:username/post/:id`. A leading `@` 308s away — Next.js treats `@slot` as a parallel route and RSC-prefetches looped | Done | [#31](https://github.com/pedrommarquesm/aura/pull/31) |
| WEB-13 | Web Google sign-in as a thin API client (httpOnly cookies, username claim) | Done | [#18](https://github.com/pedrommarquesm/aura/pull/18) |
| WEB-15 | Like / unlike on the web feed, trending cards, and share page. Guests sign in with Google and the pending like lands. Posting stays in the app | In review | |

### Aura

| ID | Task | Status | PR |
|---|---|---|---|
| AURA-01 | `AuraLedger`: single writer, transactional event + counter update | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| AURA-02 | `auraForLike()` seam, flat 10, with the Vote Power warning comment (architecture §7.4) | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| AURA-03 | Like / unlike endpoints, idempotent, no self-like, `REVERSAL` on unlike | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| AURA-04 | Reconciliation job: rebuild `users.aura` from the ledger | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| AURA-05 | Global leaderboard: Redis sorted set + SQL fallback + viewer rank | Done | [#11](https://github.com/pedrommarquesm/aura/pull/11) |
| MOB-40 | Optimistic like with animation, haptics, and rollback on failure | Done | [#17](https://github.com/pedrommarquesm/aura/pull/17) |
| MOB-41 | Aura counter animation and `+Aura` feedback | Done | [#25](https://github.com/pedrommarquesm/aura/pull/25) |
| MOB-42 | Leaderboard screen incl. own rank when outside the top 100 | Done | [#15](https://github.com/pedrommarquesm/aura/pull/15) |
| MOB-43 | Profile as competitive identity card | Done | [#25](https://github.com/pedrommarquesm/aura/pull/25) |
| WEB-12 | Basic public leaderboard | Done | [#22](https://github.com/pedrommarquesm/aura/pull/22) |

### Launch minimums

| ID | Task | Status | PR |
|---|---|---|---|
| TS-01 | Report + block models and endpoints | Done | [#26](https://github.com/pedrommarquesm/aura/pull/26) |
| TS-02 | User status enforcement (suspend/ban revokes sessions) | Done | [#27](https://github.com/pedrommarquesm/aura/pull/27) |
| TS-03 | Post removal → `REVERSAL` of Aura earned | Done | [#27](https://github.com/pedrommarquesm/aura/pull/27) |
| TS-04 | Upload quotas and like rate limits | Done | [#26](https://github.com/pedrommarquesm/aura/pull/26) |
| OPS-01 | Staging environment on Railway (api, worker, Postgres, Redis, web) | Done | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| OPS-02 | Deploy pipeline | Not started | |
| OPS-03 | Dashboards + alerts for feed and like latency | Not started | |
| OPS-04 | Postgres connection pooling (PgBouncer) | Not started | |
| OPS-05 | Separate `APP_ENV` from `NODE_ENV`; staging-only deployment | Done | [#13](https://github.com/pedrommarquesm/aura/pull/13) |
| OPS-06 | Infrastructure as code (`.railway/railway.ts`) + local docker-compose | Done | [#7](https://github.com/pedrommarquesm/aura/pull/7) |
| OPS-07 | Production environment — create when the product is ready for real users | Not started | |
| OPS-08 | Seed staging with demo content so the clients have data to integrate against | Not started | |
| OPS-09 | Custom domain `aurarankd.com` on staging (web, api, `cdn` on R2) | Done | [#20](https://github.com/pedrommarquesm/aura/pull/20) |
| OPS-10 | `www.aurarankd.com` is the canonical web host. `NEXT_PUBLIC_SITE_URL` matches | Done | [#30](https://github.com/pedrommarquesm/aura/pull/30) |
| OPS-11 | Apex → www is DNS-only. The Next proxy no longer 308s the host | In review | [#31](https://github.com/pedrommarquesm/aura/pull/31) |
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
| 2026-08-29 | Web can like. Guests are sent to Google sign-in and the pending like is replayed. The BFF (`POST|DELETE /api/posts/:id/like`) wraps the API JWT. Posting stays in the app | |
| 2026-08-29 | `expo-image-manipulator` is a native module, not a config plugin. Listing it in `app.json` `plugins` breaks `expo run:ios` (`Cannot find module './ImageManipulator'`). Autolink is enough | [#33](https://github.com/pedrommarquesm/aura/pull/33) |
| 2026-08-29 | iOS Choose photo must not call `requestMediaLibraryPermissionsAsync` or use the HEIC `Current` fast path. PHPicker needs neither; both terminate the process when the Photos usage string is missing or the original is huge | [#32](https://github.com/pedrommarquesm/aura/pull/32) |
| 2026-08-29 | Web share URLs are `/a/:username/post/:id`. `/a/@username/…` 308s there. Next.js App Router cannot have `@` in a path segment (parallel-route slots); feed prefetch was an RSC loop | [#31](https://github.com/pedrommarquesm/aura/pull/31) |
| 2026-08-29 | Apex → `www` is a DNS redirect. The Next proxy does not 308 the host (that hop was looping Flight requests) | [#31](https://github.com/pedrommarquesm/aura/pull/31) |
| 2026-08-29 | Canonical web host is `www.aurarankd.com`. `NEXT_PUBLIC_SITE_URL` is `https://www.aurarankd.com` | [#30](https://github.com/pedrommarquesm/aura/pull/30) |
| 2026-08-29 | `aurarankd.com`, `www`, and `api.aurarankd.com` DNS answer. Web and mobile clients use `https://api.aurarankd.com`. `cdn.aurarankd.com` still needs attaching to the R2 bucket | [#28](https://github.com/pedrommarquesm/aura/pull/28) |
| 2026-08-28 | Suspend/ban revokes every device session immediately and returns `account_suspended` / `account_banned`. Banned authors leave the feed and leaderboard. Removing a post (author or moderator) writes a ledger `REVERSAL` for the remaining Aura. `X-Moderation-Key` is the V0 stand-in for the admin dashboard | [#27](https://github.com/pedrommarquesm/aura/pull/27) |
| 2026-08-28 | Public post URLs stay unprefixed (`/a/@username/post/:id`). The page server-renders `GET /v1/posts/:id`, offers store + `aura://` deep links, and never lets the web like or post. Live feed cards are the posters; mocks stay behind `NEXT_PUBLIC_USE_MOCK_API` | [#23](https://github.com/pedrommarquesm/aura/pull/23) |
| 2026-08-28 | Reports and blocks are thin tables. `POST /v1/reports`, `POST /v1/blocks`, `DELETE /v1/blocks/:userId`. The feed hides both directions of a block. Likes are capped per user (`LIKE_RATE_LIMIT_*`); daily upload quota was already `MEDIA_DAILY_UPLOAD_QUOTA` | [#26](https://github.com/pedrommarquesm/aura/pull/26) |
| 2026-08-28 | Profile is a competitive card: rank, title, Aura, and a real posts grid from `GET /v1/users/:username` and `GET /v1/users/:id/posts`. Aura totals tick instead of snapping when a like lands | [#25](https://github.com/pedrommarquesm/aura/pull/25) |
| 2026-08-28 | Public profile is `GET /v1/users/:username` (rank + Aura + post count). The posts grid is `GET /v1/users/:id/posts`, same cursor as the feed. Banned users 404 | [#24](https://github.com/pedrommarquesm/aura/pull/24) |
| 2026-08-28 | Uploads go direct to Cloudflare R2 via presigned PUT. Images get feed/thumb JPEGs on the worker; video keeps the master as the playable file until Stream. Public reads use our CDN hostname, not R2's | [#19](https://github.com/pedrommarquesm/aura/pull/19) |
| 2026-08-28 | Public `/leaderboard` (`/pt/classificacao`) reads `GET /v1/leaderboards/global`. Posting and liking stay in the app | [#22](https://github.com/pedrommarquesm/aura/pull/22) |
| 2026-08-28 | Public hostnames are `aurarankd.com` (web), `api.aurarankd.com` (api), `cdn.aurarankd.com` (R2). Staging is the only environment they point at | [#20](https://github.com/pedrommarquesm/aura/pull/20) |
| 2026-08-28 | PRs run typecheck, lint and tests per app. Secrets stay in `.env` / Railway `preserve()`, never git | [#21](https://github.com/pedrommarquesm/aura/pull/21) |
| 2026-08-28 | Web Google sign-in is a thin BFF of the API (httpOnly cookies, no NextAuth user store). Public `/feed` is readable signed out. Posting and liking stay in the app | [#18](https://github.com/pedrommarquesm/aura/pull/18) |
| 2026-08-28 | Mobile auth: guest feed, Apple/Google sign-in, username claim, pending like/create replayed after session | [#17](https://github.com/pedrommarquesm/aura/pull/17) |
| 2026-08-28 | `GET /` on the API returns a service index instead of `Cannot GET /` | [#16](https://github.com/pedrommarquesm/aura/pull/16) |
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
