# Testing strategy: mobile E2E + load testing

Plan only — nothing in this doc is implemented yet. Tracked as `MOB-80`–`MOB-81` (E2E) and `OPS-18`–`OPS-20` (load) in [roadmap.md](./roadmap.md).

Companion: [roadmap.md](./roadmap.md) · [early-beta-launch.md](./early-beta-launch.md) · [deployment.md](./deployment.md) · [redesign-tracker.md](./redesign-tracker.md) (`RDX-46` — the gesture-testing gap this closes)

---

## What this is not

- **Not a replacement for the Jest/RNTL flow tests** in `apps/mobile/__tests__/flows/`. Those stay: fast, mocked API, run on every PR (`apps/mobile/__tests__/README.md`). E2E is a second, slower layer on top.
- **Not visual regression / pixel diffing.** Screenshots here are for a human to look at (and for CI to attach on failure), not automated image comparison. A snapshot-diff tool is a fair follow-up once the flows are stable.
- **Not a full device farm matrix.** Start with one iOS simulator + one Android emulator. BrowserStack / Firebase Test Lab for a wider OS/device grid is a later phase, not a prerequisite.
- **Not chaos or soak testing.** Load testing here means "how does the API behave under realistic-to-heavy traffic for a few minutes," not multi-day endurance runs or fault injection. Later phase.
- **Not production load testing.** We have not launched (`docs/early-beta-launch.md`). All of this runs against a disposable environment, never against `api.auraclimb.com` staging that testers/demos rely on.

---

## Environment topology

Today there is exactly one deployed environment: Railway staging (`api.auraclimb.com` / `www.auraclimb.com`, `APP_ENV=staging`, `docs/deployment.md`). Neither E2E nor load testing should run against it — a nightly E2E job or a load-test burst would corrupt the data staging demos and manual QA depend on, and a load test would make staging unusable for testers mid-run.

Proposed environments, in order of when we'd stand each one up:

| Environment | Purpose | Reset policy | Lifecycle |
|---|---|---|---|
| **local** (existing) | Developer loop, unit/flow tests | `docker compose down -v` whenever | Always up on a dev machine |
| **staging** (existing) | Manual QA, demos, client integration | Never automated | Always up |
| **e2e** (new) | Mobile E2E suite | Drop + reseed manually, on demand (weeks, not per-run) | Always up, cheap tier |
| **load** (new) | Load-test bursts | Drop + reseed before each run, or provisioned fresh and torn down after | Ephemeral — spun up for a run, torn down after |

The **e2e** and **load** environments are separate Railway projects (or at minimum separate Postgres/Redis instances) from staging and from each other — an E2E run scrolling through a giant `posts` table generated for a load test would make screenshots and assertions meaningless, and a load-test burst mid-E2E-run would produce flaky latency-based failures. Both are cheap to stand up: same `docker-compose.yml` shape (Postgres 18 + Redis 8) plus the API/worker containers, same `APP_ENV=staging` config so password auth (`passwordAuthEnabled`, `apps/api/src/config/env.ts:228`) stays on and Apple/Google are not required.

`e2e` stays up continuously (tests need to accumulate data across runs — see below); `load` is provisioned right before a run and torn down after, since it only matters while a burst is happening and idle infra cost isn't worth paying for it between runs.

---

## Part 1 — Mobile E2E

### Goals

- Drive the **real built app** (not the Jest-mocked one) against a **real backend**, so it catches what mocks structurally cannot: the vote slider's actual `Gesture.Pan()` drag, real navigation transitions, real permission/keyboard dialogs, real timing.
- Read like a user story — behavior, not implementation. `it('slides up and releases, and the receipt prompt appears')`, not `it('calls castVote with amount 42')`.
- Produce **screenshots** — at meaningful checkpoints, not just on failure — so a person can scroll through what the suite actually saw.
- Run **repeatedly against an ever-growing database**. No test may assume it is the only thing that has ever touched the DB, and no test may wipe it for the next one.

### Tool choice: Maestro

