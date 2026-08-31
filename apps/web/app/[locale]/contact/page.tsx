import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { ContactForm } from "@/components/legal/contact-form";
import { LegalPage } from "@/components/legal/legal-page";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta.contact");

  return buildMetadata({
    locale,
    pathname: "/contact",
    title: t("title"),
    socialTitle: t("socialTitle"),
    description: t("description"),
  });
}

export default async function ContactPage() {
  const t = await getTranslations("legal.contact");

  return (
    <LegalPage eyebrow={t("eyebrow")} title={t("title")}>
      <p>{t("intro")}</p>
      <ContactForm />
    </LegalPage>
  );
}
