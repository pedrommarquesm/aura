# Aura — Design Tokens

Shared visual language for **mobile (NativeWind)** and **web (Tailwind)**. Both platforms must use these exact values so the product feels like one thing.

**Direction (updated for the vote & receipts redesign):** Neo-Brutalism / Digital Utilitarianism, locked in [redesign-tracker.md](./redesign-tracker.md) and [`redesign-screens/DESIGN.md`](./redesign-screens/DESIGN.md). Pure black, high contrast, flat — no gradients, no drop shadows. Aura numbers are still the loudest typography in the product; the brand's positive colour is now neon green, and Aura Debt is pure red, not a euphemism.

This is a **colour + weight** pass (`RDX-04`). Full geometry (hard 0px corners everywhere, uppercase labels, JetBrains Mono metadata) is a follow-up — see "What did not change" below.

## Color

| Token | Hex | Use |
|---|---|---|
| `bg` | `#000000` | App background. Pure black, not near-black |
| `surface` | `#121212` | Cards, sheets, inputs |
| `surface-elevated` | `#1A1A1A` | Menus, modals, pressed states |
| `border` | `#333333` | Hairlines, dividers. Use `text` (white) for a stronger divider |
| `text` | `#FFFFFF` | Primary text |
| `text-secondary` | `#A6A6A6` | Captions, metadata |
| `text-muted` | `#6B6B6B` | Placeholders, disabled |
| `aura` | `#00FF00` | **The brand.** Same hex as `success` on purpose — one positive colour, not two that drift apart |
| `aura-bright` | `#5CFF5C` | Hover/press |
| `aura-deep` | `#00B300` | Pressed primary |
| `success` | `#00FF00` | Positive vote amount, Aura gained, "Certified" |
| `danger` | `#FF0000` | Negative vote amount, **Aura Debt**, destructive actions, errors |
| `super` | `#FF8A00` | Super Like — V1, parked (`RDX-60`) |
| `gold` / `silver` / `bronze` | `#FACC15` / `#CBD5E1` / `#D97706` | Leaderboard ranks 1–3, unchanged |

There is no more signature gradient. The design system is strictly flat (see `DESIGN.md` "Elevation & Depth"). `AuraGradient` / `bg-aura-gradient` still exist as call sites but now paint solid `aura` green — ripping them out is separate cleanup, not this pass.

## Typography

System stack (`SF Pro` on iOS, `Roboto` on Android, `Inter` on web). `DESIGN.md` calls for **Inter** pushed to extremes plus **JetBrains Mono** for metadata/labels — neither font is bundled yet, so this pass raises weight on the existing stack rather than swapping fonts. Uppercase headers/labels are also a follow-up, not applied globally in this pass.

| Token | Size / Line | Weight | Use |
|---|---|---|---|
| `display` | 40 / 44 | **900** (was 800) | Aura totals, the vote slider's floating number |
| `title` | 28 / 34 | **800** (was 700) | Screen titles |
| `heading` | 20 / 26 | 700 | Section headers |
| `body` | 16 / 22 | 400 | Captions, general |
| `label` | 14 / 18 | 600 | Buttons, tabs, metadata |
| `caption` | 12 / 16 | 500 | Timestamps, helper text |
| `numeric` | varies | 900 | **Aura counts. Tabular figures, tight tracking (-0.02em).** |

Aura numbers always use tabular figures so animated counters do not jitter as digits change.

## Spacing

4pt base: `1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64`

Screen gutter: 16. Feed cards are full-bleed width on mobile.

## Radius

| Token | Value | Was |
|---|---|---|
| `sm` | **0** | 8 |
| `md` | **0** | 12 |
| `lg` | **4** (cards, media) | 16 |
| `xl` | **8** (sheets) | 24 |
| `full` | 999 (pills, standard avatars, Create button) | unchanged |

Sharper across the board, but `lg`/`xl` stop short of a hard 0 so existing full-bleed media cards and sheets do not need a structural change in this pass. `full` stays for circular avatars — **square avatars are receipts and the ledger only** (Q16), not a global shape change. A stricter all-0 pass is a follow-up once the rest of the screens are audited against it.

## Motion

Feel fast. Nothing important waits on the network. Unchanged by this pass — Neo-Brutalism does not forbid animation, only decorative shadow/gradient depth.

| Token | Duration | Curve |
|---|---|---|
| `instant` | 100ms | ease-out — press feedback |
| `quick` | 200ms | ease-out — most transitions |
| `smooth` | 320ms | spring(damping 18, stiffness 220) — sheets, cards |
| `celebrate` | 900ms | spring(damping 11, stiffness 140) — earned moments |
| `burst` | 560ms | overlay receipt: starts at release and waves up |
| `rise` | 1200ms | `+Aura` / `−Aura` float |

Vote animation: the slider's floating number scales and rises on `celebrate` / `rise` the same way the old like's `+Aura` did — see `RDX-31`/`RDX-35` in [redesign-tracker.md](./redesign-tracker.md) for the exact up/down haptic and motion split.

## Elevation

**Strictly flat.** No shadows, blurs, or gradients (`DESIGN.md`). Depth comes from surface lightness (`bg` → `surface` → `surface-elevated`) and outline contrast, not glow. The old Aura-coloured glow (`shadowColor` on Create, rank-up, Aura-gained moments) still exists in code and now renders green-on-black instead of violet-on-near-black; removing it in favour of pure outline contrast is a follow-up, not blocking this pass.

## Iconography

Outline icons, 1.75px stroke, 24px default. Filled only for active state. `DESIGN.md` calls for squared-off terminals on icon paths — not yet swapped; existing rounded-terminal icon sets stay until that pass. The 🗿 moai like marker is retired with the like button; the vote slider's live score is the equivalent "unit marker" now — plain signed numerals, no glyph.

## What did not change in this pass

- Font families (Inter/JetBrains Mono are not bundled)
- Global uppercase text-transform on headers/labels
- A hard 0px radius everywhere (`sm`/`md` only)
- Removing shadow-based glow in favour of pure outline depth
- Square avatars outside receipts/ledger (Q16)

Track that follow-up work under `RDX-04` in [redesign-tracker.md](./redesign-tracker.md) if it gets picked up as its own slice.
