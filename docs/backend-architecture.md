# Aura — Initial Backend Architecture Proposal

Status: **proposal** (not an implementation plan yet)
Scope: V0 first, with explicit seams for V1
Companion: [Product spec](./product-spec.md)

This is a starting architecture, not a final one. The goal is to ship the core loop — **Discover → Like → Gain Aura → Climb → Post** — without painting ourselves into a corner on media, traffic, or the Aura economy.

---

## 1. What the backend actually has to be good at

Aura is not a generic CRUD social app. The backend has four hard problems:

| Problem | Why it is hard | V0 bar |
|---|---|---|
| **Media** | Photos and videos are large, slow, and expensive. The API must never become a file proxy. | Direct upload, CDN delivery, transcode/thumbnail pipeline, retryable publish |
| **Feed reads** | Almost every session is infinite scroll. Latency here *is* the product. | Cursor pagination, <100ms p95 for a page, prefetch-friendly payloads |
| **Like / Aura writes** | Likes are the game. They must be fast, idempotent, auditable, and abuse-resistant. | Optimistic-safe API, ledger write, denormalized counters |
| **Leaderboards** | Rank queries cannot scan the users table on every profile/feed render. | Precomputed rank, O(log n) “where am I?” |

Everything else (auth, profiles, public web pages) is important, but secondary.

---

## 2. Design principles

1. **Modular monolith for V0.** One API, one Postgres, one worker pool. Split services only when a bottleneck is real (usually media processing or feed reads).
2. **The API never stores or streams media bytes.** Object storage + CDN own that plane.
3. **Aura is a ledger, not a counter.** Counters exist for reads. The `AuraEvent` table is the source of truth.
4. **Read models are allowed to be denormalized.** Feed cards, ranks, and like counts are projections.
5. **Hot paths stay boring.** Feed GET and like POST should not call ML, fan-out graphs, or extra networks in V0.
6. **Clients are optimistic; the server is authoritative.** Likes can roll back. Aura never comes from the client.
7. **Build the V1 seam, not the V1 feature.** Vote Power, Aura Sense, battles, and seasons should plug into the ledger and event bus later — not into random `UPDATE users SET aura = aura + 1` calls.

---

## 3. High-level shape

```text
                         ┌──────────────┐
                         │  Mobile app  │  (create, like, compete)
                         │  Expo / RN   │
                         └──────┬───────┘
                                │ HTTPS JSON
                                │
┌──────────────┐        ┌───────▼────────┐        ┌─────────────────┐
│  Web (read)  │───────►│   Aura API     │◄──────►│   PostgreSQL    │
│  landing +   │        │  modular       │        │   source of     │
│  public feed │        │  monolith      │        │   truth         │
└──────────────┘        └───────┬────────┘        └────────▲────────┘
                                │                          │
                     ┌──────────┼──────────┐               │
                     │          │          │               │
              ┌──────▼───┐ ┌────▼────┐ ┌───▼────┐   ┌──────┴──────┐
              │  Redis   │ │  Queue  │ │ Object │   │   Workers   │
              │  cache,  │ │  jobs   │ │ store  │   │  media,     │
              │  ranks,  │ │         │ │ + CDN  │   │  aura,      │
              │  limits  │ └────▲────┘ └───▲────┘   │  trending   │
              └──────────┘      │          │        └─────────────┘
                                │    presigned PUT / GET
                                │          │
                         client uploads ───┘
                         bytes never pass
                         through the API
```

Three planes, on purpose:

- **Application plane** — auth, posts metadata, likes, Aura, leaderboards, feed queries.
- **Media plane** — upload, transcode, variants, CDN. Independent scale and failure domain.
- **Async plane** — workers that turn events into projections (trending scores, ranks, later voter rewards / notifications).

---

## 4. Recommended stack (V0)

Chosen for speed of iteration, mobile-first clients, and a clean path to scale. Alternatives are listed where the choice is genuinely open.

