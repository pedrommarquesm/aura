# Aura — Vote & Receipts Redesign Tracker

Single source of truth for the redesign whose **user-visible change is comments and how Aura is awarded.** Everything else in the app stays unless a screenshot later says otherwise.

- Product manifesto for this cut: [§ Manifesto](#manifesto)
- Current product spec: [product-spec.md](./product-spec.md) (still describes likes + comments until `RDX-03`)
- Architecture: [backend-architecture.md](./backend-architecture.md)
- Design tokens: [design-tokens.md](./design-tokens.md)
- Screenshot drop: [redesign-screens/](./redesign-screens/)
- Main work plan: [roadmap.md](./roadmap.md) (early-beta ops, push, admin). This file owns the redesign rows.

**Implementation is blocked on screenshots.** Do not start `RDX-10+` until `RDX-02` is `Done`.

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

**Now** — Wait for screenshots in `docs/redesign-screens/`. Meanwhile this file is the brief: manifesto, current seams, open questions.

**Next** — `RDX-01`–`RDX-04` (diff screenshots, lock decisions, rewrite spec/tokens). Then the vote API (`RDX-10`–`RDX-21`) and the mobile slider + receipts (`RDX-30`–`RDX-46`).

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

Source copy for the redesign. `[cite: 4]` markers from the original paste are stripped. Numbers in here are **examples** until `RDX-02` locks them.

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
- **Receipts (in-feed):** releasing the slider may prompt *“Drop a receipt...”*. Short receipts float up the left side: square avatar, username, text, signed amount. Manifesto example: `[Square Avatar] @judge_name: CLEAN RECOVERY (+200)` — **+200 contradicts the ±100 cap**; treat as mock copy until `RDX-02`.
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

**Web:** `lib/likes/*`, `lib/query/feed-cache.ts`, landing post demo chrome. Web voting UX is an open question (`RDX-21`).

---

## Open questions — lock in `RDX-02`

Do not invent answers in an implementation PR. Fill this table when screenshots exist.

| # | Question | Default if screenshots are silent | Locked |
|---|---|---|---|
| Q1 | Slider step (1, 5, 10)? Manifesto floats `+10`, `+45`. | Step 1, commit whatever the finger is on, display rounded | |
| Q2 | Is **0** a legal commit, or a cancel? | Release at 0 = no vote, prompt stays closed | |
| Q3 | Can the voter **edit** amount or receipt text later? Manifesto says once. | Locked amount. Receipt text editable once if empty, then frozen | |
| Q4 | Receipt **without** a vote? | No. Ledger rows are votes. Text is optional on the vote | |
| Q5 | Receipt **character limit**. Comments are 500. Overlay copy is short. | 80 chars for the overlay; 500 is too long to float | |
| Q6 | Ledger sort. Comments are oldest-first. Overlay feels newest-first. | Newest first in the sheet; overlay shows the latest few | |
| Q7 | Manifesto overlay `(+200)` vs ±100 cap. | Cap is ±100. Overlay shows the **vote**, not a made-up 200 | |
| Q8 | **Self-vote.** Today 403. | Keep forbidden | |
| Q9 | **Own-post receipts** with no Aura (today authors may comment). | Authors may not vote. They do not appear in the ledger unless we later add a caption-only row | |
| Q10 | Existing **likes** in staging. | Each like becomes a `+10` vote, no receipt text | |
| Q11 | Existing **comments** with no like. | Keep as receipts with amount `0`, or drop. Prefer keep: they are already judgements | |
| Q12 | **Web.** Slider is a thumb gesture. | Permalink shows the live score + ledger read-only. No web vote in this cut (revert WEB-15 behaviour for writes). Confirm if a screenshot shows otherwise | |
| Q13 | Certified / Cooked **thresholds**. | Not this cut. When they ship, remote config, not a migrate | |
| Q14 | Live Check **24h**. | Not this cut | |
| Q15 | Colour tokens for + / − / debt. | + uses `success`, − and debt use `danger`, until screenshots give neon green / pure red | |
| Q16 | Square avatars **everywhere** or only on receipts? | Receipts + ledger only. Profile/feed stay circular until a screenshot says square globally | |
| Q17 | Vote Power, Super Like, Aura Sense. | Parked. The user now *chooses* the magnitude. Do not multiply a chosen −47 by 2.4x (`RDX-60`) | |
| Q18 | Push: one push per receipt vs digest. | Keep the existing plan's shape: receipts immediate (collapse if a thread explodes), Aura awards as a digest of **net** signed Aura, never one push per vote | |
| Q19 | Can a vote be **0-text** and still float? | No float without text. Amount still in the ledger | |
| Q20 | Haptic pattern (timings, `UIImpactFeedback` style). | Up: light → increasing frequency. Down: heavy, slower. Tune when a device is in hand | |

---

## Economy notes (so V1 seams stay honest)

1. **The client sends the amount. The server clamps and stores it.** Never trust the slider's last pixel. Reject `amount === 0`. Reject `abs(amount) > 100`. Integer only — same ledger rule as today.
2. **One row per `(user, post)`.** Same PK idea as `likes`. A retry returns the existing vote, it does not add. There is no unlike.
3. **Aura Debt is a product feature, not a bug.** `users.aura` and `posts.aura` must be allowed to go negative. Drop `GREATEST(..., 0)` on those two counters. Keep the clamp on `like_count` only for as long as that column survives; it probably becomes `vote_count` (always ≥ 0).
4. **`auraForLike()` is the wrong seam after this.** Replace it with `clampVoteAmount(n)` plus a ledger type `VOTE` (signed). `REVERSAL` stays for takedowns, not for “I changed my mind.”
5. **Do not turn on Vote Power on top of a chosen amount.** Architecture §7.5 was written for a hidden multiplier on a flat like. A visible −100 already *is* the voter's intensity. Multiplying it recreates the compounding loop that section exists to prevent (`RDX-60`).
6. **Trending** still uses aura velocity. Signed velocity means a pile-on of −Aura should push a post toward Cooked, not “engagement.” When `RDX-19` ships, `engagement = log(1 + vote_count)` and the aura term keeps its sign.
7. **Anti-spam is the ±100 cap + one vote**, not a like-rate firehose. Keep a coarse Redis budget so a script cannot probe the endpoint. Tighter than today's like limit is fine because each call is now a permanent economic event.
8. **Idempotency key** `vote:{userId}:{postId}` on the ledger row. Do not encode the amount in the key — a buggy client retrying a different number must not mint a second event.

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

## Milestone R0 — Intake (blocked on screenshots)

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-00 | Screenshots in `docs/redesign-screens/` covering the checklist in that folder's README | Blocked | waiting on upload |
| RDX-01 | Diff each screenshot against the manifesto; fill the checklist above | Blocked | waits on RDX-00 |
| RDX-02 | Lock Q1–Q20. Write the answers in this file. Anything still open stays `Blocked`, not guessed | Blocked | waits on RDX-00 |
| RDX-03 | Rewrite product-spec like/comment sections and architecture §5/§7 for votes + receipts + Aura Debt. Changelog both files | Blocked | waits on RDX-02 |
| RDX-04 | Design tokens: slider, +/− Aura, debt, receipt overlay, square avatar radius. Do not invent neon Certified/Cooked until those screens exist | Blocked | waits on RDX-00 |

---

## Milestone R1 — Vote economy (API)

Replace like/unlike. Comments become an optional field on the vote, not a parallel object that can award nothing while likes award 10.

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-10 | Ledger: event type `VOTE`, signed amount, `users.aura` / `posts.aura` allowed negative. Reconciliation job already sums the ledger — confirm it does not clamp | Not started | |
| RDX-11 | `POST /v1/posts/:id/votes` (name bikeshed in RDX-03). Body `{ amount, receipt? }`. PK `(user_id, post_id)`. Repeat is 200 with the original vote, not 409. No PATCH, no DELETE for the voter | Not started | |
| RDX-12 | Server clamp −100…+100, nonzero integer. Delete `auraForLike` from the hot path. Clients must not hardcode `* 10` | Not started | |
| RDX-13 | Receipt text optional, normalised, length from Q5. Empty string stored as null. GET ledger: vote amount + receipt + author card, cursor page | Not started | |
| RDX-14 | Feed card: `votedByMe`, `myAmount`, `voteCount`, `aura` (signed). Drop `likedByMe` / `likeCount` from the contract once clients ship | Not started | |
| RDX-15 | Migration: likes → votes of +10; comments per Q11. Keep a read of old tables until both clients are out | Not started | |
| RDX-16 | Redis budget for votes. Retire like-rate-limit or point it at the new path | Not started | |
| RDX-17 | Takedown: reverse **net** post Aura (positive *or* debt) so a removed post contributes 0. Own-delete same | Not started | |
| RDX-18 | Leaderboard: negative Aura is a real score. Stop treating a −10 singleton as a cold-set bug — use a dedicated poison marker or a rebuild flag, not a magic score | Not started | |
| RDX-19 | Trending worker: signed aura velocity; vote_count not like_count | Not started | |
| RDX-20 | Self-vote remains forbidden. Map `CANNOT_LIKE_OWN_POST` → a vote error code | Not started | |
| RDX-21 | Web: no vote write in this cut unless RDX-02 Q12 flips. Remove or hide the like control so the waitlist demo does not mint Aura with a binary heart | Not started | |

---

## Milestone R2 — Slider & receipts (mobile)

Depends on R1 for the real API; UI can be built against a typed client stub after RDX-02.

| ID | Task | Status | PR |
|---|---|---|---|
| RDX-30 | Vertical slider track on the right edge of the feed card. Does not steal vertical paging | Not started | |
| RDX-31 | Charge gesture: floating ±N, up = rapid light haptics, down = heavy slow haptics (`expo-haptics` already wired, `MOB-07`) | Not started | |
| RDX-32 | On release: clamp, commit once, optimistic score, rollback on failure. Second gesture on a voted post is inert (maybe a faint tick) | Not started | |
| RDX-33 | Guests: existing auth gate, pending vote `{ postId, amount, receipt? }` replayed after username claim | Not started | |
| RDX-34 | Remove moai/heart like control and double-tap like from the feed card and permalink | Not started | |
| RDX-35 | Live score large, bold, bottom-left, tabular figures, signed, ticks instead of snapping (`MOB-41` pattern) | Not started | |
| RDX-40 | Optional “Drop a receipt...” after a successful commit. Skip must still leave the vote | Not started | |
| RDX-41 | Floating receipts, left side, transparent, square avatar + `@user: TEXT (+N)` | Not started | |
| RDX-42 | Ledger sheet ~70%, semi-transparent, every vote, colour-coded amount | Not started | |
| RDX-43 | Tap score or a floating receipt opens the ledger. Comment icon goes away or becomes this | Not started | |
| RDX-44 | Square avatar variant for receipts/ledger only (Q16) | Not started | |
| RDX-45 | Copy in `en` / `pt` / `pt-br` / `es`. Vernacular (receipt, cooked, certified, live check, aura debt) — lock in RDX-02 whether they stay English | Not started | |
| RDX-46 | Replace `MOB-74` flow tests: slider commit +/−, cap, one-shot, receipt optional, ledger opens, guest gate. Comment-drawer tests die with the drawer | Not started | |

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
| RDX-60 | Park Vote Power / Super Like / Aura Sense / voter-reward jobs. Changelog architecture §7.4–7.5: chosen amount replaces hidden multiplier | Not started | |
| RDX-61 | Rewrite [push-notifications.md](./push-notifications.md): `comment` → `receipt`, like digest → net-Aura digest. Do not implement push here | Not started | |
| RDX-62 | Analytics events: `like` / `unlike` / `comment` → `vote` / `receipt`. Update ANL-01/02/04 when those rows move | Not started | |
| RDX-63 | Admin: report target for receipts (today API-44 is comments). Same staff delete path | Not started | |
| RDX-64 | North star metric: an Aura Action is a vote or a post, not a like. Update product-spec §29 in the RDX-03 PR | Not started | |

---

## Suggested PR slices (after RDX-02)

Keep PRs inside one prefix cluster so this file does not become a merge battlefield.

1. **Spec lock** — `RDX-01`–`RDX-04`, `RDX-60`, `RDX-61`, `RDX-64` (docs only).
2. **Ledger + vote API** — `RDX-10`–`RDX-13`, `RDX-16`, `RDX-20`. No client UI yet; tests hit the API.
3. **Migration + feed projection** — `RDX-14`, `RDX-15`, `RDX-17`–`RDX-19`.
4. **Slider** — `RDX-30`–`RDX-35`.
5. **Receipts + ledger** — `RDX-40`–`RDX-46`.
6. **Web** — `RDX-21` (and `RDX-57` if the demo is in the same screenshots).

Do not combine 2 and 4 in one PR. The ledger has to be right before the slider can be honest.

---

## Changelog

| Date | Decision | PR |
|---|---|---|
| 2026-09-01 | Redesign cut is **votes + receipts**. Manifesto feeds/nav/onboarding are tracked but screenshot-gated. Implementation waits on files in `docs/redesign-screens/` | *this PR* |
