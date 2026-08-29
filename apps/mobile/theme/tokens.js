/**
 * Aura design tokens — the single source of truth for the mobile app.
 *
 * `tailwind.config.js` builds its theme from this file, and TypeScript imports the
 * same values for the places Tailwind cannot reach: gradient stops, native shadow
 * colours, navigator options and Reanimated configs. Nothing in `app/` or
 * `components/` should contain a raw hex value or a magic duration.
 *
 * These values are shared with the web app and must stay identical.
 */

const colors = {
  bg: '#0A0A0F',
  surface: {
    DEFAULT: '#14141C',
    elevated: '#1E1E29',
  },
  border: '#2A2A38',
  text: {
    DEFAULT: '#FFFFFF',
    secondary: '#A1A1AA',
    muted: '#71717A',
  },
  aura: {
    DEFAULT: '#8B5CF6',
    bright: '#A78BFA',
    deep: '#6D28D9',
  },
  like: '#FF3B5C',
  super: '#FF8A00',
  gold: '#FACC15',
  silver: '#CBD5E1',
  bronze: '#D97706',
  success: '#22C55E',
  danger: '#EF4444',
};

/** The signature gradient. Every Aura surface uses these two stops, in this order. */
const gradients = {
  aura: { from: colors.aura.DEFAULT, to: colors.aura.deep },
};

/**
 * @typedef {object} TypeToken
 * @property {number} fontSize
 * @property {number} lineHeight
 * @property {'400' | '500' | '600' | '700' | '800'} fontWeight
 */

/** @type {Record<'display' | 'title' | 'heading' | 'body' | 'label' | 'caption', TypeToken>} */
const typography = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '800' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
};

const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
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
  burst: { duration: 1100 },
  rise: { duration: 1200 },
};

module.exports = { colors, gradients, typography, radius, spacing, motion };