| Layer | Proposal | Why |
|---|---|---|
| API | **TypeScript + Fastify** (or NestJS if we want more batteries) | Same language as Expo. Fast enough. Easy to share Zod types with the app. |
| Validation | **Zod** | Shared contracts with React Native / web. |
| ORM | **Drizzle** | SQL-shaped, migrations we actually read, good enough for a ledger. |
| Primary DB | **PostgreSQL** | Relational integrity for users/likes/events. JSONB only for non-query metadata. |
| Cache / ranks | **Redis** | Sorted sets for leaderboards, short-TTL feed cache, rate limits. |
| Jobs | **Redis queue** (BullMQ) | Media processing, trending recompute, notification aggregation. |
| Object storage | **S3-compatible** (Cloudflare R2 or S3) | Cheap egress on R2 is attractive for video. |
| CDN | **Cloudflare** in front of storage | Image resizing, cache, public post pages. |
| Video | **Managed transcoding first** (Cloudflare Stream / Mux) *or* ffmpeg workers | V0 should not invent a video platform. See §6. |
| Auth | **Self-hosted JWT access + opaque refresh**, Apple/Google later | Mobile-native. Avoid a third-party auth bottleneck early; can revisit. |
| Observability | OpenTelemetry + structured logs + one APM | Feed and like latency must be visible from day one. |
| Hosting (V0) | One region: API + worker + Postgres + Redis | Boring. Multi-region is a later problem. |

**Not proposed for V0:** Kafka, Elasticsearch, Cassandra, GraphQL, microservices, Kubernetes, ML ranking, websocket fan-out.

A single Node process can serve the API. A second process (same codebase) runs workers. That is already a real production shape.

---

## 5. Core data model

IDs: **UUIDv7** (time-sortable, good as feed cursors). Do not use autoincrement IDs in public URLs.

### 5.1 Source of truth

```text
User
  id, username, createdAt
  country, city                 -- nullable in V0; needed for later boards
  aura                          -- denormalized lifetime sum
  auraSense, votePower          -- V1 columns, defaulted, unused in V0
  title, streak                 -- V1 / cosmetic
  status                        -- active | suspended | banned

Post
  id, authorId, createdAt
  caption
  mediaType                     -- photo | video
  status                        -- uploading | processing | published | failed | removed
  likeCount                     -- denormalized
  aura                          -- denormalized Aura awarded to this post
  trendingScore                 -- worker-maintained
  publishedAt                   -- set when status becomes published

MediaAsset
  id, postId
  storageKey                    -- original object
  contentType, byteSize, checksum
  width, height, durationMs
  variants JSON                 -- { "feed": url, "thumb": url, "hls": url, "poster": url }
  processingStatus

Like
  userId, postId, createdAt
  kind                          -- like | super_like (super_like unused in V0)
  PRIMARY KEY (userId, postId)  -- idempotency

AuraEvent
  id
  userId                        -- who receives Aura
  sourceUserId                  -- who caused it (liker, system)
  postId
  type                          -- LIKE | SUPER_LIKE | BATTLE_WIN | CHALLENGE
                                -- | VOTER_REWARD | BONUS | REVERSAL
  amount                        -- integer, can be negative for REVERSAL
  metadata JSONB                -- vote power used, idempotency key, reason
  createdAt
```

Rules:

- **Never** increment `User.aura` or `Post.aura` without inserting an `AuraEvent` in the same transaction.
- **Never** delete likes silently. Unlike = delete `Like` row **and** write `REVERSAL` event.
- `Like` unique constraint is the idempotency mechanism for the hottest write.

### 5.2 Indexes that matter on day one

```text
posts (status, published_at DESC, id DESC)          -- latest feed cursor
posts (status, trending_score DESC, id DESC)        -- trending feed
posts (author_id, published_at DESC)                -- profile grid
likes (post_id, created_at DESC)
aura_events (user_id, created_at DESC)
aura_events (post_id, created_at DESC)
aura_events (source_user_id, created_at DESC)       -- abuse investigation
users (username) UNIQUE
users (aura DESC, id)                               -- bootstrap global board
```

