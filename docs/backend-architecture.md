# Aura — Initial Backend Architecture Proposal

Status: **proposal** (not an implementation plan yet)
Scope: V0 first, with explicit seams for V1
Companion: [Product spec](./product-spec.md) · [Client media](./client-media.md)

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
| API | **NestJS on the Fastify adapter** | Decided. Modules map cleanly onto the domain boundaries below, DI makes the ledger easy to isolate and test, and Fastify keeps the HTTP layer fast. |
| Validation | **Zod** | Shared contracts with React Native / web. |
| ORM | **Drizzle** | SQL-shaped, migrations we actually read, good enough for a ledger. |
| Primary DB | **PostgreSQL** | Relational integrity for users/likes/events. JSONB only for non-query metadata. |
| Cache / ranks | **Redis** | Sorted sets for leaderboards, short-TTL feed cache, rate limits. |
| Jobs | **Redis queue** (BullMQ) | Media processing, trending recompute, notification aggregation. |
| Object storage | **Cloudflare R2**, behind an `ObjectStore` port | Decided. Zero egress fees matter a lot when the product is mostly video bytes. Provider is per-asset and swappable (§6.6). |
| CDN | **Cloudflare**, served from our own `cdn.aurarankd.com` | Image resizing, cache, public post pages. Our domain, so the vendor is a DNS change (§6.6). Bunny is a post-V0 candidate. |
| Video | **Managed transcoding first** (Cloudflare Stream / Mux) *or* ffmpeg workers | V0 should not invent a video platform. See §6. |
| Auth | **First-party. Apple + Google on mobile, API-issued JWT access + rotating refresh** | The API owns identity; providers only prove it. See §12. |
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
  storageProvider               -- r2 | s3 | bunny | ...  per asset, never global (§6.6)
  storageBucket, storageRegion
  storageKey                    -- provider-neutral path to the ORIGINAL master
  contentType, byteSize, checksum
  width, height, durationMs
  variants JSON                 -- { "feed": key, "thumb": key, "hls": key, "poster": key }
                                -- storage KEYS, never absolute URLs (§6.6)
  externalProvider              -- nullable: managed video vendor holding renditions
  externalAssetId               -- nullable: that vendor's asset id
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
1. Client:  shrink the photo on device first (docs/client-media.md), then
            POST /posts/uploads
            { mediaType, contentType, byteSize, checksum, width, height, durationMs }
            `byteSize` / `checksum` are the file that will be PUT, not the camera-roll original.

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
- The app downscales to a 2160 longest-edge JPEG before PUT when that wins on size (docs/client-media.md). HEIC always becomes JPEG on device.
- Normalize to jpeg/webp feed rendition + jpeg thumb
- Store that client master for later reprocess (not necessarily the camera-roll original)
- CDN image resizing as a safety net, requested through the URL resolver (§6.6) rather than hand-built transform URLs, so the app can ask for the size it needs without a combinatorial explosion of stored variants

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
    "thumbUrl": "https://cdn.aurarankd.com/...",
    "feedUrl": "https://cdn.aurarankd.com/...",
    "hlsUrl": "https://cdn.aurarankd.com/.../manifest.m3u8",
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

Those URLs are **computed at read time** by the URL resolver (§6.6), never read from a URL column. The database stores keys; the edge domain and transform syntax are a deployment concern.

CDN cache: long TTL for immutable variant objects (`/media/{assetId}/v1/feed.jpg`). Cache-bust by version in the path, not query strings the CDN might ignore.

The API can stay cache-Control: private. Media should be publicly cacheable (no cookies on the CDN host).

### 6.6 Storage and CDN portability

We should assume we will change providers at least once. Media is the most expensive thing to move and the easiest thing to accidentally cement, so the seams go in now.

#### The mistake to avoid

Persisting absolute URLs (`https://cdn.aurarankd.com/media/abc/feed.jpg`) in `variants`. That single shortcut means a provider change requires rewriting every row in the largest table we have, and any URL already shared to Instagram or WhatsApp breaks. In a product whose growth loop *is* shared links (spec §23), dead media URLs are lost acquisition, permanently.

