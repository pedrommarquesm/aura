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
npm run locales:check            # message catalogs: key parity, ICU, plurals
npx expo export --platform all   # bundles all three platforms
```

## Layout

```text
app/                    Expo Router routes
  _layout.tsx           providers: gesture handler root, safe area, i18n, TanStack Query
  (tabs)/               Home · Discover · Create · Rank · Profile
components/
  ui/                   primitives: Text, Button, Avatar, Card, Skeleton, AuraValue
  feed/                 feed card, skeleton, like animation
  layout/               Screen, ScreenHeader
  navigation/           the elevated Create button
  settings/             the language override
lib/
  api/                  typed client, auth interceptor, single-flight refresh
  i18n/                 i18next + ICU setup, Intl polyfills, formatting hooks
  query/                QueryClient defaults, provider, query keys
  cn · format · haptics · secure-storage
locales/                en.json · pt.json message catalogs
scripts/                check-locales.mjs
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

## Internationalization

English and European Portuguese, per the contract in [docs/i18n.md](../../docs/i18n.md).
`i18next` + `react-i18next` with `i18next-icu` for ICU MessageFormat, and
`expo-localization` for the device locale. Catalogs are `locales/en.json` and
`locales/pt.json`; keys match the web app's wherever the string means the same thing, so
merging both into one package (`FND-03`) stays mechanical.

Two rules the code enforces:

- No copy in components. Every user-facing string, including accessibility labels, comes
  from a catalog. `tsc` types `t()` against `en.json`, so a bad key fails the typecheck.
- No number built by hand. Aura values, counts and ranks go through `useFormat()` or an
  ICU number argument, because English groups thousands with `,` and Portuguese with `.`.

`Intl` is the part worth knowing about. Hermes ships different Intl implementations per
platform and a missing one does not throw — `toLocaleString` just returns the number
unformatted, which looks right in English and wrong in Portuguese. `lib/i18n/intl.ts`
installs the formatjs polyfills for `NumberFormat` and `PluralRules` (the one ICU
MessageFormat cannot work without), each guarded by its own feature check so a
full-ICU engine keeps its native implementation. Verified by running the bundled stack
on a Hermes VM with no `Intl` at all: it polyfills and prints `12.421 Aura` for `pt`.

Do not drop below React Native 0.75.1. `@formatjs/icu-messageformat-parser` builds a
regex with Unicode property escapes (`\p{White_Space}`) at module load, and Hermes only
gained support for those in 0.13 — before that this crashes at boot rather than at the
call site. RN 0.86 ships Hermes 0.17. The same applies to any `\p{…}` we write ourselves.

The language override lives in the preferences store and wins over the device. It is
in memory only until `FND-06` picks a storage adapter, so a relaunch returns to the
device language. Dates and relative times are not localized yet: nothing renders one,
and the first screen that does (`MOB-30`) needs `Intl.RelativeTimeFormat` and its own
polyfill decision.

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
- Preferences are in memory only — persistence needs a storage decision (`FND-06`). That
  includes the language override.
- Mock media uses `picsum.photos`, so the placeholder feed needs a network connection to
  show images.