`aura_events` will become large. Plan to **partition by month** before it hurts, not after. The application should not care about the partition scheme.

---

## 6. Uploaded data (media plane)

This is the subsystem most social backends get wrong. Bytes and metadata must be separated.

### 6.1 Why the API must not receive the file

A 30s video is tens of megabytes. If that traffic hits the API:

- request timeouts and memory blow up
- horizontal scaling becomes a bandwidth problem, not a CPU problem
- retries re-upload through the most expensive path

The client uploads **directly to object storage** with a short-lived presigned URL.

### 6.2 Publish flow

```text
1. Client:  POST /posts/uploads
            { mediaType, contentType, byteSize, checksum, width, height, durationMs }

2. API:     - auth + rate limit + size/type validation
            - insert Post(status=uploading) + MediaAsset(processingStatus=pending)
            - return { postId, uploadUrl, uploadHeaders, maxBytes }

3. Client:  PUT <uploadUrl>   (file bytes → object storage)
            show progress, allow cancel, retry on failure

4. Client:  POST /posts/:id/complete
            { caption }

5. API:     - verify object exists + size/checksum
            - set Post.status=processing
            - enqueue ProcessMediaJob
            - return { postId, status: "processing" }

6. Worker:  - image: generate feed (1080) + thumb (400) + blurhash
            - video: transcode to HLS (or hand off to Stream/Mux), extract poster
            - write variants onto MediaAsset
            - set Post.status=published, publishedAt=now()
            - enqueue UpdateTrendingJob (new content starts with recency)

7. Push / poll: client learns "published" and the post enters feeds
```

Failure cases the client must handle (spec: retry, cancel, progress):

| Failure | Behaviour |
|---|---|
| Presign expired | Client requests a new upload URL for the same `postId` |
| PUT interrupted | Resume if storage supports it; otherwise retry PUT |
| Checksum mismatch | Mark post `failed`, do not publish |
| Transcode failure | Retry with backoff, then `failed` + client retry CTA |
| User cancels | Delete object + mark post `failed` / purge |
| Client never completes | TTL job after N hours deletes orphan upload |

Posts in `uploading` / `processing` **do not appear in feeds**. The public URL can show a processing state if someone shares early, but V0 can simply 404 until published.

### 6.3 Image vs video

**Images (V0, keep in-house)**

- Accept jpeg/heic/webp/png
- Normalize to jpeg/webp feed rendition + jpeg thumb
- Store original for later reprocess
- CDN image resizing as a safety net (`/cdn-cgi/image/...` or equivalent) so the app can request the size it needs without a combinatorial explosion of variants

**Video (V0, do not build a transcoder farm)**

Recommendation: **managed video** (Cloudflare Stream or Mux).

- Client still uses the same `POST /posts/uploads` contract
- Worker creates the Stream/Mux asset from the original object (or direct upload to the vendor)
- Playback URL + poster come back on `MediaAsset.variants`
- We pay per minute encoded / stored, and we skip ffmpeg ops, HLS packaging, and mobile codec hell

Revisit self-hosted ffmpeg workers only when video spend is a real line item and we have the ops to match.

### 6.4 Delivery

Feed payloads never contain storage keys. They contain **CDN URLs** already sized for the card:

```json
{
  "id": "...",
  "author": { "username": "pedro", "aura": 28421, "title": "Aura Farmer" },
  "media": {
    "type": "video",
    "thumbUrl": "https://cdn.aura.app/...",
    "feedUrl": "https://cdn.aura.app/...",
    "hlsUrl": "https://cdn.aura.app/.../manifest.m3u8",
    "width": 1080,
    "height": 1350,
    "durationMs": 7400
  },
  "caption": "...",
  "likeCount": 1284,
  "aura": 4210,
  "likedByMe": false
}
```

