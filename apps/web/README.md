# Aura — web

Public marketing and discovery surface for Aura. Next.js App Router, TypeScript,
Tailwind v4.

Per the product spec (§3.1) this app is **acquisition, discovery, sharing and
voting**. There is no post creation, no upload, no battles. Guests can read the
public feed. Sign in with Google (a thin client of the Aura API) likes a post
and claims a username. Posting stays in the app.

## Getting started

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Scripts

| Script          | What it does                          |
| --------------- | ------------------------------------- |
| `npm run dev`   | Dev server on http://localhost:3000   |
| `npm run build` | Production build                      |
| `npm run start` | Serve the production build            |
| `npm run lint`  | ESLint                                |
| `npx tsc --noEmit` | Typecheck                          |

## Layout

```
app/[locale]/      localized routes and per-locale metadata
app/               locale-independent routes (sitemap/robots/icons/manifest, /api/health)
i18n/              next-intl config: routing, request, navigation, formats, section ids
messages/          en.json + pt.json message catalogs
components/ui/     token-driven primitives (Button, Card, Avatar, Skeleton, AuraValue)
components/landing/ landing page sections
components/about/  /about page sections
lib/api/           typed API layer + mock implementation
lib/               design-token helpers, formatting, SEO
public/mock/       placeholder post media
```

## Design tokens

`app/globals.css` is the single source of colour, type, spacing, radius and
motion tokens, declared as Tailwind v4 `@theme` variables. Tailwind's own palette
and type scale are switched off there on purpose, so a raw hex or an off-scale
font size cannot slip in. The values mirror the React Native app — change both
together.

## Data layer

`lib/api` mirrors the documented public endpoints (`GET /v1/feed`,
`GET /v1/feed/trending`, `GET /v1/posts/:id`, `GET /v1/leaderboards/global`) and
their `{ items, nextCursor, hasMore }` (feed) / `{ entries, viewer, total }`
(leaderboard) envelopes.

The first page of each of those is still a Server Component fetch (SEO, and
the JWT stays in httpOnly cookies). That snapshot is dehydrated into TanStack
Query (`lib/query`) once — later RSC refreshes must not overwrite an infinite
feed with the first page. The browser owns pagination (`GET /api/feed`) and
mutations (`POST|DELETE /api/posts/:id/like`). Those route handlers read the
JWT from the request Cookie header and never call `cookies()` from
`next/headers`, because that makes Next refresh the page and jump the feed
to the top. A like writes every cached ranking plus the permalink so the
heart, count, and Aura stay in sync without `router.refresh()`. Session is
`useQuery(['me'])` against `/api/auth/me`. Query keys match mobile where the
meaning matches — FND-03 can merge the catalogs later.

The live staging API is the default. Set `NEXT_PUBLIC_USE_MOCK_API=true` to
render local vector posters instead. When `packages/contracts` lands (FND-04),
`lib/api/types.ts` becomes a re-export of the shared schemas.

Auth is a BFF in `app/api/auth/*`: Google Identity Services returns an ID token,
the route handler posts it to `POST /v1/auth/google`, and the API's access and
refresh tokens land in httpOnly cookies. Likes go through
`POST|DELETE /api/posts/:id/like` so the JWT never reaches the browser. The
proxy rotates refresh tokens so a page of Server Components cannot fire two
refreshes and trip reuse detection. There is no NextAuth user table.

`lib/api/error-message.ts` turns an API error code into a sentence from the
`errors.*` catalog, falling back to `errors.unknown` for a code this build has
never heard of. That fallback is the point: the API can add a code without the
web app shipping a blank error.

## i18n

English and European Portuguese, via `next-intl`. `docs/i18n.md` is the contract
both clients follow; this section is only how it is wired here.

| File | Role |
| ---- | ---- |
| `i18n/routing.ts` | Locales, default, `localePrefix`, cookie, localized `pathnames` |
| `i18n/request.ts` | Per-request locale, catalog, formats, time zone |
| `i18n/navigation.ts` | Locale-aware `Link`, `redirect`, `usePathname`, `getPathname` |
| `i18n/formats.ts` | Shared number formats (`aura`, `compact`) |
| `i18n/sections.ts` | Per-locale anchor ids for the landing sections |
| `i18n/static.ts` | Translator/formatter for code outside React (OG images) |
| `proxy.ts` | `next-intl` middleware: detection, prefixing, pathname rewrites |
| `next-intl.d.ts` | Types locale, message keys and formats from `en.json` |

