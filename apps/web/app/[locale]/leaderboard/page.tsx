import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LeaderboardBoard } from "@/components/leaderboard-board";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Container, Eyebrow } from "@/components/landing/section";
import { api } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";

/** Same window as the public feed cache (architecture §8.4). */
export const revalidate = 10;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("meta.leaderboard");

  return buildMetadata({
    locale,
    pathname: "/leaderboard",
    title: t("title"),
    socialTitle: t("socialTitle"),
    description: t("description"),
  });
}

export default async function LeaderboardPage() {
  const t = await getTranslations("leaderboard.page");

  let entries: Awaited<ReturnType<typeof api.getGlobalLeaderboard>>["entries"] =
    [];
  let failed = false;

  try {
    entries = (await api.getGlobalLeaderboard({ limit: 100 })).entries;
  } catch {
    failed = true;
  }

  return (
    <>
      <SiteHeader />
      <main>
        <section className="border-b border-border/70 py-16 sm:py-20">
          <Container className="flex max-w-2xl flex-col gap-4">
            <Eyebrow>{t("eyebrow")}</Eyebrow>
            <h1 className="text-title text-balance sm:text-display">
              {t("title")}
            </h1>
            <p className="text-body text-text-secondary">{t("description")}</p>
          </Container>
        </section>

        <Container className="py-12 sm:py-16">
          <LeaderboardBoard
            entries={entries}
            empty={t("empty")}
            unavailable={t("unavailable")}
            failed={failed}
          />
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