#### Three rules

**1. Store coordinates, not URLs.** The database holds `storageProvider` + `storageBucket` + `storageKey`. A resolver turns those into a URL at read time. Changing provider, domain, or transform syntax then touches one module rather than the data.

**2. Serve from our own domain.** `cdn.aurarankd.com` is a CNAME we control, pointed at whichever vendor is in front today. Swapping CDN becomes a DNS change: no data migration, no client release, and **every previously shared link keeps working**. If we ever serve media from a vendor's hostname, we have handed them our URL namespace.

**3. Provider is per-asset, never a global setting.** A single "current provider" flag forces a big-bang migration where everything must move at once. Per-asset provenance lets old objects keep resolving from wherever they already live while new uploads go somewhere else, with both working simultaneously and indefinitely.

#### Two ports, because origin and edge are separate decisions

```ts
// Origin: where bytes live. R2, S3, B2, Bunny Storage.
interface ObjectStore {
  presignUpload(key, opts): Promise<PresignedUpload>;
  head(key): Promise<ObjectMeta | null>;
  delete(key): Promise<void>;
  copyFrom(source: ObjectStore, key): Promise<void>;  // migration
}

// Edge: how bytes are addressed publicly, including image transforms.
interface MediaUrlResolver {
  url(asset: MediaAsset, variant: VariantName, t?: Transform): string;
}
```

Both are resolved from a registry keyed by `asset.storageProvider`, so a single request can serve one post from R2 and the next from somewhere else without knowing the difference.

Worth being explicit that these are independent choices: **R2 origin with Bunny at the edge** is a perfectly reasonable combination, and more likely than a wholesale move.

#### Key layout must be provider-neutral

```text
media/{assetId}/v1/feed.jpg
media/{assetId}/v1/thumb.jpg
media/{assetId}/v1/master.mp4
```

No provider name, no bucket name, no region in the key. A bulk copy then preserves paths byte-for-byte, and migrating an asset changes one column rather than recomputing paths.

#### Transform syntax belongs to the resolver

This is the detail that quietly leaks vendor lock-in into application code, because every provider spells resizing differently:

| Provider | Syntax for 1080px wide |
|---|---|
| Cloudflare | `/cdn-cgi/image/width=1080,quality=85/<path>` |
| Bunny Optimizer | `<path>?width=1080&quality=85` |
| imgix | `<path>?w=1080&q=85` |

Callers must always ask for `resolver.url(asset, "feed", { width: 1080 })` and never assemble a query string. Signed/token-authenticated URLs differ per vendor too, and belong behind the same interface for when private or moderated content needs them.

#### Always keep the master

Even when a managed video service holds the playable renditions, the **original upload stays in our own bucket**. Managed video (Cloudflare Stream, Mux, Bunny Stream) is far stickier lock-in than object storage, because transcoded renditions frequently cannot be extracted in any usable form — the exit path is re-encoding from sources you had better still have.

That is why `MediaAsset` separates `storageKey` (our master, always ours) from `variants` and `externalAssetId` (may be vendor-held). Masters cost storage, which is cheap. Not having them costs the ability to leave, which is not.

#### Migration playbook

This is what per-asset provenance actually buys, and it is why "where does older data live" stays answerable:

```sql
SELECT storage_provider, count(*), pg_size_pretty(sum(byte_size))
FROM media_assets GROUP BY 1;
```

1. Register the new provider. Old one stays the default.
2. Flip **new uploads** to the new provider via config. Nothing existing moves.
3. Backfill worker, per asset: copy → verify checksum → update `storageProvider` → verify it resolves. Idempotent and resumable, throttled so it never competes with live traffic.
4. Serving is dual-read throughout, so there is no cutover moment and no window where the feed breaks.
5. Decommission only when that query returns zero rows for the old provider.

Because URLs come from our own domain, none of this is visible to clients or to already-shared links.

#### On Bunny specifically

