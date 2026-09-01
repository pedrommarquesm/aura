# Aura

A mobile-first social game for farming Aura. Users post photos and videos, like content, and climb leaderboards. The social network is the game board.

The product brand is **Auraclimb**. Aura is the score and the spoken name. Naming for the store, domain, socials, and legal entity is in [docs/brand.md](docs/brand.md).

- Product spec: [docs/product-spec.md](docs/product-spec.md)
- Brand & naming: [docs/brand.md](docs/brand.md)
- Backend architecture: [docs/backend-architecture.md](docs/backend-architecture.md)
- Work plan & tracker: [docs/roadmap.md](docs/roadmap.md)
- Design tokens: [docs/design-tokens.md](docs/design-tokens.md)
- Deployment: [docs/deployment.md](docs/deployment.md)
- Internationalization: [docs/i18n.md](docs/i18n.md)

## Apps

| Path | What |
|---|---|
| [`apps/api`](apps/api) | Backend API and worker (NestJS on Fastify, Postgres, Redis) |
| [`apps/mobile`](apps/mobile) | Mobile app (Expo, React Native) |
| [`apps/web`](apps/web) | Landing page and public read-only feed (Next.js) |
| [`apps/admin`](apps/admin) | Staff backoffice (Next.js, NextAuth + React Query) |

Every PR updates at least one row in the tracker. Copy `apps/<app>/.env.example`
to `.env` for local config — secrets stay out of git ([deployment.md](docs/deployment.md)).
PRs run typecheck, lint and tests per app.

## V0 loop

**Discover → Like → Gain Aura → Climb → Post → Repeat**