| Tool | Fit for this app | Verdict |
|---|---|---|
| **Detox** | Gray-box, fast, syncs on app idle. But needs a custom native test runner wired into the build, which fights the Expo managed workflow (config plugin + prebuild changes, historically flaky with the New Architecture). | Not chosen |
| **Maestro** | Black-box — drives whatever's on screen, no native wiring. YAML flows (`tapOn`, `inputText`, `assertVisible`, `swipe`) that already read as behavior steps without adding Cucumber/Gherkin on top. Built-in `takeScreenshot` and video recording. Runs against an Expo dev client or an EAS build unmodified. Optional Maestro Cloud for device-farm runs later. | **Chosen** |
| **Appium** | Mature, cross-platform, but verbose (WebDriver protocol, driver/session management) for a team this size and a suite this new. | Not chosen |

A Maestro flow is already close to Gherkin without the ceremony:

```yaml
appId: app.auraclimb.mobile
---
- launchApp
- tapOn: "Sign in"
- tapOn: "Email or username"
- inputText: "${E2E_EMAIL}"
- tapOn: "Password"
- inputText: "${E2E_PASSWORD}"
- tapOn: "Sign in with email"
- assertVisible: "Live Check"
- takeScreenshot: signed-in-feed
- swipe:
    direction: UP
    from: 90%, 70%   # the slider track, right edge
    to: 90%, 30%
- takeScreenshot: slider-charged-positive
- assertVisible: "Drop a receipt"
```

No new abstraction layer needed — the flow file itself is the behavior spec, and it's readable by a non-engineer.

### Auth: reuse the existing e2e password path, don't share one account

Password login/register already exists **for e2e** (`apps/api/src/config/env.ts` — `passwordAuthEnabled`, `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`, `docs/early-beta-launch.md`). Do not point every Maestro run at that single shared account — concurrent or back-to-back runs would race on the same user's Aura score, own-post voting restriction, and receipt-once-per-vote rule.

Instead, each Maestro run **registers a fresh password account** via the real onboarding flow (or a direct `POST /v1/auth/register` setup call before the flow starts) with a namespaced handle: `e2e_<runId>_<n>`. This also means account creation itself gets exercised by the suite instead of being a fixture-only path.

### The rule that makes "evolving data" safe: tests own their fixtures, and only assert on what they created

This is the answer to "consecutive tests can't erase the DB and use a fresh state": don't rely on the DB being empty or in a known global shape. Instead:

- Every test creates **its own** post(s)/vote(s)/account(s) with unique, namespaced identifiers (caption includes the run id, username includes the run id) — either through the UI as part of the flow, or via a fast setup API call before the flow starts (register account → create post directly, then launch the app already signed in, to skip re-testing account creation in every flow).
- Every assertion is scoped to **that test's own data** — "the post I just created now shows +85 in the corner," never "the top of the feed" or "the #1 leaderboard slot" or an absolute vote count, all of which drift as other tests and other people's junk data pile up.
- Nothing deletes anything after a run. Junk data is fine and expected (the user's own framing) — the `e2e` environment gets dropped and reseeded on a slow cadence (weeks, before a big test push), never per test, never per run.
- Flows that must interact with content they don't own (voting on someone else's post to test the "can't vote on your own post" rule, or seeing an existing ledger) create that "someone else" as part of their own setup too, rather than reaching for a shared fixture that might have been mutated by an earlier run.

### Screenshots and artifacts

- `takeScreenshot` at the checkpoints that matter for a human reviewer: post-auth feed, slider mid-drag, receipt prompt, ledger sheet open, post-publish. Not just on failure.
- Maestro's own failure capture (screenshot + view hierarchy dump) stays on for every flow.
- CI uploads the screenshot/recording directory as a build artifact (`actions/upload-artifact`), retained ~14 days. No Slack/dashboard piping in V0 — a human opens the CI run when something looks wrong or when reviewing new coverage.

### Suggested flow set (mirrors the product manifesto surfaces)

| Flow | Priority | Covers |
|---|---|---|
| `sign-up-and-feed.yaml` | First | Password registration, guest→signed-in, Live Check feed loads |
| `vote-slider.yaml` | First — this is `RDX-46`'s open gap | Drag up/down, release commits the rounded amount, releasing at 0 cancels (no write, no prompt), one vote per post, cap at ±100 |
| `receipt.yaml` | First | Optional receipt prompt after a non-zero vote, skip vs fill, edit-once-if-empty rule |
| `ledger.yaml` | Second | Opening the ledger sheet from the score or a floating receipt, newest-first ordering |
| `create-post.yaml` | Second | Gallery import, caption + hashtag, publish, appears on own profile |
| `own-post-guard.yaml` | Second | Author cannot vote on their own post (403), does not appear in their own ledger |
| `profile.yaml` | Third | Aura score reflects casted votes, no follower count shown |

