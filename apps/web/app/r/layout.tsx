import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import { htmlLang, routing } from "@/i18n/routing";

import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Short referral URLs stay unprefixed (`/r/AB23CD45`). Next requires a root
 * layout outside `[locale]`; the page only redirects.
 */
export default function ReferralLayout({ children }: { children: ReactNode }) {
  return (
    <html lang={htmlLang[routing.defaultLocale]} className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh bg-bg text-text">{children}</body>
    </html>
  );
}
