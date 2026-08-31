import { routing, type AppLocale } from "./routing";

/**
 * Narrows a BCP 47 tag to a locale we ship.
 *
 * `pt-br` must be checked before generic `pt-*`, or every Portuguese region
 * (including Portugal) lands on the Brazilian catalog. `es-*` → `es`.
 */
export function resolveViewerLocale(
  raw: string | undefined | null,
): AppLocale | undefined {
  const tag = raw?.trim().toLowerCase().replace(/_/g, "-");
  if (!tag) return undefined;
  if (tag === "pt-br" || tag.startsWith("pt-br-")) return "pt-br";
  if (tag === "pt" || tag.startsWith("pt-")) return "pt";
  if (tag === "es" || tag.startsWith("es-")) return "es";
  if (tag === "en" || tag.startsWith("en-")) return "en";
  return undefined;
}

/**
 * Rewrites `Accept-Language` so next-intl's matcher sees our locale ids.
 *
 * Without this, a header of `pt-PT` is treated as "Portuguese with a region"
 * and wins `pt-br` over European `pt`. Mapping first keeps Portugal on `/pt`.
 */
export function canonicalizeAcceptLanguage(header: string): string {
  return header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.split(";").map((segment) => segment.trim());
      if (!tag) return part.trim();
      const resolved = resolveViewerLocale(tag);
      if (!resolved) return part.trim();
      return [resolved, ...params].join(";");
    })
    .filter(Boolean)
    .join(",");
}

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return Boolean(value && routing.locales.includes(value as AppLocale));
}
