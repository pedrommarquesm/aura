const decimal = new Intl.NumberFormat("en-US");
const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Aura is always an integer and always grouped: 12421 -> "12,421". */
export function formatAura(value: number) {
  return decimal.format(Math.trunc(value));
}

/** Engagement counts get compacted once they stop fitting a card: "1.3K". */
export function formatCount(value: number) {
  return value < 10_000 ? decimal.format(value) : compact.format(value);
}

export function formatRank(rank: number) {
  return `#${decimal.format(rank)}`;
}

/** Clip length as it appears on a feed card: 7400 -> "0:07". */
export function formatDuration(durationMs: number) {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