Worth evaluating after V0 is working, not before. The case for it is real — bandwidth pricing is typically well below the alternatives at video-heavy volume, Bunny Optimizer covers image transforms, and Bunny Stream is a credible managed-video option.

Two caveats:

- R2's zero egress is genuinely hard to beat as an **origin**, and R2 → Bunny pull is free. The interesting configuration is likely R2 origin with Bunny edge, not replacing both.
- At V0 volumes the price difference is rounding error. Evaluate when video bandwidth is an actual line item, using our own traffic mix, since CDN comparisons are extremely workload-dependent.

The point of this section is that the answer can be "yes" later without it being a project. Tracked as `MEDIA-10` in the roadmap.

### 6.5 Cost / abuse controls on upload

- Max photo size and max video duration/bitrate, enforced **before** presign and re-checked after PUT
- Per-user daily upload quota
- Per-user concurrent processing cap
- Virus/malware scanning is optional in V0
- **Automatic photo moderation (TS-11) is on hold.** When it ships, it is a step on the same `ProcessMediaJob`, not a second publish path. See below.

**TS-11 — decided, not built**

A post stays `processing` (out of the feed) until a **third-party classifier** clears the photo. Do not run NudeNet / ONNX / a vision model on the API or the worker: classification is slow and the API must stay like-fast. The worker only HTTP-calls out.

- **Provider:** Hive Moderation or Sightengine (UGC-native). AWS Rekognition / Google SafeSearch are acceptable to start. Hide the vendor behind a `ContentClassifier` port.
- **What we send:** the 400px thumb we already generate, not the 2160 master.
- **When:** after variants exist, still inside `ProcessMediaJob`. `POST /complete` only enqueues. Timeout ~8s; BullMQ retries 2–3× with backoff. Per-user concurrent processing cap stays.
- **Fail closed:** if we cannot classify, do not publish. Provider outage exhausts retries then `failed`.
- **User:** success is silent (same processing spinner as today — no “checking content”). Failure is either `content_rejected` (“This photo couldn’t be posted”) or `processing_failed` (generic upload error). Do not mention nudity, AI, or moderation in the consumer app. Clients map `error.code` via `errors.*` in both catalogs.
- **Staff:** persist provider, scores, and decision on `moderation_actions` (the audit seam). Human takedown stays for misses.
- **Video:** same hook on a poster frame when MEDIA-06 lands. Do not block TS-11 on video.
- **Web:** posting stays in the app. On-device hints are never the source of truth.

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
  - else AuraLedger.apply(LIKE, amount = auraForLike(actor))   -- flat 10 in V0, see §7.4
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

### 7.4 Aura unit: 10 per like, with a seam for Vote Power

**Decided for V0:** a like is worth a flat **10 Aura**. Not 1.

The `10` exists so V1 can multiply without ever introducing decimals. Vote Power `1.4x` becomes `14`, `2.4x` becomes `24`. **Aura is always an integer**, in the database, in the API, and on screen. Floats in an economy produce rounding drift that nobody can reconcile later.

The value must never be written as a literal in a controller. It lives in one place:

```ts
// packages/domain/src/aura/vote-power.ts

/**
 * Aura awarded for a single like.
 *
 * V0: flat rate for everyone.
 *
 * V1 will scale this by the voter's Vote Power, so that a like from a
 * high-Aura curator is worth more than a like from a new account. Before
 * turning that on, read docs/backend-architecture.md §7.5 — the multiplier
 * needs diminishing returns and a hard cap, or the top of the leaderboard
 * becomes unreachable and the economy inflates.
 *
 * Keep the return value an integer. Aura is never fractional.
 */
export function auraForLike(voter: User): number {
  return BASE_LIKE_AURA; // 10
}
```

Every caller already asks `auraForLike(actor)`. Switching V0 → V1 is editing this one function, not hunting `+ 10` across route handlers. **This comment is required in the implementation PR** so whoever turns on Vote Power sees the economic constraints first.

### 7.5 Vote Power economics (read before implementing)

The spec wants high-Aura users to award more Aura. That is a compounding loop, and compounding loops in a ranked economy fail in predictable ways:

