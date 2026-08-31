import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { WaitlistForm } from "@/components/landing/waitlist-form";
import { Container, Eyebrow } from "@/components/landing/section";
import { JOIN_AURA, REFERRAL_AURA } from "@/lib/launch";
import { sectionId } from "@/i18n/sections";

export async function WaitlistSection() {
  const locale = await getLocale();
  const t = await getTranslations("landing.waitlist");

  return (
    <section
      id={sectionId(locale, "join")}
      className="scroll-mt-16 border-t border-border/70 py-20 sm:py-28"
    >
      <Container className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="flex max-w-xl flex-col gap-5">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h2 className="text-title text-balance sm:text-display">{t("title")}</h2>
          <p className="text-body text-text-secondary">
            {t("body", { join: JOIN_AURA, referral: REFERRAL_AURA })}
          </p>
          <ul className="flex flex-col gap-3 text-body text-text-secondary">
            <li className="flex gap-3">
              <span aria-hidden className="text-aura-bright">
                🗿
              </span>
              {t("points.join", { aura: JOIN_AURA })}
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="text-aura-bright">
                ↗
              </span>
              {t("points.share", { aura: REFERRAL_AURA })}
            </li>
            <li className="flex gap-3">
              <span aria-hidden className="text-aura-bright">
                →
              </span>
              {t("points.port")}
            </li>
          </ul>
        </div>
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-xl border border-border bg-surface" />
          }
        >
          <WaitlistForm />
        </Suspense>
      </Container>
    </section>
  );
}
