# Aura — Product & Technical Specification

## 1. Introdução

**Aura** é uma rede social mobile centrada numa ideia simples: **farmar Aura**.

Os utilizadores publicam fotos e vídeos, recebem likes e competem entre si para subir nos leaderboards. O twist é que o utilizador não é apenas um creator: também participa como **voter/curator**, e a sua capacidade de identificar conteúdo com potencial influencia o peso dos seus votos.

O produto combina:

- Social feed
- Short-form photo/video content
- Gamification
- Leaderboards
- Competition
- Reputation
- Viral sharing

A inspiração visual é principalmente **Instagram**, mas a experiência deve parecer mais rápida, divertida e orientada para competição.

### Propósito

O objetivo do produto é criar um loop extremamente simples e viciante:

> **Discover → Like → Gain/award Aura → Climb → Compete → Post → Repeat**

A qualidade da UX é um requisito central do produto. O feed deve ser rápido, visualmente apelativo, fluido e responsivo. **A sensação de utilização — especialmente no mobile — é uma das principais vantagens competitivas da app.**

---

# 2. Product Principles

## 2.1 Mobile-first

O produto principal é a app mobile.

**iOS + Android**

A web existe principalmente para:

- Landing / acquisition
- SEO
- Public sharing
- Visualização básica do produto

Publicar continua a ser na app. Dar like — atribuir Aura — funciona na web e na app.

## 2.2 UX acima de features

É preferível ter menos funcionalidades com uma execução excelente do que uma app cheia de features medíocres.

Prioridades:

1. Performance
2. Smooth scrolling
3. Fast interactions
4. Excellent animations
5. Clear visual hierarchy
6. Zero-friction posting
7. Immediate feedback
8. Strong social/game feedback

## 2.3 The app should feel alive

Cada interação importante deve ter feedback visual.

Exemplos:

- Like → animation imediata
- Aura ganho → number animation
- Rank change → visual feedback
- Super Like → stronger animation
- Battle win → celebratory state
- Challenge win → reward animation

---

# 3. Platform Scope

## 3.1 Web

A web application tem duas responsabilidades principais:

### A. Landing page

Objetivo:

- Explicar Aura em segundos
- Mostrar o conceito
- Demonstrar conteúdo
- Converter visitantes para mobile app

Sections:

- Hero
- What is Aura?
- How it works
- Trending content
- Leaderboard preview
- Download CTA

CTA principal:

> **Get the Aura app**

A landing page deve ser extremamente visual e rápida.

### B. Basic web feed

A web também terá um feed público simplificado.

Características:

- Visualização de posts
- Trending content
- Basic leaderboard
- User profiles públicos
- Shareable post URLs
- Deep links para abrir a app
- Sign in with Google (see the feed, claim a username, like posts)
- TanStack Query for the client cache: RSC hydrates the first page; likes
  mutate feed, trending, and the share permalink from the same keys

**Não haverá upload na web.**

**Não haverá upload na web.**

Não implementar:

- Post creation
- Camera
- Video upload
- Battles
- Full interaction model
- Full notifications

A web é essencialmente uma superfície de **discovery + acquisition + sharing**.

---

# 4. Mobile App

## 4.1 Technology

### React Native

Uma única codebase para:

- iOS
- Android

Preferencialmente usar **Expo + Expo Router**, salvo requisito técnico que justifique React Native CLI.

### Styling

**NativeWind / Tailwind CSS**

Usar Tailwind para:

- Layout
- Spacing
- Typography
- Colors
- Responsive variants
- Component composition

### Component library

Avaliar uma abordagem baseada em:

- **React Native Reusables / shadcn-style components**
- NativeWind
- Radix-inspired API patterns quando aplicável

Não tentar portar componentes web literalmente para React Native.

A prioridade é manter uma linguagem visual consistente e componentes altamente customizáveis.

### Recommended supporting libraries

Considerar:

- **React Query / TanStack Query** — server state, caching e pagination
- **Zustand** — pequeno estado global/client state
- **React Hook Form + Zod** — forms/validation
- **React Native Reanimated** — animations
- **React Native Gesture Handler** — gestures
- **FlashList** — high-performance lists
- **Expo Image** — optimized image loading/caching
- **Expo Video** ou equivalente — performant video playback
- **Expo Haptics** — tactile feedback
- **Expo Notifications** — push notifications

