# Aura — mobile app

React Native app built with Expo (SDK 57) and Expo Router. This is the product; web is
landing, sharing and a read-only feed.

## Running it

```bash
npm install
cp .env.example .env   # optional: the app runs on mock data without it
npm start
```

`apps/mobile` is intentionally self-contained and installable on its own. Workspace
wiring, shared TypeScript config and a `packages/contracts` for shared types are a
separate task (`FND-03`, `FND-04`).

## Checks

```bash
npm run typecheck
npm run lint
npm run format:check
npx expo export --platform all   # bundles all three platforms
```

## Layout

```text
app/                    Expo Router routes
  _layout.tsx           providers: gesture handler root, safe area, TanStack Query
  (tabs)/               Home · Discover · Create · Rank · Profile
components/
  ui/                   primitives: Text, Button, Avatar, Card, Skeleton, AuraValue
  feed/                 feed card, skeleton, like animation
  layout/               Screen, ScreenHeader
  navigation/           the elevated Create button
lib/
  api/                  typed client, auth interceptor, single-flight refresh
  query/                QueryClient defaults, provider, query keys
  cn · format · haptics · secure-storage
store/                  Zustand: session, preferences
theme/                  tokens.js (single source) + typed motion/glow helpers
mocks/                  stand-in data until the API exists
```

## Design tokens

`theme/tokens.js` is the single source of truth. `tailwind.config.js` builds its theme
from it, so screens use named utilities (`bg-aura`, `text-display`, `rounded-lg`,
`px-gutter`) and never a raw hex value. The same file is imported by TypeScript for the
places Tailwind cannot reach — navigator options, gradient stops, native shadow colours,
Reanimated configs.

These values are shared with the web app. Changing one means changing both.

Depth comes from surface lightness, not drop shadows. The only shadow is the Aura glow in
`theme/glow.ts`, and it is reserved for earned moments and for Create.

## Data layer

The API does not exist yet (`API-01`), so `EXPO_PUBLIC_API_URL` points at a placeholder
and screens read from `mocks/`. The mock shapes match the documented feed card, so
swapping in `fetchFeedPage` is a one-line change per screen.

The one non-obvious piece is the refresh interceptor in `lib/api/client.ts`: the backend
rotates refresh tokens and revokes the whole family if one is replayed, so all concurrent
401s must funnel through a single refresh call. See the comment there.

## Known gaps

- No auth screens yet (`MOB-10`, `MOB-11`); the session store is the holder they plug into.
- Video playback is not wired. `expo-video` arrives with `MOB-32`.
- Preferences are in memory only — persistence needs a storage decision (`FND-06`).
- Mock media uses `picsum.photos`, so the placeholder feed needs a network connection to
  show images.
