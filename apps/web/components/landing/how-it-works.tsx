import { useLocale, useTranslations } from "next-intl";

import { Section } from "@/components/landing/section";
import { sectionId } from "@/i18n/sections";

export function HowItWorks() {
  const locale = useLocale();
  const t = useTranslations("landing.howItWorks");

  const steps = [
    { label: t("steps.post.label"), body: t("steps.post.body") },
    { label: t("steps.like.label"), body: t("steps.like.body") },
    { label: t("steps.climb.label"), body: t("steps.climb.body") },
    { label: t("steps.repeat.label"), body: t("steps.repeat.body") },
  ];

  return (
    <Section
      id={sectionId(locale, "howItWorks")}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <ol className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className="flex flex-col gap-3 bg-surface p-6 transition-colors duration-(--motion-quick) ease-out hover:bg-surface-elevated"
          >
            <span
              aria-hidden
              className="aura-numerals text-caption text-aura-bright"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="text-heading">{step.label}</h3>
            <p className="text-body text-text-secondary">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
