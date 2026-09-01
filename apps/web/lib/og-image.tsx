import { ImageResponse } from "next/og";

import type { AppLocale } from "@/i18n/routing";
import { staticFormatter } from "@/i18n/static";

import { AURA_GLYPH } from "./aura";
import { formatAura } from "./format";
import { siteConfig } from "./site";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 };
export const OG_IMAGE_CONTENT_TYPE = "image/png";

type OgImageInput = {
  /**
   * Passed explicitly: an image route renders outside the `[locale]` segment,
   * so it cannot read the locale from root params.
   */
  locale: AppLocale;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  aura?: number;
};

/**
 * Shared Open Graph frame. Public post pages reuse this with the creator's
 * handle and Aura, so share cards stay consistent across the site.
 */
export function renderOgImage({
  locale,
  eyebrow = siteConfig.name,
  title,
  subtitle,
  aura,
}: OgImageInput) {
  const format = staticFormatter(locale);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          backgroundColor: "#000000",
          backgroundImage:
            "radial-gradient(circle at 15% 0%, #00B300 0%, rgba(0,179,0,0) 55%), radial-gradient(circle at 100% 100%, #00FF00 0%, rgba(0,255,0,0) 50%)",
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: 28,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#A78BFA",
          }}
        >
          <span>{AURA_GLYPH}</span>
          <span>{eyebrow}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              maxWidth: "900px",
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 34, color: "#A1A1AA", maxWidth: "860px" }}>
              {subtitle}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 32,
            color: "#A1A1AA",
          }}
        >
          <span>{siteConfig.url.replace(/^https?:\/\//, "")}</span>
          {aura === undefined ? null : (
            <span style={{ color: "#FFFFFF", fontWeight: 800 }}>
              {AURA_GLYPH} {formatAura(format, aura)}
            </span>
          )}
        </div>
      </div>
    ),
    OG_IMAGE_SIZE,
  );
}