### CI integration and cadence

Mobile E2E is not a per-PR gate: a simulator boot + Expo dev-client build + real network calls to a live backend is too slow and too flaky to block every PR the way the existing Jest suite does. Plan:

- **Nightly** scheduled GitHub Actions workflow (macOS runner for iOS, or an Android emulator on Linux) against the dedicated `e2e` environment. Failure notifies but does not block anything already merged.
- **Manual `workflow_dispatch`** before a release, or after a PR that touches gesture/vote/receipt code, run by whoever's shipping it.
- Needs an Expo dev client build (`expo run:ios` / `expo run:android`, or an EAS internal build) pointed at the `e2e` environment's API URL via its own `.env` profile — do not reuse the staging `EXPO_PUBLIC_API_URL`.

### Phased rollout

1. Stand up the `e2e` environment (Postgres + Redis + API/worker, `APP_ENV=staging` config, password auth on).
2. Local spike: install Maestro, write and run one flow (`sign-up-and-feed.yaml`) by hand against the new environment, confirm the Expo dev client + Maestro combination works at all.
3. Add an `apps/mobile/e2e/` (or top-level `e2e/`) folder, an `npm run e2e` script, and a short README on pointing it at local vs the `e2e` environment.
4. Write `vote-slider.yaml` and `receipt.yaml` first — they're the coverage gap nothing else closes (`RDX-46`).
5. Fill in the rest of the flow set above.
6. Wire the nightly CI workflow with screenshot/recording artifact upload.
7. Later: Maestro Cloud or a device farm for broader device/OS coverage; consider layering visual-diff review once flows are stable.

### Open questions

- iOS first, or both platforms from day one? (Recommend iOS first — matches where the team is testing manually today — then add Android once flows are stable.)
- Does the `e2e` environment get its own Railway project, or a second Postgres/Redis pair inside the existing staging project? Either works; a separate project is cleaner to reason about but is another thing to keep configured.

---

## Part 2 — Load testing

### Goals

- Get a real number for how the API behaves under concurrent traffic *before* real traffic shows up, not after.
- Find the bottlenecks that only show up at scale: N+1s in feed/trending assembly, lock contention on the `votes` unique constraint, Redis `ZINCRBY`/leaderboard rebuild cost, the trending-recompute job's query plan against a large `aura_events` table.
- Be repeatable and scriptable enough that a result from this month can be diffed against a result from three months from now.

### Endpoint load testing vs. driving the real app — pick endpoint testing, but script it like a real session

Two options, and they answer different questions:

