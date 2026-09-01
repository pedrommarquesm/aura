# Aura — Vote & Receipts Redesign Tracker

Single source of truth for the redesign whose **user-visible change is comments and how Aura is awarded.** Everything else in the app stays unless a screenshot later says otherwise.

- Product manifesto for this cut: [§ Manifesto](#manifesto)
- Current product spec: [product-spec.md](./product-spec.md) (still describes likes + comments until `RDX-03`)
- Architecture: [backend-architecture.md](./backend-architecture.md)
- Design tokens: [design-tokens.md](./design-tokens.md)
- Screenshot drop: [redesign-screens/](./redesign-screens/)
- Main work plan: [roadmap.md](./roadmap.md) (early-beta ops, push, admin). This file owns the redesign rows.

**Q1–Q20 are locked.** `RDX-02` is done. Mobile slider/receipts UI (`RDX-30+`) still waits on screenshots. The vote API and schema (`RDX-10`–`RDX-21`) can start: we have not launched, so this is a **greenfield rewrite**, not a data port.

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

**Now** — Product questions are locked (below). Schema/API work is a **new stack**: drop `likes` / `comments`, no backfill, staging may be wiped. Spec rewrite is `RDX-03`.

**Next** — Vote API (`RDX-10`–`RDX-21`). Slider + receipts UI (`RDX-30`–`RDX-46`) after screenshots land (`RDX-00`).

**Later, and only if screenshots show them** — three swipe feeds, 24h expiry, Certified/Cooked halls, 3-tab nav, calibration onboarding, create-button restyle (`RDX-50`–`RDX-58`). The manifesto describes those. The instruction for this cut is that they stay as they are until design proves otherwise.

---

## What actually changes

Two product objects move. That is the cut.

| Today | After |
|---|---|
| **Like** — binary, +10 Aura, unlike reverses, heart/moai + double-tap | **Vote** — one signed integer per user per post, −100…+100, vertical slider, no second vote |
| **Comment** — free-text thread, no Aura, 50%/90% sheet | **Receipt** — optional text attached to that vote, floats on the video, ledger sheet ~70% |

What does **not** change in this cut (keep building as-is):

- Auth (Apple / Google / password-for-e2e), guest browse, pending-action replay after sign-in
- Create: gallery pick, caption, hashtags, Mux/R2 upload, no beauty filters (already true)
- Profile grid, caption edit, delete, other people's profiles
- Reports, blocks, suspend/ban, post takedown
- Public web as waitlist; posting stays in the app
- Discover and Rank tabs, latest/trending Home, global leaderboard — until a screenshot removes them
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

**This cut:** do not build the three feeds or the timer until screenshots confirm them (`RDX-50`–`RDX-54`). Today's Home feed is still latest / trending.

### 3. The Aura economy & slider

Traditional social only goes up. This economy is volatile.

- **Track:** minimalist, semi-transparent vertical line on the right edge (right thumb).
- **Slide up:** charges positive Aura. Escalating rapid haptics. Floating `+10`, `+45`.
- **Slide down:** charges negative Aura. Sluggish, heavy haptics. Floating `−10`, `−45`.
- **Cap:** one user, one post, at most +100 or −100. Vote once.
- **Score:** the author's total Aura updates live and **may go negative** (“Aura Debt”). The video's live score sits large and bold at the bottom left.
- **Receipts (in-feed):** releasing the slider may prompt *“Drop a receipt...”*. Short receipts (max 80 chars) float up the left side: square avatar, username, text, signed amount. Overlay shows the **vote** (e.g. `+85`), never a value outside ±100. Votes with no text do not float; they still appear in the ledger.
- **Receipt ledger:** tap a floating receipt or the score → semi-transparent sheet covering ~70%. Every vote: square avatar, username, text (if any), colour-coded points.

### 4. Onboarding & the lurker funnel

Do not lock the feed. Do not penalise friend invites.

- **Calibration:** first open shows 3 curated clips (cool / cringe / fumble) teaching slider + receipts in under 15 seconds.
- **Blank slate:** username, pic, massive **0 Aura**. No follower counts.
- **Judge first:** all feeds + voting on day one (after sign-in for the write; guests still browse).
- **Persistent “0”:** profile tab shows a gray `0` until the user has a non-zero score.

**This cut:** calibration, 3-tab bar, and the gray `0` badge wait on screenshots (`RDX-50`, `RDX-55`). Guest browse + auth-on-first-vote already exists (`MOB-12`).

### 5. Navigation & create

- **3-tab bar:** Home · Create · Profile.
- **Create:** heavy utilitarian `[ ● ]` — solid white circle inside thick brackets.
- **Gallery import** + **in-app recording**. **Zero editing tools** besides trim. Post into Live Check.

**This cut:** keep the five-tab shell (Home, Discover, Create, Rank, Profile). Create already has gallery pick; in-app camera is still disabled (`MOB-52`). Do not restyle or drop tabs until screenshots say so.

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

When files land in `docs/redesign-screens/`, record a row per screen. Copy is enough; no need for a gallery README beyond that folder.

| Screen | File | Matches manifesto? | Notes |
|---|---|---|---|
| Feed idle | | | |
| Slider + | | | |
| Slider − | | | |
| Receipt prompt | | | |
| Floating receipts | | | |
| Ledger sheet | | | |
| Profile 0 | | | |
| *(add rows)* | | | |

---

## Milestone R0 — Intake

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-00 | Screenshots in `docs/redesign-screens/` covering the checklist in that folder's README | Blocked | waiting on upload |
| RDX-01 | Diff each screenshot against the manifesto; fill the checklist above | Blocked | waits on RDX-00 |
| RDX-02 | Lock Q1–Q20 | Done | [#87](https://github.com/pedrommarquesm/aura/pull/87) |
| RDX-03 | Rewrite product-spec like/comment sections and architecture §5/§7 for votes + receipts + Aura Debt + greenfield drop of likes/comments. Changelog both files | Not started | waits on this lock |
| RDX-04 | Design tokens: `success` = neon green (positive Aura), `danger` = pure red (debt / negative). Slider, receipt overlay, square avatar radius for receipts only (Q16) | Not started | Q15 locked; still no Certified/Cooked tokens |

---

## Milestone R1 — Vote economy (API)

New code. Drop likes/comments. No backfill.

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-10 | Ledger: event type `VOTE`, signed amount, `users.aura` / `posts.aura` allowed negative. Reconciliation job already sums the ledger — confirm it does not clamp. Delete `LIKE` / `SUPER_LIKE` from the enum | Not started | |
| RDX-11 | `POST /v1/posts/:id/votes` body `{ amount, receipt? }`. PK `(user_id, post_id)`. Repeat is 200 with the original vote. No DELETE. `PATCH` receipt **once** if still null (Q3), then 409 | Not started | |
| RDX-12 | Server clamp −100…+100, nonzero integer. Delete `auraForLike`. Clients must not hardcode `* 10` | Not started | |
| RDX-13 | Receipt `varchar(80)`, empty → null. GET ledger newest-first (Q6): amount + receipt + author card, cursor page. Overlay payload is the latest rows with non-null receipt | Not started | |
| RDX-14 | Feed card: `votedByMe`, `myAmount`, `voteCount`, signed `aura`. Drop `likedByMe` / `likeCount` / `commentCount` from the contract in the same PR as the clients that read them | Not started | |
| RDX-15 | **Drop** `likes`, `comments`, `like_kind`, `like_count`, `comment_count`. Create `votes`. No data backfill. Staging wipe of like-derived Aura is expected | Not started | |
| RDX-16 | Redis budget for votes. Delete like-rate-limit | Not started | |
| RDX-17 | Takedown: reverse **net** post Aura (positive *or* debt) so a removed post contributes 0. Own-delete same | Not started | |
| RDX-18 | Leaderboard: negative Aura is a real score. Stop treating a −10 singleton as a cold-set bug — use a dedicated poison marker or a rebuild flag, not a magic score | Not started | |
| RDX-19 | Trending worker: signed aura velocity; `vote_count` not `like_count` | Not started | |
| RDX-20 | Self-vote 403 (Q8). Error code is vote-shaped, not `CANNOT_LIKE_OWN_POST` | Not started | |
| RDX-21 | Web: strip vote/like writes (Q12). Permalink is live score + ledger read-only | Not started | |

---

## Milestone R2 — Slider & receipts (mobile)

Depends on R1 for the real API; UI waits on `RDX-00` screenshots.

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-30 | Vertical slider track on the right edge of the feed card. Does not steal vertical paging | Not started | waits on RDX-00 |
| RDX-31 | Charge gesture: floating ±N (step 1). Up = light/fast pulse. Down = heavy/sluggish (`MOB-07` already wired) | Not started | waits on RDX-00 |
| RDX-32 | Release: 0 = cancel (no prompt). Else clamp, commit once, optimistic score, rollback on failure. Second gesture is inert | Not started | waits on RDX-00 |
| RDX-33 | Guests: existing auth gate, pending vote `{ postId, amount, receipt? }` replayed after username claim | Not started | waits on RDX-00 |
| RDX-34 | Remove moai/heart like control and double-tap like from the feed card and permalink | Not started | waits on RDX-00 |
| RDX-35 | Live score large, bold, bottom-left, tabular figures, signed, ticks instead of snapping (`MOB-41` pattern). Neon green / pure red (Q15) | Not started | waits on RDX-00 |
| RDX-40 | Optional “Drop a receipt...” after a successful **nonzero** commit. Skip leaves the vote. One later fill if skipped (Q3) | Not started | waits on RDX-00 |
| RDX-41 | Floating receipts, left side, only rows with text (Q19). Square avatar + `@user: TEXT (+N)` in-range | Not started | waits on RDX-00 |
| RDX-42 | Ledger sheet ~70%, semi-transparent, every vote newest-first, colour-coded amount | Not started | waits on RDX-00 |
| RDX-43 | Tap score or a floating receipt opens the ledger. Comment icon goes away | Not started | waits on RDX-00 |
| RDX-44 | Square avatar variant for receipts/ledger only (Q16) | Not started | waits on RDX-00 |
| RDX-45 | Copy in `en` / `pt` / `pt-br` / `es`. Vernacular (receipt, Aura Debt) stays English unless a later decision says otherwise | Not started | waits on RDX-00 |
| RDX-46 | Replace `MOB-74` flow tests: slider ±, 0-cancel, cap, one-shot, receipt optional + one fill, ledger, guest gate | Not started | waits on RDX-00 |

---

## Milestone R3 — Adjacent manifesto (screenshot-gated)

Do not pick these up because the manifesto mentions them. Pick them up when a screenshot in `docs/redesign-screens/` shows the surface.

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-50 | 3-tab bar: Home, Create `[ ● ]`, Profile with gray `0` while Aura is 0. Drop Discover + Rank from the bar (Rank can remain a stack screen) | Blocked | needs screenshot |
| RDX-51 | Horizontal swipe feeds: Cooked ← Live Check → Certified | Blocked | needs screenshot |
| RDX-52 | Live Check 24h public expiry; post remains on the author's profile | Blocked | needs screenshot |
| RDX-53 | Certified inject at a remote-config positive threshold, neon green chrome | Blocked | needs screenshot |
| RDX-54 | Cooked inject at a remote-config negative threshold, red chrome | Blocked | needs screenshot |
| RDX-55 | Calibration: 3 curated clips on first open, slider + receipt in <15s, then blank-slate profile | Blocked | needs screenshot |
| RDX-56 | In-app record + trim-only create. Camera is currently disabled; gallery already works | Blocked | needs screenshot |
| RDX-57 | Landing / OG / waitlist demo card: slider + receipts instead of 🗿 like | Blocked | after R2, or with a landing screenshot |
| RDX-58 | Profile: hide rank/title/Vote Power chrome if the screenshot is a blank 0 Aura card. Do not delete the API fields | Blocked | needs screenshot |

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
4. **Slider** — `RDX-30`–`RDX-35` (after screenshots).
5. **Receipts + ledger** — `RDX-40`–`RDX-46` (after screenshots).
6. **Web read-only** — `RDX-21`.

Do not combine 2 and 4 in one PR. The ledger has to be right before the slider can be honest. Do not ship a likes→votes backfill.

---

## Changelog

| Date | Decision | PR |
|---|---|---|
| 2026-09-01 | Q1–Q20 locked. Greenfield: **no data port**; drop `likes`/`comments`. Receipt max 80, one fill if empty, newest-first ledger, web read-only, ±100 hard cap, Aura Debt colours neon green / pure red | [#87](https://github.com/pedrommarquesm/aura/pull/87) |
| 2026-09-01 | Redesign cut is **votes + receipts**. Manifesto feeds/nav/onboarding are tracked but screenshot-gated. Implementation waits on files in `docs/redesign-screens/` | [#87](https://github.com/pedrommarquesm/aura/pull/87) |
