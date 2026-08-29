# Aura — Design Tokens

Shared visual language for **mobile (NativeWind)** and **web (Tailwind)**. Both platforms must use these exact values so the product feels like one thing.

Direction: dark, competitive, a bit gen-z. Instagram's clarity with a leaderboard's energy. Media is the hero — chrome stays quiet so photos and videos carry the screen. Aura numbers are the loudest typography in the product.

## Color

| Token | Hex | Use |
|---|---|---|
| `bg` | `#0A0A0F` | App background, near-black with a violet cast |
| `surface` | `#14141C` | Cards, sheets, inputs |
| `surface-elevated` | `#1E1E29` | Menus, modals, pressed states |
| `border` | `#2A2A38` | Hairlines, dividers |
| `text` | `#FFFFFF` | Primary text |
| `text-secondary` | `#A1A1AA` | Captions, metadata |
| `text-muted` | `#71717A` | Placeholders, disabled |
| `aura` | `#8B5CF6` | **The brand.** Aura values, primary actions, active tab |
| `aura-bright` | `#A78BFA` | Hover/press, glow highlights |
| `aura-deep` | `#6D28D9` | Gradient end, pressed primary |
| `like` | `#FF3B5C` | Like heart |
| `super` | `#FF8A00` | Super Like (V1) |
| `gold` | `#FACC15` | Rank 1 |
| `silver` | `#CBD5E1` | Rank 2 |
| `bronze` | `#D97706` | Rank 3 |
| `success` | `#22C55E` | Rank up, positive delta |
| `danger` | `#EF4444` | Errors, rank down |

Signature gradient (Aura glow): `#8B5CF6 → #6D28D9`, used sparingly for the Create button, rank badges, and CTAs.

## Typography

System stack (`SF Pro` on iOS, `Roboto` on Android, `Inter` on web).

| Token | Size / Line | Weight | Use |
|---|---|---|---|
| `display` | 40 / 44 | 800 | Aura totals on profile, landing hero |
| `title` | 28 / 34 | 700 | Screen titles |
| `heading` | 20 / 26 | 700 | Section headers |
| `body` | 16 / 22 | 400 | Captions, general |
| `label` | 14 / 18 | 600 | Buttons, tabs, metadata |
| `caption` | 12 / 16 | 500 | Timestamps, helper text |
| `numeric` | varies | 800 | **Aura counts. Tabular figures, tight tracking (-0.02em).** |

Aura numbers always use tabular figures so animated counters do not jitter as digits change.

## Spacing

4pt base: `1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64`

Screen gutter: 16. Feed cards are full-bleed width on mobile.

## Radius

| Token | Value |
|---|---|
| `sm` | 8 |
| `md` | 12 |
| `lg` | 16 (cards, media) |
| `xl` | 24 (sheets) |
| `full` | 999 (pills, avatars, Create button) |

## Motion

Feel fast. Nothing important waits on the network.

| Token | Duration | Curve |
|---|---|---|
| `instant` | 100ms | ease-out — press feedback |
| `quick` | 200ms | ease-out — most transitions |
| `smooth` | 320ms | spring(damping 18, stiffness 220) — sheets, cards |
| `celebrate` | 900ms | spring(damping 11, stiffness 140) — like burst, rank change |
| `burst` | 1100ms | overlay heart on the photo |
| `rise` | 1200ms | `+Aura` float |

Like animation: heart scales `1 → 1.35 → 1` on `celebrate`, haptic fires at peak, `+Aura` floats up and fades over `rise` (1200ms). The photo overlay lasts `burst` (1100ms).

## Elevation

Dark UI, so depth comes from surface lightness and glow rather than drop shadows. Aura-colored glow (`#8B5CF6` at 30% opacity, 20px blur) is reserved for **earned** moments — rank up, Aura gained, Create. Do not use it as decoration; it stops meaning anything.

## Iconography

Outline icons, 1.75px stroke, 24px default. Filled only for active state. The 🗿 moai is the Aura unit marker and appears next to Aura values.
