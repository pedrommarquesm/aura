# Aura — Vote & Receipts Redesign Tracker

Single source of truth for the redesign whose **user-visible change is comments and how Aura is awarded.** Everything else in the app stays unless a screenshot later says otherwise.

- Product manifesto for this cut: [§ Manifesto](#manifesto)
- Current product spec: [product-spec.md](./product-spec.md) (still describes likes + comments until `RDX-03`)
- Architecture: [backend-architecture.md](./backend-architecture.md)
- Design tokens: [design-tokens.md](./design-tokens.md)
- Screenshot drop: [redesign-screens/](./redesign-screens/)
- Main work plan: [roadmap.md](./roadmap.md) (early-beta ops, push, admin). This file owns the redesign rows.

**Q1–Q20 are locked. R1 (vote API) and the R2 core interaction (slider, receipts, ledger) are implemented and merged.** Schema is greenfield: `likes`/`comments` are gone, `votes` is the only object. Deploying this requires dropping and recreating the target database — there is no upgrade migration from the old schema. Remaining open items are per-row caveats in R2 (see `RDX-42`, `RDX-44`, `RDX-46`) and R3 (nav/feeds — still screenshot-gated but not yet built).

---

## How this file works

Same rules as [roadmap.md](./roadmap.md):

1. Every PR that does redesign work updates at least one row here.
2. Status → `In review` when the PR opens.
3. New work gets a new ID. Do not silently expand a row.
4. Skipped work is `Dropped` with a one-line reason. Do not delete rows.
5. After `RDX-02`, a PR that changes vote/receipt behaviour without moving a row here is incomplete.

Status values: `Not started` · `In progress` · `In review` · `Done` · `Blocked` · `Dropped`

Prefix: **`RDX`** — this redesign only. Keep `AURA` / `MOB` / `API` IDs on the main tracker for work that is not this cut.

---

## Now / Next / Later

**Now** — R1 (API) and R2 (mobile slider, receipts, ledger, web read-only) are done. R3's nav/feed shell (2-tab bar `RDX-50`, header swipe `RDX-51`, in-frame ledger `RDX-42`) is also done. Deploy note: this is a schema-breaking release — drop and recreate the database, there is no upgrade path from `likes`/`comments`.

**Next** — Docs still describe the old model in prose (`RDX-03`). Remaining R2 caveats: gesture-simulation tests (`RDX-46`), real-device haptic tuning (`RDX-31`). Remaining R3 caveats: no manual verification of the header swipe or the in-frame ledger on an actual device/simulator (`RDX-59` — this environment has no simulator and the project's Expo-web bundle fails for an unrelated, pre-existing reason; see the row). Then the profile blank slate (`RDX-58`).

**Later** — 24h expiry, Certified/Cooked *inject* thresholds, calibration, in-app camera (`RDX-52`–`RDX-56`) still need screens beyond the header swipe.

---

## What actually changes

Two product objects moved. That is the cut, and it is now implemented end to end (API + mobile + web).

| Before | Now |
|---|---|
| **Like** — binary, +10 Aura, unlike reverses, heart/moai + double-tap | **Vote** — one signed integer per user per post, −100…+100, vertical slider, no second vote |
| **Comment** — free-text thread, no Aura, 50%/90% sheet | **Receipt** — optional text attached to that vote, floats on the video, ~70% ledger sheet |

What does **not** change in this cut (keep building as-is):

- Auth (Apple / Google / password-for-e2e), guest browse, pending-action replay after sign-in
- Create: gallery pick, caption, hashtags, Mux/R2 upload, no beauty filters (already true)
- Profile grid, caption edit, delete, other people's profiles
- Reports, blocks, suspend/ban, post takedown
- Public web as waitlist; posting stays in the app
- Global leaderboard API can stay; it is no longer a bottom tab (screen 01)
- Following (still not built). “No follower counts” is already true
- Locales: `en` / `pt` / `pt-br` / `es`. **Aura** stays untranslated ([i18n.md](./i18n.md))

---

## Manifesto

Source copy for the redesign. `[cite: 4]` markers from the original paste are stripped. Numeric examples below are superseded by the locked table: cap is ±100, overlay copy uses values inside that cap.

### 1. The core philosophy

- **The vibe:** raw, stripped-back, unpolished. Rejects Instagram try-hard curation and TikTok clip-farming (premeditated stunts for virality).
- **The goal:** a gamified social public square around “Aura” — projecting effortless confidence.
- **The tone:** real internet vernacular, no fantasy-game jargon. Minimalist UI so the community's judgement is the product.

### 2. App structure & feed routing

Horizontal swipe: `COOKED` ← `LIVE CHECK` → `CERTIFIED`.

- **Live Check (centre):** every new upload. 24-hour public timer. The arena where people vote. If it never crosses a threshold, it leaves the public feed and remains on the author's private profile.
- **Certified (right):** posts that cross a high positive threshold (example: +5,000 Aura). Permanent. Neon green accents. Hall of unbothered cool.
- **Cooked (left):** posts that sink into Aura Debt (example: −5,000 Aura). Permanent. Pure red accents. Hall of fumbles.

**This cut:** the **header swipe** is built (screen 09, `RDX-51`) — Home is a 3-page horizontal pager, Live Check is the real feed, Cooked/Certified are placeholder pages (no content model yet). 24h expiry and Certified/Cooked *inject* thresholds stay parked (`RDX-52`–`RDX-54`, Q13–Q14).

### 3. The Aura economy & slider

Traditional social only goes up. This economy is volatile.

- **Track:** minimalist, semi-transparent vertical line on the right edge (right thumb).
- **Slide up:** charges positive Aura. Escalating rapid haptics. Floating `+10`, `+45`.
- **Slide down:** charges negative Aura. Sluggish, heavy haptics. Floating `−10`, `−45`.
- **Cap:** one user, one post, at most +100 or −100. Vote once.
- **Score:** the author's total Aura updates live and **may go negative** (“Aura Debt”). The video's live score sits large and bold at the bottom left.
- **Receipts (in-feed):** releasing the slider may prompt *“Drop a receipt...”*. Short receipts (max 80 chars) float up the left side as plain `TEXT (+N)` — no avatar, no `@username` (the fuller reference screenshot dropped both; `RDX-41`). Overlay shows the **vote** (e.g. `+85`), never a value outside ±100. Votes with no text do not float; they still appear in the ledger.
- **Receipt ledger:** the score (`+N AURA`) is the sole entry point — tap it to slide up the in-frame **RECEIPT LEDGER** panel (screen 02, `RDX-42`). Fully hidden when collapsed, no persistent strip. "See all" inside it opens the full semi-transparent sheet (~70%) for pagination. Every ledger row: square avatar, username, text (if any), colour-coded points — the ledger keeps the identity the floating receipts dropped.

### 4. Onboarding & the lurker funnel

Do not lock the feed. Do not penalise friend invites.

- **Calibration:** first open shows 3 curated clips (cool / cringe / fumble) teaching slider + receipts in under 15 seconds.
- **Blank slate:** username, pic, massive **0 Aura**. No follower counts.
- **Judge first:** all feeds + voting on day one (after sign-in for the write; guests still browse).
- **Persistent “0”:** profile tab shows a gray `0` until the user has a non-zero score.

**This cut:** calibration still needs a screen (`RDX-55`). The gray `0` badge is on the PROFILE tab in screen 08. Guest browse + auth-on-first-vote already exists (`MOB-12`).

### 5. Navigation & create

- **3-tab bar:** Home · Create · Profile.
- **Create:** heavy utilitarian `[ ● ]` — solid white circle inside thick brackets.
- **Gallery import** + **in-app recording**. **Zero editing tools** besides trim. Post into Live Check.

**This cut:** bottom bar is **HOME \| PROFILE** (screen 01, `RDX-50`) — Discover and Rank dropped off the bar too (their routes still exist, just no tab button). Create is not a centre tab; today it's a small guarded icon in the Profile header (`create-tab-button.tsx`'s `GuardedCreateTab` logic, relocated). The screen 08 blank-slate's bigger **POST BASELINE** CTA is still `RDX-58`, not yet built. Create already has gallery pick; in-app camera is still disabled (`MOB-52` / `RDX-56`).

---

## Current seams (what the code actually does)

Use this when implementing. Do not rediscover it from vibes.

### Aura award = like

| Piece | Today |
|---|---|
| Table | `likes` PK `(user_id, post_id)` — the idempotency mechanism |
| Amount | `auraForLike()` → flat **10**. Vote Power is a documented seam, unused |
| Reverse | unlike deletes the row and writes `REVERSAL` for the original amount |
| Self | `CANNOT_LIKE_OWN_POST` 403 |
| Counters | `posts.like_count` clamped at 0 on unlike; `posts.aura` / `users.aura` via ledger |
| Client | optimistic; web and mobile both like; double-tap likes, does not unlike |
| Rate limit | Redis `LIKE_RATE_LIMIT_*` |
| Guest | auth gate, pending like replayed |

Ledger already stores **signed integers**. Negative amounts exist for `REVERSAL`. There is no `VOTE` event type. `auraForLike` is the single place the +10 is supposed to live; clients still hardcode `* 10` in a few caches (`apps/web/lib/query/feed-cache.ts`, `use-like-post.ts`).

### Comments ≠ Aura

| Piece | Today |
|---|---|
| Table | `comments` — `id, post_id, author_id, body, created_at`. No amount, no like/vote FK |
| Body | required, trimmed, max 500. Empty is a 400 |
| Thread | flat, oldest-first, authors may comment on their own post |
| Feed | `commentCount` only; bodies load in the sheet |
| UI | `FeedCommentsSheet` snap 50%/90%; circular avatars; composer always available |
| Push plan | one push per comment ([push-notifications.md](./push-notifications.md)) — not built |

### Places that assume Aura ≥ 0

These will lie once Aura Debt is real:

- Web optimistic like: `Math.max(0, current.aura + delta * 10)`
- Leaderboard heal: a Redis singleton at **−10** is treated as a poisoned set and rebuilt from SQL (`AURA-06`). Real negative scores will look like that bug.
- Post takedown reverses **remaining** `posts.aura` toward zero. A post in debt needs an explicit rule (`RDX-17`).
- Profile / landing copy that frames Aura as a climb-only number.

### Files that will move (not exhaustive)

**API:** `likes/*`, `comments/*`, `aura/vote-power.ts`, `aura/aura-ledger.service.ts`, `db/schema/{likes,comments,enums,posts,aura-events}.ts`, `safety/like-rate-limit.ts`, `leaderboard/*`, `feed/*`, `moderation/moderation.service.ts`.

**Mobile:** `components/feed/feed-post-card.tsx`, `like-button`, `feed-comments-sheet.tsx`, `components/comments/*`, `app/post/[id].tsx`, `lib/api/likes.ts`, `lib/haptics`, `store/auth-gate.ts`, flow tests that tap Give/Remove aura and open the comment drawer (`MOB-74`).

**Web:** `lib/likes/*`, `lib/query/feed-cache.ts`, landing post demo chrome. Web is read-only for this cut (`RDX-21`).

---

## Greenfield — do not port data

We have not launched. **Do not migrate likes or comments into votes.** Do not dual-write. Do not keep old tables around “until clients catch up.”

Write new modules (`votes`, `clampVoteAmount`, ledger type `VOTE`). Delete the like/comment schema that the new model does not use. Staging may be dropped and recreated.

| Drop | Why |
|---|---|
| `likes` table + `like_kind` enum | Binary like is gone |
| `comments` table | Receipts live on the vote row, max 80 chars, optional |
| `posts.like_count`, `posts.comment_count` | Replace with `vote_count` (≥ 0) |
| `LIKE` / `SUPER_LIKE` event types | Replaced by signed `VOTE` |
| `auraForLike()` + like/unlike HTTP | New `POST /v1/posts/:id/votes` |
| Client `likedByMe` / `likeCount` / hardcoded `* 10` | New contract: `votedByMe`, `myAmount`, `voteCount`, signed `aura` |

Keep users, posts, media, auth, waitlist. Zero `posts.aura`. Rebuild `users.aura` from leftover non-like ledger rows (waitlist `BONUS` only) or wipe those too if ops prefers a full consumer reset. Either is fine; **a likes→votes backfill is not**.

Q10/Q11 below described a migration path. They are **superseded** by this section. Amount-0 votes are also illegal (Q2), so comments could not have become votes anyway.

---

## Locked questions (`RDX-02`)

Locked 2026-09-01. Implementation PRs follow this table. Do not re-open a row in an implementation PR.

| # | Question | Locked answer |
|---|---|---|
| Q1 | Slider step | **Step 1.** Commit the integer the thumb is on at release. Display rounded. |
| Q2 | Zero release | **Cancel.** Release at 0 writes nothing. Receipt prompt stays closed. |
| Q3 | Edit vote / receipt | **Amount frozen on release.** Receipt text may be added/edited **once** if it was left empty, then frozen. |
| Q4 | Receipt without a vote | **No.** Receipts are optional metadata on an active vote row. |
| Q5 | Receipt length | **Max 80 characters.** |
| Q6 | Ledger sort | **Newest first** in the sheet. Overlay shows the latest incoming receipts. |
| Q7 | Cap vs overlay copy | Cap is strictly **±100**. Overlay examples use in-range values (e.g. `+85`), never +200. |
| Q8 | Self-vote | **Forbidden.** API 403. |
| Q9 | Own-post receipts | Authors **cannot vote** on their own posts and **do not appear** in the ledger. |
| Q10 | Existing likes | *Answered as “migrate to +10” — **superseded: no data port.** Drop `likes`. See Greenfield.* |
| Q11 | Existing comments | *Answered as “migrate as amount 0” — **superseded: no data port.** Amount 0 is illegal (Q2). Drop `comments`.* |
| Q12 | Web | **Read-only.** Permalink shows live score + ledger. No slider, no vote write. |
| Q13 | Certified / Cooked thresholds | **Parked.** Remote config later, no schema for it now. |
| Q14 | Live Check 24h | **Parked.** Future backend job. |
| Q15 | Colour tokens | Positive = `success` (**neon green**). Negative / Aura Debt = `danger` (**pure red**). |
| Q16 | Square avatars | **Receipts + ledger only.** Profile / feed avatars stay circular. |
| Q17 | Vote Power / multipliers | **Parked.** User picks ±1…±100. No automated multiplier. |
| Q18 | Push | Immediate push for **written receipts** (collapsed if a thread explodes). Aura as a **periodic digest of net score**. Never one push per vote. |
| Q19 | Float 0-text votes | **No.** No receipt text → ledger only, no overlay. |
| Q20 | Haptics | Slide up = light / fast pulse. Slide down = heavy / sluggish impact. Fine-tune on device. |

---

## Economy notes (so V1 seams stay honest)

1. **The client sends the amount. The server clamps and stores it.** Never trust the slider's last pixel. Reject `amount === 0` (Q2 is a client cancel — if 0 arrives, 400, no row). Reject `abs(amount) > 100`. Integer only.
2. **One row per `(user, post)`.** PK is the idempotency. A retry returns the existing vote, it does not add. There is no unlike. Amount never changes after insert (Q3).
3. **Receipt is a nullable `varchar(80)` on that row.** Empty at insert → one later `PATCH` to set it, then frozen. Non-empty at insert → already frozen. No receipt-only rows (Q4).
4. **Aura Debt is a product feature, not a bug.** `users.aura` and `posts.aura` may go negative. `vote_count` stays ≥ 0.
5. **`auraForLike()` is deleted, not wrapped.** `clampVoteAmount(n)` + ledger type `VOTE` (signed). `REVERSAL` stays for takedowns only.
6. **Do not turn on Vote Power on top of a chosen amount.** Q17. Architecture §7.5 stays as a warning, not a roadmap item (`RDX-60`).
7. **Trending** uses signed aura velocity. `engagement = log(1 + vote_count)`.
8. **Anti-spam is the ±100 cap + one vote**, plus a coarse Redis budget on the endpoint.
9. **Idempotency key** `vote:{userId}:{postId}` on the ledger row. Do not encode the amount in the key.
10. **Greenfield.** No likes→votes SQL. Drop the old tables in the same migration that creates `votes`.

---

## Screenshot checklist (`RDX-01`)

Landed 2026-09-01 in [redesign-screens/](./redesign-screens/). Index and notes: [README](./redesign-screens/README.md).

| Screen | File | Matches manifesto / locks? | Notes |
|---|---|---|---|
| Bottom nav | `01_tab_bar_home_profile.png` | Partial | **HOME \| PROFILE** only. No Create in the bar. Active = neon green icon + label + top hairline. |
| Live Check feed | `02_live_check_feed_ledger.png` | Yes (chrome) | Header `LIVE CHECK` + gear. Right-edge slider. Floating receipts (square avatar). In-frame **RECEIPT LEDGER** (not only a 70% sheet). Mock amounts `+200` / `+500` / `−150` are **over ±100** — implement Q7. |
| Slider idle | `03_slider_state_01_stationary.png` | Yes | Grey track, grey mid thumb, no number. |
| Slider active at 0 | `04_slider_state_02_active.png` | Yes | Neon green, `+0`. Release = cancel (Q2). |
| Slider positive | `05_slider_state_03_positive.png` | Cap conflict | Neon green fill + large `+N`. Mock `+450` — **clamp to +100**. |
| Slider cook / negative | `06_slider_state_04_cook.png` | Yes | Pure red `−85`, “DROP A RECEIPT” cue. In range. |
| Receipt composer | `07_receipt_composer_negative.png` | Optional vs required | Box over video at `−85`. Mock says required; **Q3/Q4 = optional**. |
| Profile 0 | `08_profile_blank_slate.png` | Yes (blank slate) | Massive **0 AURA**, POST BASELINE, empty posts. Square portrait with corner brackets (Q16 said circular on profile — follow this screen when implementing profile). PROFILE tab has a `0` badge. |
| Feed swipe header | `09_feed_header_cooked_live_check_certified.png` | Yes | **Left → right:** `COOKED` · `LIVE CHECK` (active, large white) · `CERTIFIED`. This is Home’s three pages, not the bottom bar. |

Mock copy that fights a lock (`+200`, `+450`, `+500`, “REQUIRED”): **keep the lock**, restyle the number/copy. Do not reopen Q5–Q7 from a mock.

---

## Milestone R0 — Intake

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-00 | Screenshots in `docs/redesign-screens/` (01–09) | Done | [#87](https://github.com/pedrommarquesm/aura/pull/87) |
| RDX-01 | Diff each screenshot against the manifesto; fill the checklist above | Done | [#87](https://github.com/pedrommarquesm/aura/pull/87) |
| RDX-02 | Lock Q1–Q20 | Done | [#87](https://github.com/pedrommarquesm/aura/pull/87) |
| RDX-03 | Rewrite product-spec like/comment sections and architecture §5/§7 for votes + receipts + Aura Debt + greenfield drop of likes/comments. Changelog both files | Not started | docs still describe the old like/comment model in prose |
| RDX-04 | Design tokens: `success` = neon green (positive Aura), `danger` = pure red (debt / negative). Slider, receipt overlay, square avatar radius for receipts only (Q16) | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `bg` pure black, `aura`/`success` neon green, `danger` pure red, `radius.sm/md` → 0, `display`/`title` weight up. Full geometry (uppercase, JetBrains Mono, hard 0 everywhere) stays a follow-up |

---

## Milestone R1 — Vote economy (API)

New code. Drop likes/comments. No backfill. **Done** — greenfield schema, votes module, feed/leaderboard/trending/moderation rewired, web stripped to read-only.

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-10 | Ledger: event type `VOTE`, signed amount, `users.aura` / `posts.aura` allowed negative. Reconciliation job already sums the ledger — confirm it does not clamp. Delete `LIKE` / `SUPER_LIKE` from the enum | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `aura_event_type` is now `VOTE \| BATTLE_WIN \| CHALLENGE \| VOTER_REWARD \| BONUS \| REVERSAL` |
| RDX-11 | `POST /v1/posts/:id/votes` body `{ amount, receipt? }`. PK `(user_id, post_id)`. Repeat is 200 with the original vote. No DELETE. `PATCH` receipt **once** if still null (Q3), then 409 | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `votes/votes.controller.ts`: `POST posts/:id/votes`, `PATCH posts/:id/votes/receipt`, `GET posts/:id/votes`, `GET posts/:id/votes/overlay` |
| RDX-12 | Server clamp −100…+100, nonzero integer. Delete `auraForLike`. Clients must not hardcode `* 10` | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `aura/vote-amount.ts` (`isValidVoteAmount`); `vote-power.ts` deleted |
| RDX-13 | Receipt `varchar(80)`, empty → null. GET ledger newest-first (Q6): amount + receipt + author card, cursor page. Overlay payload is the latest rows with non-null receipt | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `votes/receipt.ts`, `votes.service.ts#list` / `#latestReceipts` |
| RDX-14 | Feed card: `votedByMe`, `myAmount`, `voteCount`, signed `aura`. Drop `likedByMe` / `likeCount` / `commentCount` from the contract in the same PR as the clients that read them | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `feed/feed.service.ts`; mobile + web `FeedCard` types match |
| RDX-15 | **Drop** `likes`, `comments`, `like_kind`, `like_count`, `comment_count`. Create `votes`. No data backfill. Staging wipe of like-derived Aura is expected | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — Migration history squashed to a fresh `0000_init.sql`. Deploying this requires dropping and recreating the staging database — there is no migration path from the old schema |
| RDX-16 | Redis budget for votes. Delete like-rate-limit | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `safety/vote-rate-limit.ts` (`VOTE_RATE_LIMIT_MAX` default 30, tighter than the old like limit) |
| RDX-17 | Takedown: reverse **net** post Aura (positive *or* debt) so a removed post contributes 0. Own-delete same | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `moderation/post-takedown.ts`: `amount === 0` guard instead of `<= 0` |
| RDX-18 | Leaderboard: negative Aura is a real score. Stop treating a −10 singleton as a cold-set bug — use a dedicated poison marker or a rebuild flag, not a magic score | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — Existing cold-set detection already keys off Redis **member count** vs Postgres, not score sign — verified it does not special-case negative scores |
| RDX-19 | Trending worker: signed aura velocity; `vote_count` not `like_count` | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `trending/trending.service.ts`: velocity sums all `VOTE` amounts in-window (signed), engagement uses `vote_count` |
| RDX-20 | Self-vote 403 (Q8). Error code is vote-shaped, not `CANNOT_LIKE_OWN_POST` | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `ErrorCode.CANNOT_VOTE_OWN_POST` |
| RDX-21 | Web: strip vote/like writes (Q12). Permalink is live score + ledger read-only | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — Deleted `lib/likes/*`, the like BFF route, and the pending-like-after-auth flow. `PostCard` / `PublicPost` render a static signed `AuraValue`, no click-to-vote |

---

## Milestone R2 — Slider & receipts (mobile)

Depends on R1 for the real API. Visuals: [redesign-screens/](./redesign-screens/). **Core interaction shipped**; a few items are simplified pending a real device / follow-up (noted per row).

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-30 | Vertical slider track on the right edge of the feed card. States 01–04 in screens 03–06. Does not steal the Home feed swipe | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `components/feed/aura-vote-slider.tsx`. Track is a fixed 220pt column vertically centered between the header and the caption — not full-height — so the FlashList's native vertical paging keeps working underneath it |
| RDX-31 | Charge gesture: floating ±N (step 1). Up = light/fast pulse. Down = heavy/sluggish (`MOB-07` already wired) | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — Haptics throttled every 8 Aura of drag (`lib/haptics.ts`: `voteChargeUpFeedback` / `voteChargeDownFeedback`). Exact feel needs tuning on a physical device (Q20 still says "fine-tune on device") |
| RDX-32 | Release: 0 = cancel (no prompt). Else clamp **±100**, commit once, optimistic score, rollback on failure. Second gesture is inert | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — Amount is clamped both client- and server-side; a locked vote disables the gesture (`.enabled(locked === null)`) |
| RDX-33 | Guests: existing auth gate, pending vote `{ postId, amount, receipt? }` replayed after username claim | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `store/auth-gate.ts` `PendingAction` is now `{ type: 'vote', postId, amount, receipt? } \| { type: 'create' }` |
| RDX-34 | Remove moai/heart like control and double-tap like from the feed card and permalink | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `feed-post-card.tsx` rewritten; `like-button.tsx`, `feed-post-card.old.tsx` deleted. Photo cards have no tap gesture now; video keeps single-tap mute |
| RDX-35 | Live score: signed, tabular, neon green / pure red (Q15). Placement per screen 02 | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — Bottom-left, `variant="display"` (now weight 900), tap opens the ledger |
| RDX-40 | Optional “Drop a receipt...” after a successful **nonzero** commit (screens 06–07). Skip leaves the vote. One later fill if skipped (Q3). Ignore mock “REQUIRED” | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `components/feed/receipt-prompt.tsx`. Skip calls `onDone()` with no network call, matching Q3/Q4 |
| RDX-41 | Floating receipts, left side, only rows with text (Q19). Square avatar + `@user: TEXT (+N)` in-range | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) shipped avatar + `@user:` prefix, matching `02_live_check_feed_ledger.png`. A fuller, uncropped export of the same screen shows plain `TEXT (+N)` with neither — [#91](https://github.com/pedrommarquesm/aura/pull/91) updated `vote-receipt-overlay.tsx` to match that: no avatar, no username, just the receipt text and signed amount. Still polls `GET /posts/:id/votes/overlay` every 15s, no live push channel |
| RDX-42 | Receipt ledger: screen 02 shows an in-frame collapsible list. Build that, plus a sheet if we still need one for overflow | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) built the 70% `BottomSheetModal` first. [#91](https://github.com/pedrommarquesm/aura/pull/91) added `vote-ledger-panel.tsx`, the in-frame panel screen 02 actually shows — first as an always-visible collapsed strip, then corrected again in the same PR to be **fully hidden** when collapsed (`LEDGER_PANEL_COLLAPSED_HEIGHT` is `0`) once the fuller reference screenshot showed no persistent bar — the score (`+N AURA`) is the only entry point, tap to slide it up. Previews the newest 4 votes; "see all" opens the sheet (`vote-ledger-sheet.tsx`) for full pagination, plus the caption for the long-caption "read more" path |
| RDX-43 | Tap score or a floating receipt expands/focuses the ledger. Comment icon goes away | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — Score tap opens the ledger sheet. Tapping an individual floating receipt does not (yet) deep-link to that row — opens the same ledger |
| RDX-44 | Square avatars on receipts + ledger (screen 02). Profile portrait is also square in screen 08 — follow the screen | Done (receipts/ledger) | [#88](https://github.com/pedrommarquesm/aura/pull/88) — `Avatar` gained a `shape="square"` prop, used only in `vote-receipt-overlay.tsx` and `vote-ledger-row.tsx`. Profile/feed avatars are still circular — screen 08's square profile portrait is **not** applied (Q16 default: profile stays circular; screen 08 as the exception is a follow-up if desired) |
| RDX-45 | Copy in `en` / `pt` / `pt-br` / `es`. Vernacular (receipt, cooked, certified, live check, aura debt) stays English | Done | [#88](https://github.com/pedrommarquesm/aura/pull/88) — All 4 locale catalogs updated (`feed.post.voteCount`, `feed.vote.receipt.*`, `feed.ledger.*`, `post.ledger.*`, `auth.reasons.vote.*`, `errors.cannot_vote_own_post` / `receipt_already_set`). `npm run locales:check` passes |
| RDX-46 | Replace `MOB-74` flow tests: slider ±, 0-cancel, cap, one-shot, receipt optional + one fill, ledger, guest gate | Partial | [#88](https://github.com/pedrommarquesm/aura/pull/88) — Deleted the obsolete like/comment flow tests (`signed-in-like`, `comments`, `feed-cache-comments`) and fixed the rest of the suite (51 tests pass). **Did not add** dedicated gesture-simulation tests for the drag itself — RNTL / the project's gesture-handler jest mock do not simulate a `Gesture.Pan()` drag, only tap. That coverage is a follow-up (needs either a richer gesture mock or an E2E tool) |

---

## Milestone R3 — Adjacent manifesto (screenshot-gated)

Screens 01, 08, 09 landed. Still do not implement these in the first vote-API PR.

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-50 | Bottom bar is **HOME \| PROFILE** (screen 01), not a 3-tab Create button. Drop Discover + Rank from the bar. Create is **POST BASELINE** on the empty profile (screen 08) | Done | this PR — `app/(tabs)/_layout.tsx` now renders only Home/Profile; Discover/Create/Rank are `href: null` (routes still exist, no tab button). Active tab gets a full-width-of-that-tab neon green top border (`ActiveTabIndicator`). **POST BASELINE** itself (screen 08's empty-profile CTA) is still `RDX-58` — as a bridge, Create is reachable via a small guarded icon in the Profile header so it isn't stranded in the meantime |
| RDX-51 | Horizontal swipe on Home, **left → right**: `COOKED` ← `LIVE CHECK` → `CERTIFIED` (screen 09). Active title is large white; neighbours are dim | Done | this PR — `components/feed/feed-mode-header.tsx` + a horizontal `ScrollView` pager in `app/(tabs)/index.tsx`. All three labels always render; the active one is bold white and larger, the other two dim and muted; tapping a label or swiping moves the pager. Cooked/Certified are placeholder pages (`RDX-52`–`RDX-54` still blocked, no content model). The settings gear moved above this row (matches screen 02) instead of colliding with `CERTIFIED` at the right edge. The old Latest/Trending ranking toggle is demoted to a secondary control shown only on the Live Check page |
| RDX-52 | Live Check 24h public expiry; post remains on the author's profile | Blocked | Q14 parked; no screenshot of the timer |
| RDX-53 | Certified inject at a remote-config positive threshold, neon green chrome | Blocked | Q13 parked; header exists, hall-of-fame screen does not |
| RDX-54 | Cooked inject at a remote-config negative threshold, red chrome | Blocked | Q13 parked; header exists, hall-of-shame screen does not |
| RDX-55 | Calibration: 3 curated clips on first open, slider + receipt in <15s, then blank-slate profile | Blocked | needs screenshot |
| RDX-56 | In-app record + trim-only create. Camera is currently disabled; gallery already works | Blocked | needs screenshot |
| RDX-57 | Landing / OG / waitlist demo card: slider + receipts instead of 🗿 like | Blocked | after R2, or with a landing screenshot |
| RDX-58 | Profile blank slate (screen 08): 0 Aura, no rank/title/Vote Power chrome, POST BASELINE, empty posts. Do not delete the API fields | Not started | screenshot landed |
| RDX-59 | Manual device/simulator pass on `RDX-50`/`RDX-51`/`RDX-42`: nested horizontal-pager-over-vertical-FlashList gesture behaviour, the ledger panel's expand/collapse animation, the tab bar's active indicator | Blocked | No iOS/Android simulator in this environment, and this repo's Expo-web bundle fails for an unrelated, pre-existing reason ("importing a module from 'react-native' instead of 'react-native-web'" — not caused by this PR; reproduce with `npm run web` on `main`). Verified instead by `tsc`/`eslint`/the full Jest suite (51 tests) passing and close reading against screens 01/02/09. Needs a real device/simulator pass, or `MOB-80` (Maestro E2E, `docs/testing-strategy.md`) once it exists |

---

## Milestone R4 — Downstream docs that will otherwise lie

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-60 | Park Vote Power / Super Like / Aura Sense / voter-reward jobs (Q17). Changelog architecture §7.4–7.5: chosen amount replaces hidden multiplier | Not started | Q17 locked |
| RDX-61 | Rewrite [push-notifications.md](./push-notifications.md): written receipts immediate (collapsed), net-Aura digest. Never one push per vote (Q18) | Not started | Q18 locked |
| RDX-62 | Analytics events: `like` / `unlike` / `comment` → `vote` / `receipt`. Update ANL-01/02/04 when those rows move | Not started | |
| RDX-63 | Admin: report target for receipts (today API-44 is comments). Same staff delete path | Not started | |
| RDX-64 | North star metric: an Aura Action is a vote or a post, not a like. Update product-spec §29 in the RDX-03 PR | Not started | |

---

## Suggested PR slices (after this lock)

Keep PRs inside one prefix cluster so this file does not become a merge battlefield.

1. **Spec lock** — `RDX-03`, `RDX-04`, `RDX-60`, `RDX-61`, `RDX-64` (docs only).
2. **New vote schema + API** — `RDX-10`–`RDX-13`, `RDX-15`, `RDX-16`, `RDX-20`. Drop likes/comments in the same PR. Tests hit the API. Staging wipe is expected.
3. **Feed projection + trending + leaderboard + takedown** — `RDX-14`, `RDX-17`–`RDX-19`.
4. **Slider** — `RDX-30`–`RDX-35` against screens 03–06.
5. **Receipts + ledger** — `RDX-40`–`RDX-46` against screens 02, 06, 07.
6. **Web read-only** — `RDX-21`.
7. **Home swipe + 2-tab bar + blank profile** — `RDX-50`, `RDX-51`, `RDX-58` against screens 01, 08, 09. Not in the first vote-API PR.

Do not combine 2 and 4 in one PR. The ledger has to be right before the slider can be honest. Do not ship a likes→votes backfill.

---

## Changelog

| Date | Decision | PR |
|---|---|---|
| 2026-09-01 | Live Check card matched to the fuller, uncropped reference screenshot: floating receipts drop the avatar/`@username` prefix (plain `TEXT (+N)`, `RDX-41`), the receipt ledger panel is fully hidden until the score is tapped rather than an always-visible collapsed strip (`RDX-42`), the score reads `+N AURA`, and the author block loses its avatar/background bar — bare `@username` + caption floating directly on the video | [#91](https://github.com/pedrommarquesm/aura/pull/91) |
| 2026-09-01 | R3 nav/feed shell built: 2-tab bottom bar with a per-tab active indicator (`RDX-50`), the `COOKED`/`LIVE CHECK`/`CERTIFIED` header swipe with placeholder Cooked/Certified pages (`RDX-51`), and the in-frame collapsible receipt ledger from screen 02 (`RDX-42`, upgraded from `Partial`) — the sheet stays as "see all"/overflow. Create moved off the tab bar to a small guarded icon on Profile as a bridge until the screen 08 blank slate (`RDX-58`) exists. No device/simulator to manually verify gesture behaviour in this environment (`RDX-59`, new row) — verified by `tsc`/`eslint`/Jest (51 tests) instead | — |
| 2026-09-01 | R1 + R2 implemented: greenfield `votes` schema (migration history squashed — deploy requires dropping the database), vote API, mobile slider/receipts/ledger, web stripped to read-only, tokens repointed to the neo-brutalist palette. All four apps typecheck/lint/test clean. Caveats: ledger is a 70% sheet not the in-frame list from screen 02 (`RDX-42`), no gesture-drag test coverage (`RDX-46`), receipts poll rather than push (`RDX-41`), docs prose not yet rewritten (`RDX-03`) | [#88](https://github.com/pedrommarquesm/aura/pull/88) |
| 2026-09-01 | Screenshots 01–09 in `docs/redesign-screens/`. Last file is Home swipe COOKED ← LIVE CHECK → CERTIFIED. Mock +200/+450/+500 stay over-cap; implement ±100 | [#87](https://github.com/pedrommarquesm/aura/pull/87) |
| 2026-09-01 | Q1–Q20 locked. Greenfield: **no data port**; drop `likes`/`comments`. Receipt max 80, one fill if empty, newest-first ledger, web read-only, ±100 hard cap, Aura Debt colours neon green / pure red | [#87](https://github.com/pedrommarquesm/aura/pull/87) |
| 2026-09-01 | Redesign cut is **votes + receipts**. Manifesto feeds/nav/onboarding are tracked but screenshot-gated. Implementation waits on files in `docs/redesign-screens/` | [#87](https://github.com/pedrommarquesm/aura/pull/87) |
