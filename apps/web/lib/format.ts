import type { useFormatter } from "next-intl";

/** The formatter returned by `useFormatter()` / `getFormatter()`. */
export type Formatter = ReturnType<typeof useFormatter>;

/**
 * Aura is always an integer and always grouped, in whichever way the active
 * locale groups thousands: 12421 -> "12,421" in English, "12.421" in
 * Portuguese. Both come from here, never from a hardcoded separator.
 */
export function formatAura(format: Formatter, value: number) {
  return format.number(Math.trunc(value), "aura");
}

/** Engagement counts get compacted once they stop fitting a card: "1.3K". */
export function formatCount(format: Formatter, value: number) {
  return value < 10_000
    ? format.number(value, "aura")
    : format.number(value, "compact");
}

/** Clip length as it appears on a feed card: 7400 -> "0:07". */
export function formatDuration(durationMs: number) {
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