English is **unprefixed** (`localePrefix: "as-needed"`), so `/` is the English
site and every URL that was already shared still resolves. Portuguese lives
under `/pt`. `<html lang>` is `en` / `pt-PT` — `pt` alone would claim Brazilian
Portuguese is equally intended.

The locale is deliberately `pt` while the language tag is `pt-PT`, and the two
are not interchangeable. `docs/i18n.md` has the reasoning; the short version is
that `Intl` with `pt-PT` groups thousands with a no-break space (`12 421`) while
`pt` gives the dot (`12.421`) that mobile also produces. `htmlLang` in
`i18n/routing.ts` is the only place `pt-PT` may appear.

### Routes

`pathnames` maps an internal route (the folder under `app/[locale]`) to the
segment each locale shows:

| Internal | `en` | `pt` |
| -------- | ---- | ---- |
| `/` | `/` | `/pt` |
| `/about` | `/about` | `/pt/sobre` |
| `/feed` | `/feed` | `/pt/explorar` |
| `/login` | `/login` | `/pt/entrar` |
| `/username` | `/username` | `/pt/nome` |

Adding a localized route is one entry here plus the folder. Requests to the
untranslated segment (`/pt/about`) redirect to the translated one, so there is a
single indexable URL per locale.

`getPathname` resolves those segments, which is why `sitemap.ts` and `lib/seo.ts`
never concatenate URLs by hand — `hreflang`, canonical and sitemap entries all
come out of the same map.

Landing-page anchors are localized too (`#trending` / `#em-destaque`), from
`i18n/sections.ts`. Nav links carry the route as well as the hash
(`/pt#em-destaque`) so they work from `/sobre` and not just the landing page.

**The public post URL stays out of this.** Per `docs/i18n.md`,
`/a/:username/post/:postId` is the share URL and must be canonical and permanent
with no prefix. Nothing above blocks that, but it needs two things when WEB-10
builds it:

- Put it at the app root, outside `[locale]`, and leave it out of `pathnames`.
  `i18n/request.ts` falls back to the default locale when there is no `[locale]`
  segment to read, so `next-intl` formatting works there anyway.
- **Add `a` to the `proxy.ts` matcher's exclusion list.** Otherwise the proxy
  treats the share URL as an unprefixed page, applies the visitor's cookie and
  redirects `/a/bob/post/1` to `/pt/a/bob/post/1` — which is not a route. A
  share link that 404s for anyone who once picked Portuguese is the exact
  failure this URL exists to avoid.

### Catalogs

`messages/en.json` and `messages/pt.json`, ICU MessageFormat, keys namespaced and
dot-separated per `docs/i18n.md`. `en.json` is the source of truth for the key
set — `next-intl.d.ts` types `Messages` from it, so a key missing from `pt.json`
is a typecheck error rather than a runtime blank.

Not translated, deliberately: the word **Aura**, the level titles (NPC → Aura
God) in `lib/aura.ts`, and user content. They are the game's vocabulary, not
copy.

### Formatting

Every number goes through `useFormatter` / `format.number` — never a manual
separator, because the separators invert between locales (`12,421` vs `12.421`).
`AuraValue` is the component that matters; `lib/format.ts` takes a formatter
rather than making its own so server and client render identically.

Outside the React tree (`opengraph-image.tsx`) use `i18n/static.ts`, since the
hooks need a request context that image generation does not have.

### Locale switcher

`components/locale-switcher.tsx`. It lives in Settings (`/settings`,
`/pt/definicoes`) and in the header settings menu — not as EN/PT pills in the
header chrome. Two plain links, so it is crawlable and works without
JavaScript. It links to `usePathname()` — the *internal* pathname — in the
other locale, so switching on `/sobre` lands on `/about` and not the homepage.
First visit is detected from `accept-language`; an explicit choice is written
to the locale cookie and wins from then on.

One thing looks wrong and is not: from `/pt/sobre` the English link points at
`/en/about`, a prefix English otherwise never uses. It is required. With the
cookie set to `pt`, an unprefixed `/about` states no locale, so the proxy
applies the cookie and sends it back to `/pt/sobre` — a clean href could never
escape Portuguese. The prefixed URL states the locale, so the proxy rewrites the
cookie and redirects on to the canonical `/about`. One extra hop, only when
switching. Verify it with:

```bash
curl -sI -b NEXT_LOCALE=pt http://localhost:3000/about    # -> /pt/sobre
curl -sI -b NEXT_LOCALE=pt http://localhost:3000/en/about # -> /about, sets NEXT_LOCALE=en
```