CDN cache: long TTL for immutable variant objects (`/media/{assetId}/v1/feed.jpg`). Cache-bust by version in the path, not query strings the CDN might ignore.

The API can stay cache-Control: private. Media should be publicly cacheable (no cookies on the CDN host).

### 6.5 Cost / abuse controls on upload

- Max photo size and max video duration/bitrate, enforced **before** presign and re-checked after PUT
- Per-user daily upload quota
- Per-user concurrent processing cap
- Virus/malware scanning is optional in V0; NSFW classification is a V1 worker on the same `ProcessMediaJob` hook

---

## 7. Aura Event System (write path)

This is the economic core. Treat it like a payment ledger.

### 7.1 Single writer

All Aura mutations go through one module: `AuraLedger`.

```text
apply(event):
  BEGIN
    INSERT aura_events (...)
    UPDATE users SET aura = aura + amount WHERE id = userId
    UPDATE posts SET aura = aura + amount, like_count = ... WHERE id = postId
    -- later: voter reward rows, sense updates, etc.
  COMMIT
  enqueue RankUpdate(userId)
  enqueue TrendingUpdate(postId)
```

No other code path may touch `users.aura`.

### 7.2 Like (hottest write)

```text
POST /posts/:id/like
  - reject if actor is author (no self-voting)
  - reject if post not published
  - INSERT like (userId, postId) ON CONFLICT DO NOTHING
  - if conflict → 200 already-liked (idempotent, UI-safe)
  - else AuraLedger.apply(LIKE, amount = votePower(actor) or 1 in V0)
  - return { likeCount, postAura, actorAuraDelta: 0, creatorAura }
```

Unlike:

```text
DELETE /posts/:id/like
  - delete like row
  - AuraLedger.apply(REVERSAL, amount = -original)
```

Store the original like’s event id on the `Like` row (or look it up) so reversal amount is exact. Do not recompute “what a like is worth today” on unlike.

### 7.3 Why a ledger instead of `aura += 1`

The spec requires auditing, fraud investigation, rollbacks, analytics, and recalculation. With a ledger we can:

- replay a user’s Aura
- reverse a like-ring
- recompute Vote Power later without rewriting history
- answer “why did I gain 127 Aura?” from data, not logs

`users.aura` is a **materialized sum**. If it ever diverges, a reconciliation job rebuilds it from events. That job should exist in V0 even if we rarely run it.

### 7.4 V0 amount vs V1 Vote Power

V0: `amount = 1` (or a small integer constant, e.g. 10, so we have room to tune).

V1: `amount = f(votePower)`, diminishing returns, cap. The like handler already calls `votePower(actor)` — in V0 that function returns `1`. **Do not scatter `+1` in controllers.**

Voter rewards and Aura Sense are **async**: a later worker looks at whether liked posts performed well, then writes `VOTER_REWARD` events. The like request itself must not wait on that.

---

## 8. Feed (hottest read)

### 8.1 Contract

As specified:

```text
GET /feed?cursor=&limit=10
GET /feed/trending?cursor=&limit=10
GET /feed/following?cursor=&limit=10   -- V1
```

```json
{
  "items": [ /* feed cards, see §6.4 */ ],
  "nextCursor": "01J...",
  "hasMore": true
}
```

Cursor = opaque, signed or encrypted `{ publishedAt, id }` (latest) or `{ trendingScore, id }` (trending). Never offset pagination.

Limit default 10, max 20. The app prefetches; the server should assume the next page is coming.

### 8.2 V0 ranking (no ML)

**Latest** — `published_at DESC, id DESC` on published posts. This is the reliable baseline.

**Trending** — precomputed `posts.trending_score`, updated by a worker, not on read.

Conceptual score from the spec:

```text
score = auraVelocity × recencyFactor × engagementFactor
```

Practical V0 formula (tunable constants in config, not code):

```text
velocity     = aura gained in last 15m / 15
recency      = exp(-ageHours / 18)
engagement   = log(1 + likeCount)
score        = velocity * recency * (1 + engagement)
```

