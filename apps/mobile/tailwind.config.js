const { colors, radius, spacing, typography } = require('./theme/tokens');

const px = (value) => `${value}px`;

const fontSize = Object.fromEntries(
  Object.entries(typography).map(([name, token]) => [
    name,
    [px(token.fontSize), { lineHeight: px(token.lineHeight), fontWeight: token.fontWeight }],
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      fontSize,
      borderRadius: Object.fromEntries(
        Object.entries(radius).map(([name, value]) => [name, px(value)]),
      ),
      spacing: {
        gutter: px(spacing.gutter),
      },
      letterSpacing: {
        aura: '-0.02em',
      },
    },
  },
  plugins: [],
};