## Deployment

The app ships as a container. `next.config.ts` sets `output: "standalone"`, so
the runtime image carries `server.js` plus the traced dependencies instead of a
full `node_modules`. `.next/static` and `public` are copied in separately —
without them the server still answers 200 but every stylesheet and chunk 404s.

### Environment variables

All of these are `NEXT_PUBLIC_*`, which means they are **inlined at build time**,
not read at boot. Changing one requires a rebuild, and the Dockerfile therefore
declares each as an `ARG`. See `.env.example` for the full list.

| Variable                       | Required | Notes                                                        |
| ------------------------------ | -------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`         | Yes      | Public origin. Canonical URLs, Open Graph, sitemap, robots.  |
| `NEXT_PUBLIC_API_BASE_URL`     | No       | Aura API origin. Defaults to staging.                        |
| `NEXT_PUBLIC_USE_MOCK_API`     | No       | Defaults to the live API. Set `true` for local mock posters. |
| `NEXT_PUBLIC_APP_DOWNLOAD_URL` | No       | Primary CTA target; falls back to the download section.      |
| `NEXT_PUBLIC_APP_STORE_URL`    | No       | Placeholder until `WEB-07`.                                  |
| `NEXT_PUBLIC_PLAY_STORE_URL`   | No       | Placeholder until `WEB-07`.                                  |
| `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` | No   | Web application OAuth client for GIS. Must also be in the API `GOOGLE_CLIENT_IDS`. Rebuild after changing. |

`PORT` and `HOSTNAME` are runtime-only. The image defaults to `3000` and
`0.0.0.0`; Railway overrides `PORT`.

### Build and run the container locally

From `apps/web` (the build context is this directory, not the repo root):

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  -t aura-web .

docker run --rm -p 3000:3000 -e PORT=3000 aura-web
```

Then check that both the page and its assets are served:

```bash
curl -sI http://localhost:3000/ | head -1
curl -s http://localhost:3000/ | grep -oE '/_next/static/[^"]+\.css' | head -1
```

Without Docker you can verify the same output the image runs:

```bash
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
PORT=3001 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

### Deploy to Railway

Service configuration lives in [`.railway/railway.ts`](../../.railway/railway.ts)
at the repository root, which declares this service alongside the API, worker,
and databases. Deploys run from this directory, since `railway up` uploads the
current directory as the build context.

```bash
export RAILWAY_TOKEN=<project token>

railway variables --service web --set NEXT_PUBLIC_SITE_URL=https://<domain>
railway up --service web --detach

# --detach only queues the build; wait for a terminal state.
railway deployment list --service web --json
railway logs --service web        # when it is FAILED or CRASHED
```

`railway domain --service web --port 3000` generates the public domain. Because
`NEXT_PUBLIC_SITE_URL` is baked into the bundle, set it to that domain and
redeploy the first time a domain is created.

This service originally carried a `railway.json`. It was removed because
Railway deprecated config-as-code and now rejects that model outright, and
because managing one service with both `railway.json` and the TypeScript config
is blocked. Two things learned while it was still in place are worth keeping:

- The **deploy** block was silently ignored by the platform, so the health check
  never ran even though the file declared one.
- The **build** block only applied to a deployment that carried the file, so
  `railway up` honoured it while `railway redeploy` fell back to the service's
  own builder and started the app with `next start` — which does not work with
  `output: "standalone"`. Setting `dockerfilePath` pins the Dockerfile builder
  for every path.

See [docs/deployment.md](../../docs/deployment.md) for the current workflow.

## SEO

Metadata comes from `lib/seo.ts` (`buildMetadata`) and share images from
`lib/og-image.tsx` (`renderOgImage`). A future public post page at
`/a/:username/post/:postId` only needs to call both with the post's data to get
canonical URLs, Open Graph and Twitter cards.

`buildMetadata` takes a locale and an internal pathname and derives the rest:
canonical URL, `hreflang` alternates for every locale plus `x-default`,
`og:locale` and `og:locale:alternate`. `sitemap.ts` lists both locales of every
route with the same alternates. Adding a locale to `i18n/routing.ts` therefore
extends the sitemap and every page's alternates without touching either file.

Verify the localized head after a build:

```bash
curl -s http://localhost:3000/ | grep -oE '<link rel="alternate"[^>]*>'
curl -s http://localhost:3000/sitemap.xml | grep -c hreflang
```
