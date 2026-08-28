import { useTranslations } from "next-intl";

import { Section } from "@/components/landing/section";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui";

export function AboutPrinciples() {
  const t = useTranslations("about.principles");

  const principles = [
    { title: t("ledger.title"), body: t("ledger.body") },
    { title: t("levels.title"), body: t("levels.body") },
    { title: t("web.title"), body: t("web.body") },
  ];

  return (
    <Section eyebrow={t("eyebrow")} title={t("title")}>
      <div className="grid gap-5 md:grid-cols-3">
        {principles.map((principle) => (
          <Card key={principle.title} className="h-full">
            <CardHeader>
              <CardTitle>{principle.title}</CardTitle>
              <CardDescription>{principle.body}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </Section>
  );
}
