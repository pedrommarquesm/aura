# Brand & naming

This is the naming contract. New copy, accounts, domains, and identifiers
follow this file. Do not invent a parallel name.

Checked 2026-08-31 against RDAP (Verisign `.com` / `.net`, Google `.app`),
DNS, App Store collisions, and the obvious socials. Availability moves —
buy the domains and claim the handles before talking about the name in
public.

## The split

| Layer | Name | Why |
|---|---|---|
| **What you farm / what people say** | **Aura** | Already the game. Never translated ([i18n.md](./i18n.md)). |
| **Product, store, company, domain, socials** | **Auraclimb** | Registerable, searchable, not the meditation app. |

Aura alone is a bad *product* name. Aura Health (meditation, millions of
users) owns App Store search. `aura.com` / `aura.app` are taken or priced
like real estate. A llama farm holds `aurafarm.com`. A campus-challenge
app already ships as "Aura Farm". A creator-payout site sits on
`aurafarming.co`. The meme is useful; it is not ours to own as a `.com`.

Auraclimb keeps the word people already understand and adds the other
verb in the loop: climb. It is one word, sayable in English and in the
Portuguese this audience already uses for English internet terms
(NPC, Aura Farmer, climb the board).

Spoken casually it is still **Aura**. The home-screen wordmark stays
**Aura**. The store listing, the URL you print, the @handle, and the
legal entity are **Auraclimb**.

## How it is written

| Context | Form |
|---|---|
| Wordmark, home screen, in-app chrome | `Aura` |
| Store listing (App Store / Play) | `Auraclimb` |
| Store subtitle | `Farm Aura. Climb.` / `Farma Aura. Sobe.` |
| First mention in marketing | `Auraclimb` |
| Later mentions | `Aura` is fine when it means the score |
| Legal / invoices / DUNS | `Auraclimb` |
| Hashtag | `#auraclimb` (primary). `#aura` is the meme, not us. |
| Handle | `auraclimb` — never `auraapp`, never `aurarankd` |

Never: AuraClimb, Aura Climb, aura-climb, AuraRankd, Aura Ranked, Aura
Farm, AuraFarm, FarmAura.

`Aura Climb` (two words) is allowed only as a spoken clarification
("it's Aura Climb"). It is not a logo and not a URL.

## Domain

**Primary: `auraclimb.com`** — live as the staging public zone (OPS-14).

Checked 2026-08-31 (RDAP) before purchase. Canonical `auraclimb.com` is
now attached. Remaining buys / claims:

| Domain | Role | Status |
|---|---|---|
| `auraclimb.com` | Canonical site | Live (`www`, apex → www) |
| `auraclimb.app` | Defensive + future universal-link spare | Buy if still free |
| `auraclimb.net` | Defensive | Buy if still free |
| `climbaura.com` | Swap-typo defensive | Buy if still free |

Do not buy a long list of aura-memes. The ones that look obvious
(`aurafarm.com`, `farmaura.com`, `getaura.com`, `playaura.com`,
`aura.farm`, `aura.social`, `aura.game`) are gone.

Hostnames:

| Host | Service |
|---|---|
| `www.auraclimb.com` | Web (canonical) — live |
| `auraclimb.com` | Apex → www at DNS — live |
| `api.auraclimb.com` | API — live |
| `cdn.auraclimb.com` | R2 / media — live |
| `admin.auraclimb.com` | Staff backoffice (still the Railway hostname today) |
| `app.auraclimb.com` | Optional store smart link |

`www.auraclimb.com` / `api.auraclimb.com` / `cdn.auraclimb.com` are live
on staging (OPS-14). `aurarankd.com` is detached.

Email on the new zone:

| Address | Use |
|---|---|
| `hello@auraclimb.com` | Public |
| `support@auraclimb.com` | Users |
| `press@auraclimb.com` | Press |
| `privacy@auraclimb.com` | GDPR / privacy requests |
| `abuse@auraclimb.com` | Reports that miss the in-app flow |

## Socials

Handle is **`auraclimb`** on every network. Claim them the same day as
the domain — unused handles on a name this clean do not stay unused.

| Network | Handle | Notes 2026-08-31 |
|---|---|---|
| Instagram | `@auraclimb` | Claim first. No indexed profile found. |
| TikTok | `@auraclimb` | Claim first. Primary acquisition surface. |
| X | `@auraclimb` | Profile 404 — looks free. |
| YouTube | `@auraclimb` | Channel 404 — looks free. |
| GitHub | `auraclimb` | User 404. Org later; repo can stay `aura` until it is public. |
| Threads | `@auraclimb` | Same as Instagram. |
| Discord | `auraclimb` | Server vanity, not a user. |
| Reddit | `u/auraclimb` + `r/auraclimb` | |
| LinkedIn | `auraclimb` company page | |
| Facebook | `auraclimb` page | Needed for Meta ads. |
| Snapchat | `auraclimb` | |

Do not use `@auraapp` (the current web placeholder). It reads like a
generic and we will not win it.

Bio pattern, every profile:

> Auraclimb — the social game where likes are the score.
> Farm Aura. Climb.
> auraclimb.com

