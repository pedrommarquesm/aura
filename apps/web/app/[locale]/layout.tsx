import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { QueryProvider } from "@/lib/query/provider";
import { htmlLang, routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/** Renders both locales at build time; see next-intl static rendering. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: t("home.title"),
      template: `%s · ${siteConfig.name}`,
    },
    description: t("home.description"),
    applicationName: siteConfig.name,
    category: "social",
    keywords: t("keywords")
      .split(",")
      .map((keyword) => keyword.trim()),
    robots: { index: true, follow: true },
    formatDetection: { telephone: false, address: false },
    appleWebApp: {
      capable: true,
      title: siteConfig.name,
      statusBarStyle: "black-translucent",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  colorScheme: "dark",
};

export default async function LocaleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={htmlLang[locale]} className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh bg-bg text-text">
        {/* QueryProvider owns session (`['me']`) and the feed/like cache. */}
        <NextIntlClientProvider
          messages={{
            nav: messages.nav,
            auth: messages.auth,
            common: messages.common,
            errors: messages.errors,
            feed: messages.feed,
            post: messages.post,
            settings: messages.settings,
            landing: messages.landing,
            legal: messages.legal,
          }}
        >
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