As dependências devem ser adicionadas apenas quando resolvem um problema concreto.

---

# 5. Mobile Information Architecture

Primary navigation:

```text
┌───────────────────────────────┐
│                               │
│          APP CONTENT          │
│                               │
├───────────────────────────────┤
│  Home   Discover   +   Rank   Me
└───────────────────────────────┘
```

Suggested tabs:

### Home

Personalized/trending feed.

### Discover

Trending / challenges / battles / discovery.

### Create

Central primary action.

### Leaderboard

Global + relevant rankings.

### Profile

User profile, Aura, posts and stats.

The exact navigation can be adjusted during UX implementation, but **Create should be visually prominent**.

---

# 6. Feed — Core Product Experience

O feed é a feature mais importante da aplicação.

**Se o feed não for excelente, a app não funciona.**

## 6.1 Feed requirements

Must have:

- Infinite scroll
- Cursor-based pagination
- Smooth scrolling
- Optimized image loading
- Optimized video loading
- Prefetching
- Pull to refresh
- Skeleton/loading states
- Error/retry states
- Empty states
- Optimistic likes
- Immediate interaction feedback

## 6.2 Pagination

Nunca carregar todos os posts.

Usar:

> Cursor-based pagination

Exemplo conceptual:

```text
GET /feed?cursor=abc&limit=10
```

Response:

```json
{
  "items": [],
  "nextCursor": "xyz",
  "hasMore": true
}
```

O cliente deve começar a carregar a próxima página **antes de o utilizador chegar ao fim da lista**.

## 6.3 Feed rendering

Para listas longas:

**FlashList** ou equivalente de alta performance.

Evitar:

- Nested ScrollViews desnecessários
- Heavy re-renders
- Layout recalculation excessivo
- Re-render de todos os posts após um like
- Large JS objects mantidos desnecessariamente na memória

Cada feed item deve ser o mais independente possível.

---

# 7. Feed UX

## 7.1 Visual direction

Inspirado no Instagram:

- Full-width media
- Strong imagery
- Minimal chrome
- Rounded surfaces quando apropriado
- Clear typography
- Bottom navigation
- Familiar interaction patterns

Mas com uma identidade própria baseada em **Aura**.

O número de Aura deve ser visualmente importante.

Example:

```text
@username
🗿 12,421 Aura

[ IMAGE / VIDEO ]

❤️ 1,284
💬 83
↗ Share
```

## 7.2 Like interaction

O like deve ser uma interação **delightful**, não apenas uma alteração de ícone.

Possible interaction:

```text
Tap
 ↓
Heart scale animation
 ↓
Haptic feedback
 ↓
Aura number increments
 ↓
Small "+Aura" feedback
```

Double-tap (app) / double-click (web) on the media:

> Like + stronger visual animation (a heart burst on the photo). Already
> liked replays the burst and does not unlike. The heart button still toggles.
> Guests are sent to sign-in with the pending like.

Long press pode ficar reservado para futuras interações.

## 7.3 Optimistic interaction

Likes devem ser optimistic.

Ao tocar:

1. UI muda imediatamente
2. Animation começa imediatamente
3. Backend request acontece em background
4. Failure → rollback + subtle error state

O utilizador nunca deve sentir que está à espera da API para dar like.

---

# 8. Video Experience

Vídeo é conteúdo de primeira classe.

## Requirements

- Autoplay quando entra na viewport
- Pause quando sai
- Muted by default
- Tap to toggle sound
- Preload do próximo conteúdo
- Poster/thumbnail
- Progress indicator opcional
- Fast first frame

Nunca carregar vários vídeos completos em simultâneo.

Apenas os conteúdos próximos da viewport devem estar preparados para reprodução.

---

# 9. Feed Recommendation

### V0

Não construir machine learning.

Usar regras simples:

**Latest**

```text
createdAt DESC
```

**Trending**

Baseado em:

```text
Aura gained
+
engagement
+
velocity
+
recency
```

Conceptualmente:

```text
score =
    auraVelocity
    × recencyFactor
    × engagementFactor
```

O algoritmo deve ser facilmente ajustável no backend.

---

# 10. Posting

Posting acontece **apenas na mobile app**.

