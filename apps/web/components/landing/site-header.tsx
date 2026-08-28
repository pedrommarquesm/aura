import Link from "next/link";

import { AuraMark } from "@/components/aura-mark";
import { ButtonLink } from "@/components/ui";
import { siteConfig } from "@/lib/site";

const NAV_LINKS = [
  { href: "#what-is-aura", label: "What is Aura" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#trending", label: "Trending" },
  { href: "#leaderboard", label: "Leaderboard" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <AuraMark />

        <nav aria-label="Sections" className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-label text-text-secondary transition-colors duration-(--motion-quick) ease-out hover:text-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <ButtonLink href={siteConfig.appDownloadUrl} size="sm">
          Get the app
        </ButtonLink>
      </div>
    </header>
  );
}