Worker options:

- **Cheap:** recompute top N recent posts every 15–30s (good until tens of thousands of live posts)
- **Better:** on every like, bump that post’s score in Redis; a flusher writes back to Postgres periodically

V0 can start with periodic recompute. The like path already enqueues `TrendingUpdate` — we can switch to incremental without changing the API.

### 8.3 What the feed query should do

For a page of 10:

1. Query 10 post IDs by cursor (covering index only)
2. Join author + media variants (or hydrate from a `feed_card` JSON projection later)
3. Batch-check `likedByMe` for the actor (`WHERE user_id = ? AND post_id IN (...)`)
4. Return

Avoid N+1. Avoid loading comments (out of V0 anyway). Avoid computing Aura on the fly.

### 8.4 Caching

| Data | Cache |
|---|---|
| Anonymous / web trending page | Redis 5–15s, maybe CDN 10s |
| Authenticated home feed | Skip full-page cache. Cache **author + media** fragments if needed |
| `likedByMe` | Must be per-user; do not put it in a shared cache key |
| CDN media | Hours–days, immutable |

A 10-second trending cache for the web landing page is a huge win and does not affect the game.

At higher traffic, maintain a Redis list/zset of trending post IDs and only hit Postgres for hydration. That is the first feed scale-up, not a rewrite.

### 8.5 Fan-out vs fan-in

V0 feeds are **global** (latest / trending). That is **fan-in**: one query, no per-user write amplification.

V1 following feed should stay **fan-in** until follow graphs are huge (query `posts WHERE author_id IN (following) ORDER BY published_at`). Fan-out-on-write (Twitter 2010 style) is unnecessary until celebrity users break that query. Do not build it now.

---

## 9. Leaderboards

V0 only needs **global lifetime Aura**. Design as if country / city / weekly / season will appear, because Redis sorted sets make that cheap.

```text
ZSET lb:global          member=userId  score=aura
ZSET lb:season:{id}     ...
ZSET lb:week:{yyyy-ww}
ZSET lb:country:{cc}
```

Reads:

- Top 100: `ZREVRANGE 0 99 WITHSCORES`
- Viewer rank even if #40,000: `ZREVRANK` + `ZSCORE`
- Neighbourhood around you: rank ± 3

Writes: on every `AuraLedger` commit, `ZINCRBY` the relevant sets. Periodic full rebuild from `users.aura` (hourly) so Redis and Postgres cannot drift forever.

Postgres remains source of truth. Redis is the read model. If Redis is empty, rebuild from Postgres; do not fail the profile page — fall back to a SQL rank estimate.

---

## 10. High traffic and scalability

### 10.1 Rough load shape (social + game)

Assume a healthy V0 session:

- 1 feed first page + 3–6 prefetch pages
- 10–40 likes
- 0–1 uploads
- 1 profile, 1 leaderboard

Reads dominate **request count**. Media dominates **bandwidth**. Likes dominate **write contention**.

If 50k DAU × 8 sessions × 30 API calls ≈ **12M API requests/day** (~140 RPS average, 1k+ RPS peak). That is still one well-indexed Postgres + a few API instances, **if** media is off the API and likes are simple transactions.

Video at 1k concurrent viewers is a CDN problem, not an API problem.

### 10.2 Scale in stages, not in theory

**Stage 0 — launch (this proposal)**

- 2+ stateless API instances behind a load balancer
- 1 Postgres (primary)
- 1 Redis
- 1–N workers
- CDN + object storage

**Stage 1 — first pain (usually likes + feed)**

- PgBouncer / connection pooling
- Redis trending ID list
- Leaderboard fully served from Redis
- Read replica for feed/profile if primary CPU is the limiter

**Stage 2 — write hotspot on `posts` / `users` rows**

