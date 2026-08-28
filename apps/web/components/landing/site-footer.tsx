import Link from "next/link";

import { AuraMark } from "@/components/aura-mark";
import { siteConfig } from "@/lib/site";

const FOOTER_LINKS = [
  { href: "#what-is-aura", label: "What is Aura" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#trending", label: "Trending" },
  { href: "#leaderboard", label: "Leaderboard" },
  { href: "#download", label: "Download" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <AuraMark />
          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-6 gap-y-2 text-label text-text-secondary"
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors duration-(--motion-quick) ease-out hover:text-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="max-w-xl text-caption text-text-muted">
          Posting, liking and everything competitive happens in the app. The web
          is here to show you the game and hand you a public link to any post.
        </p>

        <p className="text-caption text-text-muted">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </div>
    </footer>
  );
}
