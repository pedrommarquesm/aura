/** The Aura glyph. It reads as the unit, so a number rarely needs the word. */
export const AURA_GLYPH = "🗿";

/**
 * Cosmetic progression ladder from the product spec (§20), highest first.
 *
 * The titles are deliberately English internet-culture terms and are never
 * translated (docs/i18n.md).
 */
export const AURA_LEVELS: ReadonlyArray<{ threshold: number; title: string }> = [
  { threshold: 100_000, title: "Aura God" },
  { threshold: 50_000, title: "Aura Lord" },
  { threshold: 10_000, title: "Aura Merchant" },
  { threshold: 1_000, title: "Aura Farmer" },
  { threshold: 100, title: "Aura Enjoyer" },
  { threshold: 0, title: "NPC" },
];

export function auraTitle(aura: number) {
  return AURA_LEVELS.find(({ threshold }) => aura >= threshold)?.title ?? "NPC";
}

export const MEDAL_BY_RANK: Record<number, { emoji: string; className: string }> =
  {
    1: { emoji: "🥇", className: "text-gold" },
    2: { emoji: "🥈", className: "text-silver" },
    3: { emoji: "🥉", className: "text-bronze" },
  };
