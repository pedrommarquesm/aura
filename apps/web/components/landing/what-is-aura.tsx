import { useLocale, useTranslations } from "next-intl";

import { Section } from "@/components/landing/section";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { sectionId } from "@/i18n/sections";

export function WhatIsAura() {
  const locale = useLocale();
  const t = useTranslations("landing.whatIsAura");

  const points = [
    { title: t("points.oneNumber.title"), body: t("points.oneNumber.body") },
    { title: t("points.likesPay.title"), body: t("points.likesPay.body") },
    { title: t("points.onRecord.title"), body: t("points.onRecord.body") },
  ];

  return (
    <Section
      id={sectionId(locale, "whatIsAura")}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-5 md:grid-cols-3">
        {points.map((point) => (
          <Card key={point.title} className="h-full">
            <CardHeader>
              <CardTitle>{point.title}</CardTitle>
              <CardDescription>{point.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <figure className="mt-12 border-l-2 border-aura pl-6 sm:mt-16">
        <blockquote className="max-w-3xl text-heading text-balance sm:text-title">
          {t("quote")}
        </blockquote>
      </figure>
    </Section>
  );
}