| Risk | What it looks like in the product |
|---|---|
| **Rich-get-richer** | Top 100 users mint far more Aura than everyone else. A new user cannot climb regardless of content quality. The leaderboard freezes and stops being a reason to return. |
| **Inflation** | Total Aura in circulation grows faster than the user base. `10,000 Aura` means something different each month, so titles and historical records lose meaning. |
| **Whale capture** | A handful of accounts effectively decide what trends, because their likes dominate `auraVelocity`. |
| **Collusion payoff** | High Vote Power makes like-rings dramatically more profitable than they are at a flat rate. |

Guardrails the multiplier must have, all of them:

1. **Sublinear curve.** Vote Power grows with something like `log`, never linearly with Aura. Going from 1k → 10k Aura should feel meaningful; 100k → 1M should barely move it.
2. **Hard cap.** A stated maximum (the spec suggests roughly `~3-4x`). Cap the multiplier, not just the input.
3. **Floor of 1.0x.** A new user's like is never worth *less* than today's 10. We add upside for curators; we never devalue newcomers.
4. **Daily minted-Aura budget per voter.** Vote Power raises the value of a like, but a user should not be able to mint unbounded Aura by liking a thousand posts. Cap Aura minted per voter per day.
5. **Aura Sense drives it, not wealth alone.** Per the spec, Vote Power should follow *prediction quality*, not just balance. Prefer weighting Aura Sense more heavily than lifetime Aura — that rewards curation skill instead of seniority, which is the loop that makes Aura different.
6. **Season reset as a pressure valve.** Season Aura resetting limits how far compounding can run inside one competitive cycle.

Because everything is a ledger, we can **simulate before shipping**: replay real `aura_events` through a candidate formula and inspect the resulting distribution (Gini coefficient, top-1% share, time-to-first-1000 for a new user) before it ever touches production. Do that. Do not tune this live on real users.

The multiplier constants belong in remote config, not a deploy.

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
| POST | `/v1/auth/apple` | verify Apple identity token → issue Aura tokens |
| POST | `/v1/auth/google` | verify Google ID token → issue Aura tokens |
| POST | `/v1/auth/refresh` | rotate refresh token, reuse detection |
| POST | `/v1/auth/logout` | revoke current device session |
| POST | `/v1/auth/username` | claim handle on first login (onboarding) |
| GET | `/v1/me` | |
| PATCH | `/v1/me` | |
| GET | `/v1/feed` | latest |
| GET | `/v1/feed/trending` | |
| POST | `/v1/posts/uploads` | presign |
| POST | `/v1/posts/:id/uploads` | refresh an expired presign for the same post |
| POST | `/v1/posts/:id/complete` | caption + enqueue processing |
| GET | `/v1/posts/:id` | public if published |
| DELETE | `/v1/posts/:id` | author only; soft delete |
| POST | `/v1/posts/:id/like` | idempotent |
| DELETE | `/v1/posts/:id/like` | |
| GET | `/v1/users/:username` | public competitive card |
| GET | `/v1/users/:id/posts` | cursor |
| GET | `/v1/leaderboards/global` | top + `viewerRank` |
| GET | `/v1/notifications` | stub empty in V0 or skip |

Public web can call the same GET endpoints with optional auth. No upload routes on web (product rule). Deep link `/a/:username/post/:postId` is a web route that server-renders or hydrates `GET /v1/posts/:id`. A leftover `/a/@username/…` 308s onto that path.

Errors: `{ error: { code, message } }` plus HTTP status. Stable `code` values for the app (`already_liked`, `cannot_like_own_post`, `upload_expired`, …).

**Localization boundary:** the API is locale-agnostic for client-facing copy. `message` is for developers and logs; clients translate `code` themselves, which means shipping a new language needs no backend deploy. The exception is copy the server renders directly — push notifications and emails — which uses `users.locale`. See [i18n.md](./i18n.md).

---

## 12. Authentication

### 12.1 The rule that decides everything else

> **The NestJS API is the only identity authority. Everything else is a client.**

