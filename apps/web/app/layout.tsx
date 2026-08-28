import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  ...buildMetadata(),
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  applicationName: siteConfig.name,
  category: "social",
  keywords: [
    "Aura",
    "social game",
    "leaderboard",
    "photo sharing",
    "short video",
  ],
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, address: false },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-dvh bg-bg text-text">{children}</body>
    </html>
  );
}
