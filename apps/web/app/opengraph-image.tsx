import { type AppLocale, routing } from "@/i18n/routing";
import { staticTranslator } from "@/i18n/static";
import {
  OG_IMAGE_CONTENT_TYPE,
  OG_IMAGE_SIZE,
  renderOgImage,
} from "@/lib/og-image";
import { siteConfig } from "@/lib/site";

export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

type Params = { params: Promise<{ locale?: AppLocale }> };

/**
 * An image route renders outside the React tree, so the locale comes from the
 * segment and the copy from the catalog directly. `alt` lives here rather than
 * in a static export because it differs per locale.
 *
 * Next.js also calls this without a `[locale]` while enumerating the route's
 * own static params; pages always pass one, so the rendered `og:image:alt` is
 * localized either way.
 */
export async function generateImageMetadata({ params }: Params) {
  const { locale } = await params;
  const t = staticTranslator(locale ?? routing.defaultLocale);

  return [{ id: "share", alt: t("meta.og.alt"), size, contentType }];
}

export default async function OpengraphImage({ params }: Params) {
  const { locale } = await params;
  const t = staticTranslator(locale ?? routing.defaultLocale);

  return renderOgImage({
    locale: locale ?? routing.defaultLocale,
    eyebrow: siteConfig.name,
    title: t("meta.og.title"),
    subtitle: t("meta.og.subtitle"),
  });
}