- **Protocol-level (endpoint) load testing** — synthetic HTTP requests hit the API directly, no mobile client involved. This is what actually generates load: it is the only way to get to thousands of requests/second without needing thousands of real device runtimes. It is precise (you control exactly what's sent) and cheap.
- **Real app instances at scale** — driving many actual app runtimes (simulators/devices) doing real gestures. This mainly answers a *client* performance question (does the app itself stay smooth/responsive), not a backend load question — the backend cannot tell a vote came from a finger drag versus a script. Doing this at meaningful concurrency (hundreds+) is slow and expensive for a fact the backend doesn't care about.

**Recommendation:** protocol-level load testing is the primary tool, but the scripts should replay a realistic **session**, not hammer one endpoint in isolation — e.g. "open app → fetch feed page → for a handful of posts, occasionally cast a vote (sometimes with a receipt), occasionally open the ledger → occasionally create a post" using roughly the same call shapes and pacing the app itself makes (`apps/mobile/lib/api/*`). This gets most of the value of "real interaction" (realistic traffic mix and request patterns) without the cost of running real device runtimes at load-generating scale. Reserve actual device/app runs (a handful, via Maestro or manual) for sanity-checking that the *client* still feels fine while the backend is under load from the scripted sessions — a small, separate check, not the load source.

### Tool choice: k6

| Tool | Fit | Trade-off |
|---|---|---|
| **k6** | Scripts in JS, first-class HTTP/WebSocket support, thresholds-as-code (a script can pass/fail against an SLO, not just print numbers), k6 Cloud for distributed runs if a single machine isn't enough, large community/Grafana integration. | Scripts run in k6's own JS runtime (goja), not Node — can't `import` API TS helpers directly. Acceptable: the scripts are a thin HTTP-calling layer, not business logic. |
| **Artillery** | Pure Node — could reuse small TS helpers from `apps/api` directly, YAML+JS scripting. | Smaller ecosystem, weaker built-in reporting than k6. |
| **Locust** | Good distributed model. | Python — a new language for an all-TypeScript team, no other upside strong enough to justify it. |
| **Gatling** | Very high raw throughput. | Scala/JVM — steep ramp-up for the team, heavier CI footprint. |

**Chosen: k6.** Scripts live in a new top-level `load-testing/` directory (sibling to `apps/`, not inside `apps/api`, since it's a test client for the API rather than part of it).

### Seeding data at scale

`apps/api/src/db/seed.ts` today is a small, **destructive** fixture generator (6-7 users, 24 posts, truncates first) meant for local/demo data, not load. It needs a second, additive mode rather than a rewrite:

- A parameterized bulk-seed script (`db:seed:load -- --users 5000 --posts 20000`) that **does not truncate** — it only adds, so repeated runs grow the dataset the same way real usage would, matching the "iterate over evolving data" rule from the E2E half of this doc.
- Batched multi-row inserts instead of the current per-row loop — at tens of thousands of rows the ORM's one-insert-per-row pattern is itself a bottleneck before the load test even starts.
- A realistic distribution, not a flat one: most posts get a handful of votes, a small tail of "viral" posts gets thousands — this is what actually stresses trending recompute, leaderboard rebuild, and ledger/vote-list pagination, whereas a uniform distribution would not.
- A large pre-seeded pool of password accounts with known credentials for the load scripts to authenticate as — you cannot register a fresh account per virtual user at load-generating volume without the registration endpoint's own rate limits becoming the bottleneck you're measuring.

### Scenarios to script, in priority order

1. `GET /v1/feed` (and hashtag/trending variants) — read-heavy, the single most frequent call the app makes.
2. Mixed session: feed reads interleaved with `POST /v1/posts/:id/votes` — exercises the vote unique-constraint/idempotency path and ledger writes under concurrency, not just reads.
3. Trending recompute job behavior against a large, long-tail `posts`/`aura_events` table.
4. Leaderboard Redis path (`ZINCRBY`/rebuild) under concurrent vote writes.
5. Auth/token-refresh volume (cheap to add once the harness exists).
6. Media upload + Mux webhook ingestion — separate, spikier profile (bursty, not sustained); lower priority since it's not the everyday hot path.

### Metrics and targets

- Track p50/p95/p99 latency and error rate per endpoint, achieved RPS, plus infra-side DB CPU/active-connections and Redis ops/sec for the same window.
- Start with a modest, explicitly provisional target tied to pre-launch scale (for example: feed reads sustaining 50–100 RPS with p95 under some number to be set once a first baseline exists) rather than inventing a number with no baseline to anchor it. Revisit after each growth milestone, not on a fixed schedule.
- Save each run's k6 summary (JSON) so a result can be diffed against the previous one — the point is catching regressions a PR introduces, not a single one-off number.

### Phased rollout

1. Add the additive, parameterized bulk-seed mode to the API package.
2. Stand up (or script the on-demand provisioning of) the `load` environment.
3. First k6 script: read-only feed load, get an actual baseline number — this is the "do we even have a problem" step.
4. Add the mixed vote-casting session script.
5. Add trending/leaderboard-focused scenarios once the dataset has the long-tail shape they need.
6. Wire a `workflow_dispatch` CI job that provisions `load`, runs the scripts, publishes the summary as an artifact, tears the environment down.
7. Later: thresholds-as-gates (fail the job if p95 regresses past a set bound), a small recurring scheduled run once there's a real baseline to protect, soak/spike/chaos testing.

### Open questions

- Appetite for a dedicated environment provisioned per run (cheaper, more setup work per run) vs. one that stays up between runs (simpler to trigger, costs more while idle)? Recommend per-run to start, since runs will be infrequent early on.
- No real traffic numbers exist yet (pre-launch) — the RPS/SLO targets above are placeholders to replace with an actual first baseline, not a spec to hit on day one.