Portuguese profiles swap the tagline for `Farma Aura. Sobe.` and keep
the English product name.

## App stores

| Field | Value |
|---|---|
| Display name | `Auraclimb` |
| Subtitle (Apple, 30) | `Farm Aura. Climb.` |
| Short description | `Post photos and videos, farm Aura, climb the board.` |
| Category | Social / Entertainment — never Health, never Sports |
| iOS bundle id (production) | `app.auraclimb.mobile` |
| Android application id (production) | `app.auraclimb.mobile` |
| URL scheme | `auraclimb` |
| Universal / App Links | `https://auraclimb.com/a/...` |

Staging can keep `app.aurarankd.mobile` and `aura://` until the new
Apple / Google clients exist. Changing the bundle id breaks Sign in
with Apple. Do that on a dedicated cutover, not in a drive-by PR.

Store search will still surface the meditation app for the query
"Aura". That is expected. We win on "Auraclimb", "farm aura app", and
the share URLs — not on a one-word brand the wellness industry already
owns.

## Technical identifiers (new work)

| Thing | Value |
|---|---|
| npm / package scope | `@auraclimb/…` (existing `@aura/api` waits for FND-03) |
| EAS slug | `auraclimb` |
| Staff JWT audience | `auraclimb-staff` |
| R2 bucket (production) | `auraclimb-media` |
| Analytics source | `auraclimb` |
| OG `twitter:site` | `@auraclimb` |
| Support / legal URL | `https://www.auraclimb.com` |

Share path stays `/a/:username/post/:id`. The `a` is Aura the score,
and those URLs are meant to live forever.

## What does not change

- The currency is **Aura**. Copy, titles (NPC → Aura God), and catalogs
  keep saying Aura.
- European Portuguese stays the second locale. The product name is not
  localised.
- Moai (🗿) stays the score glyph. It is not the company name.
- Staging hostnames are `www.auraclimb.com`, `api.auraclimb.com`, and
  `cdn.auraclimb.com` (OPS-14 / [#77](https://github.com/pedrommarquesm/aura/pull/77)).
  `aurarankd.com` is detached. iOS bundle id stays
  `app.aurarankd.mobile` until the Apple client cutover.

## Name in a sentence

> **Auraclimb** is the social game. **Aura** is the score. You farm
> Aura on Auraclimb and you climb.

Portuguese, same structure:

> **Auraclimb** é o jogo. **Aura** é o score. Farmas Aura no Auraclimb
> e sobes.

## Rejected (so we do not reopen them)

| Candidate | Why not |
|---|---|
| Aura | Meditation app, dead domains, unsearchable store listing. |
| Aura Farm / Aurafarm | Llama farm on `aurafarm.com`; campus app already named Aura Farm; `aurafarming.co` is a payout company; the meme is generic. |
| FarmAura | Agritech startup + taken `.com`. |
| Get Aura / Play Aura | `.com` taken; English-only "get/play" prefix. |
| Auralords | Available (`.com` + `.app`) and on-brand, but reads as a fantasy guild. Keep as the fallback if `auraclimb.com` is gone by the time we buy. |
| The Aura Game / `theauragame.com` | Available, honest, too long for a handle and a home-screen label. |
| Sobeaura / `sobeaura.com` | Perfect in Portuguese, opaque everywhere else. |
| Cimaura / `cimaura.com` | Same PT root (`cima`), invented enough, but English speakers will not spell it. |
| Aurabrawl / Aurarumble | Available `.com`, too fighty, sit next to Brawl Stars. |
| Voteaura | Available `.com`. Sounds civic, not social. |
| Moai as the product name | The glyph is ours; the word is Easter Island + other companies. |
| Anything on `aura.farm` / `aura.gg` / `aura.social` | Taken. |

If `auraclimb.com` is registered out from under us, the fallback is
**Auralords** (`auralords.com` + `auralords.app`, same split with Aura
as the score). Do not improvise a third name.

## Nearby collisions to live with

- **Aura Health** (`aurahealth.io`) — meditation. Different category.
  This is why the store name is not "Aura".
- **Aurora Climbing** (`auroraclimbing.com`) — rock-climbing hangboard
  hardware in Squamish. Different spelling, different industry. We stay
  out of Health and Sports on the stores so reviewers do not merge us.
- **Aura Kingdom** — old MMO. Irrelevant unless we call ourselves Aura
  Lords (another reason that name is only a fallback).

This is not legal advice. File an EU trade mark (classes 9 and 41) once
the domain is ours; Portugal first, EUIPO second.

## Buy-today checklist

1. `auraclimb.com` is registered and live. Still buy `auraclimb.app`,
   `auraclimb.net`, and `climbaura.com` if they are free. Registry
   lock + 2FA.
2. Claim `@auraclimb` on Instagram, TikTok, X, YouTube, Threads the
   same hour. Same avatar, same bio.
3. Create `hello@` / `support@` on the new zone (or a Google Workspace
   / Fastmail trial).
4. Public HTTP hostnames are already on `auraclimb.com` (OPS-14).
   Remaining: defensive domains, socials, and the iOS bundle-id cutover.
