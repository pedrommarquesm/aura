# Early-beta launch plan

This is the current launch. We have **not** shipped to the App Store or Play Store. The public site is a waitlist. Testers install a private build.

Store launch, paid ads, and V1 competition (battles, challenges, seasons, Vote Power) are **later**. Do not run [marketing-launch-plan.md](./marketing-launch-plan.md) as a checklist yet — it assumes those features exist.

Companion: [roadmap.md](./roadmap.md) · [brand.md](./brand.md) · [product-spec.md](./product-spec.md)

---

## What early beta is for

Prove the loop with real people: **Discover → Like → Gain Aura → Climb → Post**.

Success is not waitlist size. Success is: a tester opens the app, scrolls, likes, posts a photo or video from the library, sees Aura move, and comes back the next day.

Cap the first wave. **20–50 people** you can talk to. Human moderation. Staging is the environment (`APP_ENV=staging` on `www` / `api` / `cdn.auraclimb.com`). Do not create production (`OPS-07`) for this.

---

## Done

Product loop (staging):

- Guest feed, like, Aura ledger, global leaderboard, profiles
- Post photo and video from the library (client shrink, R2, Mux for video)
- Comments, hashtags, caption edit/delete, avatars
- Apple/Google auth in the app (Google needs a **dev/preview build**, not Expo Go)
- Password login on local/staging only, for e2e — not a consumer promise
- Report / block / suspend / ban, staff admin
- Web likes exist in code; **web login is hidden** until we flip `NEXT_PUBLIC_WEB_AUTH_ENABLED`

Public site:

- Waitlist landing, early-beta join, referral (`/r/…`)
- Join +10 Aura now; referral +10 when the friend **creates an account** (not when they join the list)
- T&C, FAQ, contact form (contact is stored, not emailed)
- Welcome / referral mail through Resend (`OPS-15`)
- Locales: `en`, `pt`, `pt-br`, `es`

Brand and content drafts:

- Naming contract ([brand.md](./brand.md))
- Marketing copy pack, visual brief, Instagram example graphics — many of those assets say “we’re live” and mention battles/challenges. **Do not post them as-is.**

---

## Not done (blocks testers)

Do these before anyone outside your machine tries the app.

| # | What | Why |
|---|---|---|
| 1 | **EAS preview / TestFlight + internal Android** | There is no install path. `eas.json` has `preview` (internal) and `production` submit, but no shipped build. Expo Go cannot do Google on iOS. |
| 2 | **`APPLE_CLIENT_ID` on the API** | Until it is set, `POST /v1/auth/apple` returns `service_unavailable`. Staging still uses bundle id `app.aurarankd.mobile` — keep it until a dedicated Apple-client cutover ([brand.md](./brand.md)). |
| 3 | **Seed the feed (`OPS-08`)** | An empty board kills the loop. Seed or post ~20 real photos/videos yourself before inviting anyone. |
| 4 | **Resend domain + `RESEND_API_KEY` live** | Code is Done. Unset key parks mail as `queued`. Verify `auraclimb.com` in Resend and send from `Aura <hello@auraclimb.com>`. |
| 5 | **Mailboxes** | `hello@`, `support@`, `privacy@`, `abuse@` on auraclimb.com ([brand.md](./brand.md)). Contact form does not notify you. |
| 6 | **Claim `@auraclimb` everywhere** | Instagram, TikTok, X, YouTube, Threads, Discord, Reddit, GitHub. Bio is the waitlist, not “download now”. |

Tell testers, in writing:

- Library only — **Take a picture is disabled**
- Posting is in the app, not the website
- Early Aura from the waitlist lands on the account at **first sign-in with the same email**
- Apple Hide My Email will **not** merge with a typed inbox
- This is a beta on staging. Data can be wiped.

---

## Not done (needed before you invite the waitlist)

The waitlist is a list of emails. There is no in-product “you’re invited, here’s TestFlight.” That is an email you send by hand (or a small script against `waitlist_entries`). Do not blast the whole list on day one.