Apple, Google, and NextAuth are **proof of identity**, never the owner of it. The API verifies a third-party proof, then mints **its own** tokens against its own `users` row.

This matters because Aura's Aura ledger, Vote Power, bans, and rate limits are all keyed on our `userId`. If a second system (NextAuth, a vendor) can create users or sessions independently, we end up with two user tables, two ban lists, and a fraud surface where a suspended user still has a valid session somewhere.

So on NextAuth for web: **fine, with one constraint.** Use it for the browser cookie session only, with no database adapter and no user table of its own. It calls our API, gets our tokens, and wraps them in a Next.js session. It must not become a parallel identity store.

Worth noting: V0 web is landing + a public feed + likes. The session layer is an httpOnly cookie wrapping API-issued tokens so `likedByMe` and `POST /v1/posts/:id/like` work without exposing the JWT. NextAuth remains unnecessary. Posting stays in the app.

### 12.2 Mobile: native providers, backend-issued tokens

NextAuth is the wrong tool on mobile. It is cookie/session and Next.js route-handler shaped, has no real React Native client, and would put the marketing web app in the critical path of every mobile login. Mobile is the product; it should not depend on the website being up.

Recommended flow:

```text
1. Tap "Continue with Apple"
     ↓
2. Native sheet (expo-apple-authentication / Google Sign-In)
   → returns a provider identity token (JWT signed by Apple/Google)
     ↓
3. POST /v1/auth/apple { identityToken, nonce }
     ↓
4. NestJS verifies signature against the provider JWKS,
   checks aud / iss / exp / nonce,
   finds or creates the user by provider `sub`
     ↓
5. API returns { accessToken, refreshToken, user, needsUsername }
     ↓
6. App stores refresh token in expo-secure-store (Keychain / Keystore)
```

The device never holds a client secret. Verification is server-side against the provider's public keys, so a forged token cannot mint a session.

### 12.3 Which methods for V0

| Method | Verdict | Reasoning |
|---|---|---|
| **Sign in with Apple** | **Yes** | Required by App Store rules once we offer Google. One tap, no password. |
| **Google Sign-In** | **Yes** | Covers Android and most iOS users who avoid Apple ID. |
| **Email + password** | **Skip in V0** | Worst conversion of the three, and it drags in password reset, email deliverability, and breach liability. Aura's loop dies on signup friction. |
| **Phone / OTP** | **Later, as an anti-abuse tier** | SMS costs real money per signup and invites toll fraud. But a phone number is *expensive to farm*, which makes it the best anti-multi-account signal we have. |

On phone verification, the useful framing is not "how do users log in" but "what does an account have to prove before its Aura counts". Gate **earning and ranking**, not signup:

- Anyone can sign up with Apple/Google and browse, post, and like immediately
- Unverified accounts can be excluded from leaderboards, or have their outgoing vote weight reduced, until they clear a trust threshold

That keeps the funnel frictionless while making like-rings costly. It fits the existing design because vote weight already flows through `auraForLike()` (§7.4) and every award is a ledger row.

**Apple gotchas to handle on day one:**

- Apple returns the user's name and email **only on the very first authorization**. If we don't persist it in that first callback, it is gone forever and the only recovery is the user manually revoking the app in iOS settings.
- Apple's private relay (`@privaterelay.appleid.com`) means email is not a reliable identity key. **Key on provider `sub`**, never on email.
- The same human may sign in with Apple on iPhone and Google on Android. Support linking multiple provider identities to one user from the start.

### 12.4 Data model

```text
AuthIdentity
  id, userId
  provider              -- apple | google | phone
  providerSub           -- provider's stable subject id
  emailAtSignup         -- may be a relay address; not an identity key
  UNIQUE (provider, providerSub)

DeviceSession
  id, userId
  refreshTokenHash      -- store a hash, never the token
  familyId              -- rotation lineage, for reuse detection
  deviceName, platform, appVersion
  ipAtIssue, lastSeenAt, expiresAt
  revokedAt
```

Splitting `AuthIdentity` from `User` is what makes account linking, adding phone later, and dropping a provider possible without touching the ledger.