Flow:

```text
Create
 ↓
Camera / Gallery
 ↓
Preview
 ↓
Caption
 ↓
Post
 ↓
Upload
 ↓
Published
```

Requirements:

- Camera
- Photo picker
- Video picker
- Preview
- Crop/basic adjustments
- Caption
- Upload progress
- Retry failed upload
- Cancel upload
- Publish confirmation

V0 ships the photo library path first (`Choose photo`). The camera control stays on the create screen but is disabled until capture is wired. Video picker is MEDIA-06. The app shrinks the photo on device before the PUT — targets and the parallel pipeline are in [client-media.md](./client-media.md).

O upload deve ser tratado como um fluxo assíncrono e resiliente.

---

# 11. Aura System

Aura é a moeda/score principal do produto.

## Base mechanic

Um like gera Aura para o creator.

Mas:

> **O valor do like depende do Vote Power de quem vota.**

Example:

```text
User A
Aura: 500
Vote Power: 1.0x

User B
Aura: 25,000
Vote Power: 2.4x
```

Um like de B vale mais do que um like de A.

O multiplicador deve ter:

- Diminishing returns
- Maximum cap
- Anti-abuse controls

---

# 12. Voter / Curator System

O utilizador não é apenas um creator.

É também um **curator**.

Quando dá like, está implicitamente a dizer:

> "Este conteúdo tem Aura."

Se os seus votos consistentemente identificarem conteúdo que posteriormente tem bom desempenho, o utilizador ganha **Aura Sense**.

## Aura Sense

Metric representing prediction quality.

Example:

```text
Aura Sense
91%
```

A performance do votante pode influenciar:

```text
Vote Power
```

Isto cria duas formas de competir:

### Creator

> Fazer conteúdo com Aura.

### Curator

> Encontrar conteúdo com Aura antes dos outros.

---

# 13. Voter Rewards

Dar likes deve ter valor para quem vota.

O sistema deve recompensar utilizadores que identificam conteúdo de qualidade.

Conceptualmente:

```text
Like
 ↓
Post performs well
 ↓
Voter receives Aura reward
 ↓
Aura Sense increases
 ↓
Vote Power increases
```

Isto cria um incentivo para:

- Consumir feed
- Descobrir conteúdo
- Dar likes
- Voltar para verificar resultados

---

# 14. Super Like

Limited daily resource.

Example:

```text
❤️ Like

🔥 Super Like
3 available today
```

Super Like:

- Vale mais Aura para creator
- Tem maior impacto na prediction
- Pode gerar maior reward para voter

O número disponível deve ser configurável remotamente.

---

# 15. Leaderboards

Core competitive surface.

### Global

Top Aura users.

### Country

Ranking por país.

### City

Ranking por cidade.

### Friends / Following

Ranking da social graph.

### Weekly

Aura earned during current week.

### Season

Ranking da season atual.

Example:

```text
🥇 @alice     82,421
🥈 @john      79,301
🥉 @maria     72,120
...
#47 @you       8,421
```

O próprio utilizador deve conseguir ver a sua posição mesmo quando está fora do Top 100.

---

# 16. Aura Battles

Two posts compete directly.

```text
WHO HAS MORE AURA?

       VS

   POST A     POST B

      [ VOTE ]
```

Após votação:

```text
POST A
73%

POST B
27%
```

Rewards:

- Winner Aura
- Voter reward
- Aura Sense impact

Battles devem ser rápidos e altamente visualizados.

---

# 17. Daily Challenges

Daily prompt para gerar conteúdo.

Examples:

- Most Aura
- Most Unbothered
- Biggest Flex
- Main Character
- Coldest Aura
- Absolute Cinema

Flow:

```text
Challenge
 ↓
Create post
 ↓
Community votes
 ↓
Leaderboard
 ↓
Rewards
```

Challenges resolvem também o problema:

> "What should I post?"

---

# 18. Seasons

Aura deve ter:

### Lifetime Aura

Permanent metric.

### Season Aura

Competitive metric que reinicia no início de cada season.

Example:

```text
SEASON 01

21 days remaining

#14 @pedro
18,421 Season Aura
```

No final:

- Winners
- Badges
- Titles
- Historical records

---

# 19. Profiles

Profile deve parecer mais um **competitive identity card** do que apenas uma galeria.