- Popular post like storms: move `likeCount` / hot `post.aura` increments to Redis, flush every 1s, keep the **ledger insert** synchronous (or batched with idempotency keys)
- Partition `aura_events` and `likes` by time or hash

**Stage 3 — real scale**

- Split **media workers** into their own service (already a separate process)
- Split **read API** (feed, profiles, boards) from **write API** (like, upload complete)
- Consider a dedicated Aura service only if ledger volume demands it
- Multi-region: pin writes to one primary region; CDN is already global

Do not start at stage 3.

### 10.3 Horizontal scaling rules

- API is stateless. Session = JWT. Refresh tokens in Postgres (or Redis).
- Workers are idempotent. `ProcessMediaJob(postId)` can run twice safely.
- No sticky sessions.
- No local disk for media.

### 10.4 Rate limits (product, not just ops)

| Action | Suggested V0 limit |
|---|---|
| Like / unlike | generous per minute, hard per second (anti-bot) |
| Super like | daily cap (config), V1 |
| Create upload | N per hour |
| Signup from one IP | tight |
| Feed | standard; prefetch will burst — allow bursts |
| Leaderboard | cache 1–2s |

Return `429` with `Retry-After`. The mobile client already needs retry UX.

### 10.5 Database connection budget

Each Node instance will otherwise eat dozens of Postgres connections. Use a pooler from day one. Feed + like at 1k RPS is a **connection** problem before it is a query problem.

---

## 11. API surface (V0)

Versioned prefix: `/v1`.

Auth: `Authorization: Bearer <access>`. Refresh via `POST /v1/auth/refresh`.

| Method | Path | Notes |
|---|---|---|
| POST | `/v1/auth/signup` | username uniqueness, password hash (argon2id) |
| POST | `/v1/auth/login` | |
| POST | `/v1/auth/refresh` | rotate refresh tokens |
| GET | `/v1/me` | |
| PATCH | `/v1/me` | |
| GET | `/v1/feed` | latest |
| GET | `/v1/feed/trending` | |
| POST | `/v1/posts/uploads` | presign |
| POST | `/v1/posts/:id/complete` | caption + enqueue processing |
| GET | `/v1/posts/:id` | public if published |
| DELETE | `/v1/posts/:id` | author only; soft delete |
| POST | `/v1/posts/:id/like` | idempotent |
| DELETE | `/v1/posts/:id/like` | |
| GET | `/v1/users/:username` | public competitive card |
| GET | `/v1/users/:id/posts` | cursor |
| GET | `/v1/leaderboards/global` | top + `viewerRank` |
| GET | `/v1/notifications` | stub empty in V0 or skip |

Public web can call the same GET endpoints with optional auth. No upload routes on web (product rule). Deep link `/a/@username/post/:postId` is a web route that server-renders or hydrates `GET /v1/posts/:id`.

Errors: `{ error: { code, message } }` plus HTTP status. Stable `code` values for the app (`already_liked`, `cannot_like_own_post`, `upload_expired`, …).

---

## 12. Consistency, UX, and failure

The spec wants optimistic likes and a feed that never waits. Server implications:

- Like endpoint target: **p95 < 50ms**. It is an indexed insert + two counter updates. No media, no notifications inline.
- Notifications are async (V1). Do not send a push per like. Aggregate (“You gained 127 Aura”) from the ledger in a worker.
- If Redis is down: likes still succeed (Postgres); ranks degrade; rate limits degrade closed or open by policy (prefer **closed** on like/upload, **open** on feed).
- If the queue is down: uploads complete to `processing` and stall; surface that in the app; do not block likes.
- Idempotency keys on `complete upload` and `like` so flaky mobile networks do not double-apply Aura. Unique `(userId, postId)` already covers like.

---

## 13. Trust, safety, anti-abuse (minimum for V0)

Cannot launch without a baseline, even if the admin dashboard is V1.