`DeviceSession` gives us three things we will want badly: "log out my other devices", instant global revocation on ban, and a device fingerprint for multi-account detection.

### 12.5 Tokens

| Token | Form | Lifetime | Stored |
|---|---|---|---|
| Access | JWT, signed (EdDSA/RS256) | ~15 min | Memory only. Never SecureStore, never AsyncStorage |
| Refresh | Opaque random, 256-bit | ~60 days, sliding | `expo-secure-store`; hashed server-side |

Access tokens are stateless so the feed and like endpoints validate with zero database round-trips — which is exactly what §8's latency target needs. Keeping them short-lived bounds the damage of a leak, since we cannot revoke a JWT mid-life.

**Refresh rotation with reuse detection:** every refresh returns a new refresh token and invalidates the old one. If an already-used token is presented again, that means it was stolen and replayed, so we revoke **the entire family** and force re-login. This is the single highest-value auth security control for a mobile app, and it is cheap.

Long refresh lifetimes are deliberate. A social app that logs you out is a social app you stop opening.

**Client concurrency detail:** when several requests 401 at once (very likely, since the feed prefetches), the app must funnel them through a **single** refresh call and queue the rest. Naive per-request refresh will race, and with reuse detection turned on that race will log the user out. This belongs in one interceptor next to the API client.

### 12.6 Guest mode

Do not gate the feed behind login. Let a new install scroll immediately, and trigger auth on the **first Aura action** (like, post, follow):

```text
Install → browse feed → tap like → "Sign in to award Aura" → Apple → like applies
```

The user has already seen the product and has intent at that moment, so conversion is far better than a cold signup wall. The pending like should be replayed automatically after sign-in — a login that loses your action feels broken.

Implementation: unauthenticated `GET /v1/feed` is allowed and simply returns `likedByMe: false` throughout.

### 12.7 Recommendation

**Apple + Google native on mobile, verified server-side, with our own JWT access and rotating refresh tokens in SecureStore.** No passwords in V0. No NextAuth on mobile. Phone verification later as a trust tier that gates Aura, not signup. Web stays public in V0, and adopts NextAuth as a thin client of the same API when it actually gets a logged-in surface.

---

## 13. Consistency, UX, and failure

The spec wants optimistic likes and a feed that never waits. Server implications:

- Like endpoint target: **p95 < 50ms**. It is an indexed insert + two counter updates. No media, no notifications inline.
- Notifications are async (V1). Do not send a push per like. Aggregate (“You gained 127 Aura”) from the ledger in a worker.
- If Redis is down: likes still succeed (Postgres); ranks degrade; rate limits degrade closed or open by policy (prefer **closed** on like/upload, **open** on feed).
- If the queue is down: uploads complete to `processing` and stall; surface that in the app; do not block likes.
- Idempotency keys on `complete upload` and `like` so flaky mobile networks do not double-apply Aura. Unique `(userId, postId)` already covers like.

---

## 14. Trust, safety, anti-abuse (minimum for V0)

Cannot launch without a baseline, even if the admin dashboard is V1.

- Auth: provider-verified sign-in, refresh rotation with reuse detection, per-device sessions (§12)
- No self-like
- Unique like constraint
- Upload quotas
- Soft-delete posts, hard-ban users (`status`)
- `REVERSAL` events for moderation takedowns (remove Aura gained from a removed post)
- Store `sourceUserId` on every event for graph analysis later
- Block / report tables can be thin in V0 (`Report(reporterId, targetType, targetId, reason)`) so the app has a button

V0 enforcement, before the admin dashboard (TS-12):

```text
POST /v1/moderation/users/:id/status   { status: active | suspended | banned }
POST /v1/moderation/posts/:id/remove
DELETE /v1/posts/:id                   -- author only; same reversal path
```

`X-Moderation-Key` (`MODERATION_SECRET`) gates the moderation routes. Unset parks them (503) rather than leaving them open. A status change to `suspended` or `banned` revokes every `DeviceSession` for that user; the next access or refresh fails with `account_suspended` / `account_banned` instead of waiting for the JWT to expire. A ban also drops the user from the live leaderboard and hides their posts from public reads. Post removal flips `status` to `removed` first, then writes a `REVERSAL` for the remaining `posts.aura` (`idempotency_key = takedown:<postId>`).

