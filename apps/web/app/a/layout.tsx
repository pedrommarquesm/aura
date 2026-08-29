import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

import { QueryProvider } from "@/lib/query/provider";
import { htmlLang } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Second root layout: share URLs live outside `[locale]` so they stay
 * unprefixed. Viewer locale still comes from the cookie / Accept-Language
 * (see i18n/request.ts).
 */
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
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  colorScheme: "dark",
};

export default async function ShareLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={htmlLang[locale]} className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh bg-bg text-text">
        <NextIntlClientProvider
          messages={{
            nav: messages.nav,
            auth: messages.auth,
            common: messages.common,
            errors: messages.errors,
            feed: messages.feed,
            post: messages.post,
            landing: messages.landing,
          }}
        >
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
