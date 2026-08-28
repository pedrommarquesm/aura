import type { Formats } from "next-intl";

/**
 * Global formats, so a number is never assembled by hand. English groups
 * thousands with "," and Portuguese with ".", and both come out of the same
 * call: 12421 -> "12,421" / "12.421".
 */
export const formats = {
  number: {
    /** Aura is an integer and always grouped. */
    aura: { maximumFractionDigits: 0 },
    /** Engagement counts once they stop fitting a card: "1.3K" / "1,3 mil". */
    compact: { notation: "compact", maximumFractionDigits: 1 },
  },
} satisfies Formats;
