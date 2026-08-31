import { useLocale, useTranslations } from "next-intl";

import { Section } from "@/components/landing/section";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { sectionId } from "@/i18n/sections";

export function WhatIsAura() {
  const locale = useLocale();
  const t = useTranslations("landing.whatIsAura");

  const points = [
    { title: t("points.vibe.title"), body: t("points.vibe.body") },
    { title: t("points.score.title"), body: t("points.score.body") },
    { title: t("points.fair.title"), body: t("points.fair.body") },
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
    </Section>
  );
}
