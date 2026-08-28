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

## SEO

Metadata comes from `lib/seo.ts` (`buildMetadata`) and share images from
`lib/og-image.tsx` (`renderOgImage`). A future public post page at
`/a/@username/post/:postId` only needs to call both with the post's data to get
canonical URLs, Open Graph and Twitter cards.