```text
@pedro

🗿 28,421 Aura
#42 Global

🧠 Aura Sense 91%
⚡ Vote Power 3.4x

Aura Lord

[Posts]
```

Mostrar:

- Avatar
- Username
- Aura
- Rank
- Aura Sense
- Vote Power
- Current title
- Streak
- Posts
- Best performing post

---

# 20. Levels / Titles

Cosmetic progression.

Example:

```text
0         NPC
100       Aura Enjoyer
1,000     Aura Farmer
10,000    Aura Merchant
50,000    Aura Lord
100,000   Aura God
```

Titles devem aparecer junto ao username em contextos relevantes.

---

# 21. Social

V1:

- Follow
- Followers
- Following feed
- Comments
- Share

Não implementar DMs inicialmente.

---

# 22. Notifications

Notifications devem ser orientadas para **competition + Aura**, não apenas social activity.

Examples:

```text
🔥 You gained 127 Aura

🗿 You moved to #84

⚔️ Your post entered an Aura Battle

🏆 You won today's challenge

👑 You're now #1 in Lisbon

🧠 Your Aura Sense increased
```

Agrupar eventos quando possível.

Não enviar uma push notification por cada like.

---

# 23. Sharing / Viral Loop

Cada post deve ter uma URL pública.

Web:

```text
/a/username/post/postId
```

Quando alguém abre:

1. Vê o post
2. Vê Aura
3. Vê creator
4. CTA para instalar app

Share targets:

- Instagram Stories
- TikTok
- WhatsApp
- Native share sheet
- Copy link

Shared content deve funcionar como aquisição orgânica.

---

# 24. Moderation & Anti-Abuse

Obrigatório antes do lançamento.

### User

- Block
- Report
- Suspend
- Ban

### Content

- Report
- Remove
- NSFW detection (TS-11, **on hold** — third-party classifier on the media worker; see architecture §6.5)
- Spam detection

### Aura abuse

Precisamos de proteger:

- Fake likes
- Like rings
- Bot accounts
- Multiple accounts
- Self-voting
- Coordinated farming
- Automated interactions

Todas as alterações de Aura devem passar pelo **Aura Event system**.

---

# 25. Aura Event System

Aura não deve ser apenas um contador.

Manter um ledger de eventos:

```text
AuraEvent

id
userId
sourceUserId
postId
type
amount
createdAt
```

Types:

```text
LIKE
SUPER_LIKE
BATTLE_WIN
CHALLENGE
VOTER_REWARD
BONUS
REVERSAL
```

Isto permite:

- Auditing
- Fraud investigation
- Rollbacks
- Analytics
- Debugging
- Recalculation

---

# 26. Backend/API Requirements

API deve suportar:

### Auth

```text
POST /auth/signup
POST /auth/login
```

### Feed

```text
GET /feed
GET /feed/trending
GET /feed/following
```

Cursor pagination obrigatório.

### Posts

```text
POST /posts
GET /posts/:id
DELETE /posts/:id
GET /hashtags/:tag
```

### Likes

```text
POST /posts/:id/like
DELETE /posts/:id/like
POST /posts/:id/super-like
```

### Users

```text
GET /users/:username
GET /users/:id/posts
POST /users/:id/follow
DELETE /users/:id/follow
```

### Leaderboards

```text
GET /leaderboards/global
GET /leaderboards/country
GET /leaderboards/city
GET /leaderboards/season
```

### Battles

```text
GET /battles
POST /battles/:id/vote
```

### Challenges

```text
GET /challenges
POST /challenges/:id/entries
```

### Notifications

```text
GET /notifications
POST /notifications/:id/read
```

---

# 27. Performance Requirements

Performance is a product requirement.

### Feed

Target:

- 60 FPS scrolling
- Minimal dropped frames
- Immediate touch feedback
- Optimistic interactions
- No visible pagination loading in normal use

### Media

- Responsive image sizes
- CDN
- Image caching
- Video transcoding
- Thumbnails/posters
- Lazy loading
- Prefetch next content

### Network

- Cursor pagination
- Request deduplication
- Query caching
- Optimistic updates
- Retry strategy
- Offline-friendly mutations where practical

---

# 28. Analytics

Track the complete Aura loop.

### Acquisition

