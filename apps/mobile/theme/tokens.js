/**
 * Aura design tokens — the single source of truth for the mobile app.
 *
 * `tailwind.config.js` builds its theme from this file, and TypeScript imports the
 * same values for the places Tailwind cannot reach: gradient stops, native shadow
 * colours, navigator options and Reanimated configs. Nothing in `app/` or
 * `components/` should contain a raw hex value or a magic duration.
 *
 * These values are shared with the web app and must stay identical.
 *
 * Palette locked for the vote & receipts redesign
 * (docs/redesign-tracker.md, `docs/redesign-screens/DESIGN.md`):
 * Neo-Brutalism / Digital Utilitarianism. Pure black background, neon green
 * for positive Aura / gains, pure red for Aura Debt / destructive actions,
 * white content, mid-gray structural borders. Flat — no gradients, no
 * decorative glow. A full geometry pass (hard 0px corners everywhere,
 * uppercase labels, JetBrains Mono metadata) is a follow-up; this pass
 * repoints color tokens and trims radius so new surfaces (the vote slider,
 * receipts, ledger) read as sharp without breaking every existing screen's
 * spacing assumptions in one shot.
 */

/**
 * NativeWind colour/opacity utilities (`bg-bg/70`) compile to CSS variables.
 * Injecting those after the first render makes NativeWind stringify props to
 * warn about a remount — that walk hits React Navigation's throwing context
 * getters and crashes the app with "Couldn't find a navigation context".
 * Use this on `style` instead of slash-opacity class names.
 *
 * @param {string} hex
 * @param {number} alpha
 */
function withAlpha(hex, alpha) {
  const raw = hex.replace('#', '');
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const colors = {
  /** Pure black. Every surface in the redesign starts here. */
  bg: '#000000',
  surface: {
    /** Stark dark gray — secondary containers without losing the "void". */
    DEFAULT: '#121212',
    elevated: '#1A1A1A',
  },
  /** Structural lines. Use `text.DEFAULT` (white) instead for a stronger divider. */
  border: '#333333',
  text: {
    DEFAULT: '#FFFFFF',
    secondary: '#A6A6A6',
    muted: '#6B6B6B',
  },
  /**
   * The brand, and now also the vote/receipts economy's positive colour
   * (Q15: neon green = positive Aura, gains, "Certified"). `aura` and
   * `success` are intentionally the same hex — there is one positive colour
   * in this palette, not two that drift apart over time.
   */
  aura: {
    DEFAULT: '#00FF00',
    bright: '#5CFF5C',
    deep: '#00B300',
  },
  /** V1, parked (`RDX-60`). Not the vote slider — that is aura / danger only. */
  super: '#FF8A00',
  gold: '#FACC15',
  silver: '#CBD5E1',
  bronze: '#D97706',
  success: '#00FF00',
  /** Pure red. Aura Debt, negative votes, destructive actions, errors (Q15). */
  danger: '#FF0000',
};

/**
 * The old two-stop violet gradient is gone — the design system is strictly
 * flat (no gradients, no shadows/blurs; see DESIGN.md "Elevation & Depth").
 * Kept as a same-colour "gradient" only so call sites that still render
 * `<AuraGradient />` do not need a structural change in this pass; it paints
 * as a solid neon green fill.
 */
const gradients = {
  aura: { from: colors.aura.DEFAULT, to: colors.aura.DEFAULT },
};

/**
 * @typedef {object} TypeToken
 * @property {number} fontSize
 * @property {number} lineHeight
 * @property {'400' | '500' | '600' | '700' | '800' | '900'} fontWeight
 */

/**
 * Heavier than before — Neo-Brutalism leans on extreme weight and negative
 * tracking instead of colour or depth for hierarchy. `display` (Aura totals,
 * the vote slider's floating number) goes all the way to 900.
 *
 * @type {Record<'display' | 'title' | 'heading' | 'body' | 'label' | 'caption', TypeToken>}
 */
const typography = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '900' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
};

/**
 * Sharper than before. `sm` / `md` go to 0 (inputs, chips, the ledger sheet's
 * inner rows); `lg` keeps a small radius rather than 0 so existing full-bleed
 * media cards do not need a structural change in this pass. `full` stays for
 * circular avatars and pills — square avatars are receipts/ledger only
 * (docs/redesign-tracker.md Q16), not a global shape change.
 */
const radius = {
  sm: 0,
  md: 0,
  lg: 4,
  xl: 8,
  full: 999,
};

/** 4pt base. `gutter` is the horizontal padding every screen uses. */
const spacing = {
  base: 4,
  gutter: 16,
};

/**
 * Motion. Timings are for `withTiming`, springs for `withSpring`.
 *
 * `celebrate` is deliberately bouncier than `smooth` — it is only for earned
 * moments (Aura gained, rank up), never for ordinary UI transitions.
 */
const motion = {
  instant: { duration: 100 },
  quick: { duration: 200 },
  smooth: { duration: 320, damping: 18, stiffness: 220 },
  celebrate: { duration: 900, damping: 11, stiffness: 140 },
  burst: { duration: 560 },
  rise: { duration: 1200 },
};

module.exports = { colors, gradients, typography, radius, spacing, motion, withAlpha };