- Auth: hashed passwords, refresh rotation, device-ish rate limits
- No self-like
- Unique like constraint
- Upload quotas
- Soft-delete posts, hard-ban users (`status`)
- `REVERSAL` events for moderation takedowns (remove Aura gained from a removed post)
- Store `sourceUserId` on every event for graph analysis later
- Block / report tables can be thin in V0 (`Report(reporterId, targetType, targetId, reason)`) so the app has a button

Like-rings and multi-accounting are V1 detection jobs reading the ledger. The ledger is what makes that possible. Skipping it in V0 would be the expensive mistake.

---

## 14. Analytics

Application analytics (Amplitude/Posthog) for the north star: **Aura Actions / Active User / Day**.

Server-side, the ledger already *is* the Aura economy analytics. Additionally emit:

- `post_created`, `post_published`, `like`, `feed_page_served` (sampled)
- histogram of like and feed latency

Do not build an analytics warehouse in V0. A product analytics SDK + the ledger is enough to see if people climb.

---

## 15. Repository layout (when we start coding)

Monorepo, because the mobile app, web, and API will share Zod schemas and types.

```text
apps/
  api/          Fastify HTTP
  worker/       BullMQ processors (same domain modules as api)
  mobile/       Expo
  web/          landing + public feed
packages/
  domain/       AuraLedger, ranking formula, Zod contracts
  db/           Drizzle schema + migrations
```

The important part: **ledger and ranking live in `packages/domain`**, not in route handlers. V1 Vote Power becomes a function change, not a rewrite.

---

## 16. What this proposal deliberately refuses

| Temptation | Why not in V0 |
|---|---|
| Microservices | We do not have the traffic or the team overhead |
| GraphQL | Feed/like/upload map cleanly to REST; mobile cache is React Query |
| Kafka | Redis jobs are enough until we are not |
| Realtime websockets for like counts | Poll / React Query invalidation is enough; live counters are a later delight |
| Fan-out following feeds | No following in V0 |
| ML ranking | Spec forbids it |
| Storing Aura only as a counter | Blocks fraud, rewards, and V1 |
| Uploading video through the API | Will collapse under the first creator spike |
| Perfect global consistency on trending | 15–30s lag is invisible; likes must be consistent |

---

## 17. Open decisions

These are the few choices worth confirming before implementation:

1. **Managed video (Stream/Mux) vs ffmpeg workers** — proposal: managed for V0.
2. **Fastify vs NestJS** — proposal: Fastify + modular domain packages (less ceremony).
3. **R2 vs S3** — proposal: R2 if we want cheap video egress; S3 if we want the broadest ecosystem. The `MediaAsset` interface hides this.
4. **Auth: first-party vs Clerk/Auth0** — proposal: first-party email/username for V0, add Apple/Google as the real mobile requirement before public launch.
5. **Aura unit** — integer `1` per like vs `10` to leave headroom for Vote Power fractions. Proposal: integer **10** per V0 like so V1 can do 12, 24, etc. without decimals. Store Aura as integer always.
6. **Username vs display name** — spec shows `@username`. Keep one public handle, immutable or rate-limited rename.

---

## 18. Suggested build order (backend)

Once we agree on this shape:

1. Postgres schema + `AuraLedger` + auth
2. Presigned upload + image processing + publish
3. Latest feed (cursor) + like/unlike
4. Global leaderboard (Redis + SQL fallback)
5. Trending worker + `/feed/trending`
6. Public `GET /posts/:id` for web share URLs
7. Video via managed provider
8. Reconciliation job + basic rate limits + reports table

That order matches the product loop: you cannot compete until Aura moves, and Aura cannot move until a post can be seen and liked.

---

## 19. Summary

V0 backend = **stateless API + Postgres ledger + Redis projections + object storage/CDN + async media workers**.

Scale the **media plane** and the **like write path** independently of the **feed read path**. Keep every Aura change in `AuraEvent`. Rank and trending are projections you can recompute. That is enough to feel instant on mobile, survive a traffic spike that is mostly video bytes, and grow into Vote Power / Aura Sense without a second economy.
