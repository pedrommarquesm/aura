import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/legal/legal-page";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta.terms");

  return buildMetadata({
    locale,
    pathname: "/terms",
    title: t("title"),
    socialTitle: t("socialTitle"),
    description: t("description"),
  });
}

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");

  const sections = ["waitlist", "aura", "content", "conduct", "privacy", "changes"] as const;

  return (
    <LegalPage eyebrow={t("eyebrow")} title={t("title")}>
      <p>{t("intro")}</p>
      {sections.map((key) => (
        <section key={key} className="flex flex-col gap-3">
          <h2>{t(`sections.${key}.title`)}</h2>
          <p>{t(`sections.${key}.body`)}</p>
        </section>
      ))}
      <p>{t("contact")}</p>
    </LegalPage>
  );
}