```text
landing_view
app_install
signup
```

### Content

```text
post_created
post_viewed
post_shared
```

### Engagement

```text
like
super_like
comment
follow
battle_vote
challenge_entry
```

### Aura

```text
aura_received
aura_given
rank_changed
aura_sense_changed
```

### Retention

```text
session_started
session_duration
posts_per_session
likes_per_session
return_next_day
return_next_week
```

---

# 29. North Star Metric

Primary product metric:

## Aura Actions / Active User / Day

An Aura Action is:

- Posting
- Liking
- Super Liking
- Voting in Battles
- Participating in Challenges

The goal is to measure whether users are actively participating in the Aura game.

Supporting metrics:

- D1 / D7 / D30 retention
- Posts per active user
- Likes per active user
- Aura earned per session
- Sessions per user
- Feed completion rate
- Share rate
- Challenge participation
- Battle participation

---

# 30. V0 Scope

The V0 exists to validate the core loop.

### Must have

- Mobile auth
- Profile
- Photo/video upload
- Post
- Feed
- Infinite scroll
- Likes
- Aura
- Basic Aura ledger
- Global leaderboard
- Basic web landing
- Basic web feed
- Public post URLs

### Explicitly out of scope

- Aura Battles
- Daily Challenges
- Seasons
- Aura Sense
- Vote Power
- Super Likes
- Comments
- Following
- Advanced notifications
- Complex recommendation algorithm
- Crypto
- Monetization

V0 goal:

> **Can users understand Aura immediately and do they come back because they want to climb?**

---

# 31. V1 Launch Scope

### Core

- Everything in V0
- Following
- Comments
- Notifications
- Sharing
- Trending feed

### Competition

- Vote Power
- Aura Sense
- Voter rewards
- Super Likes
- Aura Battles
- Daily Challenges
- Seasons
- Levels/titles
- Multiple leaderboards

### UX

- Premium feed animations
- Haptics
- Optimistic interactions
- Smooth media transitions
- Video autoplay
- Advanced loading states
- Excellent upload experience

### Trust & Safety

- Reports
- Blocking
- Moderation
- Anti-spam
- Anti-fraud
- Aura manipulation protection
- Admin dashboard

### Analytics

- Full event tracking
- Product funnel
- Retention
- Feed analytics
- Aura economy analytics

---

# 32. Launch Quality Bar

Aura should **not launch because all features exist**.

It should launch when the core experience feels excellent.

Minimum quality bar:

### Feed

> Feels as smooth as a top-tier social app.

### Like

> Feels satisfying.

### Aura

> Immediately understandable.

### Leaderboard

> Makes users want to climb.

### Posting

> Takes seconds, not minutes.

### Competition

> Gives users a reason to come back.

### Sharing

> Makes the product discoverable outside the app.

### Performance

> No obvious jank, lag or unnecessary loading.

---

# 33. Core Product Loop

The product should ultimately feel like this:

```text
                ┌─────────────┐
                │   DISCOVER  │
                └──────┬──────┘
                       ↓
                ┌─────────────┐
                │    LIKE     │
                └──────┬──────┘
                       ↓
             ┌───────────────────┐
             │ CREATOR GAINS     │
             │       AURA        │
             └─────────┬─────────┘
                       ↓
                ┌─────────────┐
                │ LEADERBOARD │
                └──────┬──────┘
                       ↓
                ┌─────────────┐
                │  COMPETE    │
                └──────┬──────┘
                       ↓
                ┌─────────────┐
                │    POST     │
                └──────┬──────┘
                       ↓
                      🔁
```

Parallel loop:

```text
LIKE
  ↓
PREDICTION
  ↓
POST PERFORMS WELL
  ↓
VOTER REWARD
  ↓
AURA SENSE ↑
  ↓
VOTE POWER ↑
  ↓
BETTER VOTES
  ↓
MORE AURA
```

This second loop is what makes Aura fundamentally different from a conventional social network.

---

# 34. Guiding Principle

> **Aura is not a social network with gamification.**
>
> **Aura is a social game where the social network is the game board.**

Every feature should reinforce that idea.

If a feature doesn't improve one of these:

- Discover
- Create
- Vote
- Compete
- Gain Aura
- Climb
- Return

it should probably not be in the first release.
