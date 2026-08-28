import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Our type scale and palette share the `text-*` prefix, so tailwind-merge has to
 * be told which is which — otherwise `text-label text-text-muted` looks like two
 * competing colours and the size is dropped. Keep in sync with globals.css.
 */
const FONT_SIZES = [
  "display",
  "title",
  "heading",
  "body",
  "label",
  "caption",
] as const;

const COLORS = [
  "bg",
  "surface",
  "surface-elevated",
  "border",
  "text",
  "text-secondary",
  "text-muted",
  "aura",
  "aura-bright",
  "aura-deep",
  "like",
  "super",
  "gold",
  "silver",
  "bronze",
  "success",
  "danger",
] as const;

const twMerge = extendTailwindMerge({
  override: {
    classGroups: {
      "font-size": [{ text: [...FONT_SIZES] }],
      "text-color": [{ text: [...COLORS] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