Like-rings and multi-accounting are V1 detection jobs reading the ledger. The ledger is what makes that possible. Skipping it in V0 would be the expensive mistake.

---

## 15. Analytics

Application analytics (Amplitude/Posthog) for the north star: **Aura Actions / Active User / Day**.

Server-side, the ledger already *is* the Aura economy analytics. Additionally emit:

- `post_created`, `post_published`, `like`, `feed_page_served` (sampled)
- histogram of like and feed latency

Do not build an analytics warehouse in V0. A product analytics SDK + the ledger is enough to see if people climb.

---

## 16. Repository layout (when we start coding)

Monorepo, because the mobile app, web, and API will share Zod schemas and types.

```text
apps/
  api/          NestJS (Fastify adapter) HTTP
  worker/       NestJS standalone app running BullMQ processors
  mobile/       Expo + Expo Router
  web/          landing + public feed
packages/
  domain/       AuraLedger, auraForLike/Vote Power, ranking formula
  contracts/    Zod schemas + inferred types shared by api, mobile, web
  db/           Drizzle schema + migrations
```

The important part: **ledger and ranking live in `packages/domain`**, not in route handlers. V1 Vote Power becomes a function change, not a rewrite.

---

## 17. What this proposal deliberately refuses

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

## 18. Decisions

Settled:

| # | Decision | Choice |
|---|---|---|
| 1 | API framework | **NestJS on Fastify** |
| 2 | Object storage | **Cloudflare R2** (+ Cloudflare CDN) |
| 3 | Aura unit | **Flat 10 per like in V0**, integer always, behind `auraForLike()` (§7.4) |
| 4 | Vote Power | **Not in V0.** Seam is built now; economics guardrails in §7.5 must be met before enabling |
| 5 | Auth | **First-party**, API is the identity authority (§12) |
| 6 | Mobile auth | **Sign in with Apple + Google**, native providers, API-issued tokens. No passwords in V0 |
| 7 | Web auth | **Google Sign-In as a thin API client** (httpOnly cookies, no NextAuth user store). Posting/liking stay in the app. |
| 8 | Media portability | **Provider stored per asset**, keys not URLs, served from our own domain (§6.6) |

Still open, but not blocking the bootstrap work:

1. **Managed video (Stream/Mux) vs ffmpeg workers** — proposal: managed for V0, while always retaining our own master file (§6.6). Decide before video upload lands.
2. **Bunny for CDN and/or storage** — evaluate after V0 works, most likely as R2 origin + Bunny edge (§6.6).
3. **Phone verification as a trust tier** — proposal: after V0, gating Aura earning rather than signup (§12.3).
4. **Username vs display name** — spec shows `@username`. Proposal: one public handle, rename rate-limited.

---

## 19. Suggested build order (backend)

Once we agree on this shape:

1. Postgres schema + `AuraLedger` + auth
2. `ObjectStore` + `MediaUrlResolver` ports, then presigned upload + image processing + publish
3. Latest feed (cursor) + like/unlike
4. Global leaderboard (Redis + SQL fallback)
5. Trending worker + `/feed/trending`
6. Public `GET /posts/:id` for web share URLs
7. Video via managed provider
8. Reconciliation job + basic rate limits + reports table

That order matches the product loop: you cannot compete until Aura moves, and Aura cannot move until a post can be seen and liked.

---

## 20. Summary

V0 backend = **stateless API + Postgres ledger + Redis projections + object storage/CDN + async media workers**.

Scale the **media plane** and the **like write path** independently of the **feed read path**. Keep every Aura change in `AuraEvent`. Rank and trending are projections you can recompute. Store media as provider coordinates behind our own domain, so the CDN and object store stay replaceable. That is enough to feel instant on mobile, survive a traffic spike that is mostly video bytes, and grow into Vote Power / Aura Sense without a second economy.
