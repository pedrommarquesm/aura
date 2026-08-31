import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LegalPage } from "@/components/legal/legal-page";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta.faq");

  return buildMetadata({
    locale,
    pathname: "/faq",
    title: t("title"),
    socialTitle: t("socialTitle"),
    description: t("description"),
  });
}

export default async function FaqPage() {
  const t = await getTranslations("legal.faq");
  const keys = [
    "what",
    "gain",
    "followers",
    "lose",
    "waitlist",
    "referral",
    "port",
    "launch",
    "free",
    "age",
  ] as const;

  return (
    <LegalPage eyebrow={t("eyebrow")} title={t("title")}>
      <p>{t("intro")}</p>
      {keys.map((key) => (
        <section key={key} className="flex flex-col gap-3">
          <h2>{t(`items.${key}.q`)}</h2>
          <p>{t(`items.${key}.a`)}</p>
        </section>
      ))}
    </LegalPage>
  );
}
