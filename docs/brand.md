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

**Primary: `auraclimb.com`**

RDAP 404 on Verisign, no nameservers, no A record. Standard
registration, not an aftermarket listing.

Buy today, in this order:

| Domain | Role | Status 2026-08-31 |
|---|---|---|
| `auraclimb.com` | Canonical site | Unregistered |
| `auraclimb.app` | Defensive + future universal-link spare | Unregistered (Google RDAP 404) |
| `auraclimb.net` | Defensive | Unregistered |
| `climbaura.com` | Swap-typo defensive | Unregistered |

Do not buy a long list of aura-memes. The ones that look obvious
(`aurafarm.com`, `farmaura.com`, `getaura.com`, `playaura.com`,
`aura.farm`, `aura.social`, `aura.game`) are gone.

Hostnames once the zone is ours:

| Host | Service |
|---|---|
| `www.auraclimb.com` | Web (canonical) |
| `auraclimb.com` | Apex → www at DNS |
| `api.auraclimb.com` | API |
| `cdn.auraclimb.com` | R2 / media |
| `admin.auraclimb.com` | Staff backoffice |
| `app.auraclimb.com` | Optional store smart link |

Until those are purchased and attached, staging stays on
`aurarankd.com`. Do not point production traffic at `aurarankd.com`.

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
- `aurarankd.com` stays the staging hostname until the new zone
  answers. Then OPS cutover: DNS, Railway custom domains, R2 custom
  domain, client `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`, CORS origins.

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

1. Register `auraclimb.com`, `auraclimb.app`, `auraclimb.net`,
   `climbaura.com`. Registrar you already use is fine. Enable registry
   lock + 2FA.
2. Claim `@auraclimb` on Instagram, TikTok, X, YouTube, Threads the
   same hour. Same avatar, same bio.
3. Create `hello@` / `support@` on the new zone (or a Google Workspace
   / Fastmail trial).
4. Leave `aurarankd.com` alone until the new nameservers are live.
   Cutover is its own OPS task.
