import { getTranslations } from "next-intl/server";

import { ArrowRightIcon } from "@/components/icons";
import { Container } from "@/components/landing/section";

const CARD_KEYS = ["liveCheck", "slider", "ledger"] as const;

export async function FeatureCards() {
  const t = await getTranslations("landing.features");

  return (
    <section className="border-t border-border/70 py-16 sm:py-20">
      <Container>
        <div className="grid gap-4 md:grid-cols-3">
          {CARD_KEYS.map((key) => (
            <div
              key={key}
              className="group flex flex-col justify-between gap-8 border border-border bg-surface p-6"
            >
              <div className="flex flex-col gap-3">
                <p className="aura-numerals text-caption tracking-[0.18em] text-text-muted">
                  {t(`${key}.eyebrow`)}. {t(`${key}.title`).toUpperCase()}
                </p>
                <p className="text-body text-text-secondary">{t(`${key}.body`)}</p>
              </div>
              <ArrowRightIcon className="size-5 text-text-secondary transition-colors duration-(--motion-quick) ease-out group-hover:text-aura" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
