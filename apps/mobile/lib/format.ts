const decimal = new Intl.NumberFormat('en-US');

const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Aura is always shown in full — the exact number is the point of the product. */
export function formatAura(value: number): string {
  return decimal.format(Math.trunc(value));
}

/** Like and follower counts are shown compact once they get long. */
export function formatCount(value: number): string {
  return value < 10_000 ? decimal.format(value) : compact.format(value);
}

export function formatRank(rank: number): string {
  return `#${decimal.format(rank)}`;
}