| # | What | Why |
|---|---|---|
| 7 | **Invite mail** | Short: you’re in, iOS TestFlight link / Android APK or Play internal track, same email as waitlist, expect a sparse feed. |
| 8 | **Staff on admin** | You (and one backup) signed into `admin-staging-ea68.up.railway.app`. You will remove posts and ban by hand. NSFW classifier (`TS-11`) is on hold. |
| 9 | **A way to see the waitlist** | Admin has no waitlist UI. Query `waitlist_entries` or add a staff page before wave 2. |
| 10 | **Fix the “two weeks” promise** | Welcome mail currently says Aura drops in two weeks. Either ship a date you mean, or change the copy to “we’ll write when the app opens.” |

Still not required for early beta: `WEB-07` store links, production, deploy pipeline (`OPS-02`), FND-03 monorepo, in-app camera, web login, password login in production. OpenTelemetry (`API-06`) waits until latency is a real question.

Sentry, PostHog, and admin waitlist/contact/outbox/thumbs are tracker rows (`OPS-17`, `MOB-77`, `WEB-34`, `ANL-01`–`ANL-04`, `API-43`, `TS-13`–`TS-15`). Do them before waitlist wave 1, not before the first 20 friends.

---

## Marketing — now vs later

### Now (waitlist + private beta)

Public CTA is only **[auraclimb.com](https://www.auraclimb.com)** → join early beta. No store buttons, no “it’s live,” no install ads.

1. **Claim handles** the same day (`@auraclimb`). Same bio on every network: *Auraclimb — the social game where likes are the score. Farm Aura. Climb. auraclimb.com*
2. **First 20 testers from people you know.** Text them. Do not seed Discord/TikTok yet.
3. **Record real gameplay** from those testers (feed, 🗿 like, Aura tick, a post). That footage is the only content that is honest.
4. **If you post publicly:** teaser + waitlist link. Use the voice in [launch-content.md](./launch-content.md) (casual, not SaaS). Strip every line about battles, daily challenges, seasons, Vote Power, and “download in the stores.”
5. **Do not post** `instagram-launch-announcement.png` or any “AURA IS LIVE” graphic. Do not run Spark Ads / UAC / $5k budgets. There is nothing to install from an ad.

Referral is already the growth loop for the *list*. Ask testers to share `/r/…` only after they have actually opened the app — referral Aura pays on **account**, not on waitlist join. That is the anti-fake-inbox rule; do not weaken it for vanity numbers.

### Later (public waitlist push)

After the first 20 have posted and the feed is not empty:

- Organic TikTok / Reels of **real** posts and the leaderboard, CTA = join the list
- Community seeding ([community-seeding-plan.md](./community-seeding-plan.md)) only after you have lurked; offer *early access*, not a store link
- Press / influencers only with a TestFlight seat and a script that does not mention V1 features

### Not this phase (store launch)

[marketing-launch-plan.md](./marketing-launch-plan.md), store pages, `WEB-07`, paid install campaigns, “Day 0: app goes live.” That pack is useful as a **later** outline. It is wrong as an early-beta runbook.

---

## Sequence

**Week 0 — install path**

1. Apple client id on staging API; smoke Continue with Apple on a device build
2. `eas build --profile preview` iOS → TestFlight (external off, first testers as internal)
3. Same profile for Android internal track or a direct APK
4. Seed ~20 posts; like them so the board is not zeros
5. Claim socials; mailboxes; confirm a waitlist join actually arrives in the inbox

**Week 1 — friends**

6. Invite 20 people you can message on WhatsApp
7. Sit in admin. Remove garbage. Watch: sign-in, first like, first post, waitlist Aura claim
8. Write down what broke. Fix that before any public post

**Week 2 — waitlist wave 1**

9. Invite a slice of `waitlist_entries` (tens, not thousands)
10. One public teaser on TikTok/IG that ends on auraclimb.com
11. Referral links from people who already have accounts

**Stop and decide.** If the loop feels dead, do not scale the list. If it feels alive, keep waving the waitlist. Store submit is a separate project (bundle id `app.auraclimb.mobile`, `WEB-07`, production).

---

## Explicitly out of scope until after early beta

- App Store / Play listing and real store URLs (`WEB-07`)
- Production Railway environment
- Web login on the public site
- In-app camera
- Automatic NSFW/spam in the worker (`TS-11`)
- Battles, daily challenges, seasons, following, Vote Power
- Push notifications — after testers post. Plan: [push-notifications.md](./push-notifications.md)
- Paid ads
- Promising a launch week date in ads or in mail unless you will hit it
