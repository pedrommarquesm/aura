# Aura — web

Public marketing and discovery surface for Aura. Next.js App Router, TypeScript,
Tailwind v4.

Per the product spec (§3.1) this app is **acquisition, discovery and sharing
only**. There is no post creation, no upload, no battles and, in V0, **no
authentication** — it is a public read-only surface.

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
app/               routes, metadata, sitemap/robots/icons
components/ui/     token-driven primitives (Button, Card, Avatar, Skeleton, AuraValue)
components/landing/ landing page sections
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

`lib/api` mirrors the documented public endpoints (`GET /v1/feed/trending`,
`GET /v1/posts/:id`, `GET /v1/leaderboards/global`) and their
`{ items, nextCursor, hasMore }` envelope.

There is no backend yet, so `lib/api/index.ts` resolves to the mock
implementation. Switching to the real API is that one file plus
`NEXT_PUBLIC_USE_MOCK_API=false`. When `packages/contracts` lands (FND-04),
`lib/api/types.ts` becomes a re-export of the shared schemas.

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
| `NEXT_PUBLIC_API_BASE_URL`     | No       | Aura API origin. Unused while mocks are on.                  |
| `NEXT_PUBLIC_USE_MOCK_API`     | No       | Defaults to mocks. Set `false` once the API is reachable.    |
| `NEXT_PUBLIC_APP_DOWNLOAD_URL` | No       | Primary CTA target; falls back to the download section.      |
| `NEXT_PUBLIC_APP_STORE_URL`    | No       | Placeholder until `WEB-07`.                                  |
| `NEXT_PUBLIC_PLAY_STORE_URL`   | No       | Placeholder until `WEB-07`.                                  |

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

`railway.json` pins the builder to the Dockerfile and sets the health check, so
the service configuration lives in source rather than in the dashboard. Deploys
run from this directory, since `railway up` uploads the current directory as the
build context.

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

## SEO

Metadata comes from `lib/seo.ts` (`buildMetadata`) and share images from
`lib/og-image.tsx` (`renderOgImage`). A future public post page at
`/a/@username/post/:postId` only needs to call both with the post's data to get
canonical URLs, Open Graph and Twitter cards.
