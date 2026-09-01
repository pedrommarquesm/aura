# Push notifications

Plan for V0. Competition pushes (rank, battles, challenges) stay M2 (`API-34`).

Companion: [roadmap.md](./roadmap.md) · [i18n.md](./i18n.md) · [early-beta-launch.md](./early-beta-launch.md) · architecture §13 · [redesign-tracker.md](./redesign-tracker.md) (`RDX-61`)

---

## What this is not

- **Not a waitlist channel.** People on the list do not have the app. “You’re invited / the beta is open” is **email**.
- **Not one push per like.** Spec §22 and architecture §13. Likes go through a digest.
- **Not web push.** Posting is in the app. Web login is hidden. Skip browsers in V0.
- **Not marketing.** No “come back and farm Aura” blasts. Transactional only.
- **Not week 0.** First 20 testers you can text. Wire this after they actually post, or you are notifying into an empty board.

Do this **after** TestFlight exists and **after** Sentry/admin waitlist, **before** you expect anyone to return on their own.

---

## V0: what we send

High signal, low volume. Copy is server-rendered from `users.locale` (`en` / `pt` / `pt-br` / `es`).

| Event | Push | In-app row | When |
|---|---|---|---|
| Someone comments on your post | Immediate | Yes, deep link to the thread | V0 |
| Likes on your posts | Digest only | Yes, collapsed | V0 |
| Waitlist Aura claimed at first sign-in | Optional, once | Yes | V0 if cheap |
| You were mentioned / hashtag | No | No | Not V0 |
| Rank change, battles, challenges, Super Like | No | No | M2 (`API-34`) |

**Like digest:** a worker reads the ledger, not the like request. Window on the order of **15–30 minutes** (or “once the user is idle”). One push: “You gained 40 Aura” / “3 people gave Aura to *caption*”. Never “@x liked your post” twenty times.

**Comments:** one push per comment is acceptable at early-beta volume. If a thread explodes, collapse to “5 new comments on your post” in the same aggregator. Do not notify the author for their own comment.

The comment object becomes a **receipt** (optional text on a signed vote). Do not implement this table as-is once [redesign-tracker.md](./redesign-tracker.md) `RDX-61` rewrites it — receipts immediate, Aura as a net digest, still never one push per vote.

Do not notify suspended/banned users. Do not notify for removed posts.

---

## Shape

```text
Like / comment write  ──►  Postgres (source of truth)
                         └──►  BullMQ job (already the async plane)
                                  ├── upsert notification row
                                  └── maybe Expo Push (after debounce)

App open  ──►  GET /v1/notifications
Tap push  ──►  aura:// post or comments
```

The like endpoint stays **p95 &lt; 50ms**. No push, no Expo HTTP, inline. Architecture already says this.

### Data

- **`device_sessions.push_token`** (Expo token, nullable). One token per signed-in device. Clear on logout / revoke / ban (ban already kills the session).
- **`notifications`:** `id`, `userId`, `type` (`comment` | `like_digest` | `waitlist_claim`), `title`, `body`, `data` (postId, …), `readAt`, `createdAt`. Collapse like-digest rows by `(userId, postId, window)` so the inbox does not grow one row per like either.
- **`GET /v1/notifications`** cursor page. **`POST /v1/notifications/:id/read`** and mark-all. Badge = unread count.

No NextAuth, no third-party notification SaaS. Expo’s push service is the pipe; we own the inbox.

### Mobile

- `expo-notifications` on **preview/dev builds only** (same constraint as Google on iOS). Expo Go is not the beta.
- Ask for permission **after** the first like or first post, not on a cold install wall.
- Register the Expo push token with the API next to the refresh session (the device we already track).
- Tap opens the post / comments sheet. Background handler is enough; no notification-extension work in V0.
- Settings: a single “Notifications” toggle is enough at first. Split “comments / Aura digest” when people complain.

### Apple / Google credentials

EAS can store APNs key + FCM. Need:

- Apple Developer: Push Notifications on the App ID (`com.auraclimb.mobile`)
- Android: FCM on the Firebase/Google project already used for Sign-In
- EAS `eas credentials` for the **preview** profile, not only production

Physical device. Simulator will not prove APNs.

---

## Sequence

1. **Schema + inbox API** — tokens on `device_sessions`, `notifications` table, GET/read. Empty list is a valid V0.
2. **Mobile permission + register** — after first Aura action; send token on session.
3. **Comment → notify** — worker, Expo Push, deep link. Prove the pipe with one type.
4. **Like digest** — BullMQ delayed/repeatable job from ledger rows. This is the part that must not leak a per-like push.
5. **Optional:** one “your early Aura landed” after waitlist claim.

Stop there until the north star says people come back. Rank-up and “you’re #1 in Lisbon” wait for M2.

---

## Out of scope until later

- Web Push
- Email for in-app events (waitlist mail stays waitlist mail)
- Quiet hours, rich images, notification service extension
- Following / mentions
- Staff broadcast (“new challenge”)
- OneSignal / Firebase In-App Messaging as a parallel inbox
