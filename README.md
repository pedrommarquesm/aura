# Aura

A mobile-first social game for farming Aura. Users post photos and videos, like content, and climb leaderboards. The social network is the game board.

- Product spec: [docs/product-spec.md](docs/product-spec.md)
- Backend architecture: [docs/backend-architecture.md](docs/backend-architecture.md)
- Work plan & tracker: [docs/roadmap.md](docs/roadmap.md)
- Design tokens: [docs/design-tokens.md](docs/design-tokens.md)
- Deployment: [docs/deployment.md](docs/deployment.md)

## Apps

| Path | What |
|---|---|
| [`apps/api`](apps/api) | Backend API and worker (NestJS on Fastify, Postgres, Redis) |
| [`apps/mobile`](apps/mobile) | Mobile app (Expo, React Native) |
| [`apps/web`](apps/web) | Landing page and public read-only feed (Next.js) |

Every PR updates at least one row in the tracker.

## V0 loop

**Discover → Like → Gain Aura → Climb → Post → Repeat**
