import { getLocale, getTranslations } from "next-intl/server";

import { ArrowRightIcon } from "@/components/icons";
import { AppPreview } from "@/components/landing/app-preview";
import { Container } from "@/components/landing/section";
import { AuraValue, ButtonLink } from "@/components/ui";
import { sectionHash } from "@/i18n/sections";
import { api } from "@/lib/api";
import { downloadHref } from "@/lib/site";

export async function Hero() {
  const [trending, leaderboard] = await Promise.all([
    api.getTrendingFeed({ limit: 1 }),
    api.getGlobalLeaderboard({ limit: 10 }),
  ]);
  const locale = await getLocale();
  const t = await getTranslations("landing.hero");
  const actions = await getTranslations("common.actions");

  const topPost = trending.items[0];
  const leader = leaderboard.items[0];
  const authorRank =
    leaderboard.items.find(
      (entry) => entry.user.username === topPost?.author.username,
    )?.rank ?? null;

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_15%_-10%,var(--color-aura-deep),transparent_60%),radial-gradient(50%_50%_at_95%_10%,var(--color-aura),transparent_65%)] opacity-45"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-aura-gradient opacity-60"
      />

      <Container className="grid gap-16 pt-16 pb-20 sm:pt-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-10 lg:pt-28 lg:pb-28">
        <div className="animate-rise">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-caption text-text-secondary backdrop-blur-sm">
            <span aria-hidden className="size-1.5 rounded-full bg-success" />
            {t("badge")}
          </p>

          <h1 className="mt-6 text-display tracking-tight text-balance sm:text-[3.5rem] sm:leading-[1.05] lg:text-[4.25rem]">
            {/* One message, so the line break and the accent stay with the
                sentence instead of being glued together in JSX. */}
            {t.rich("title", {
              break: () => <br />,
              accent: (chunks) => (
                <span className="text-aura-gradient">{chunks}</span>
              ),
            })}
          </h1>

          <p className="mt-6 max-w-xl text-body text-text-secondary">
            {t("body")}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink
              href={downloadHref(sectionHash(locale, "download"))}
              size="lg"
            >
              {actions("getAuraApp")}
            </ButtonLink>
            <ButtonLink
              href={sectionHash(locale, "trending")}
              size="lg"
              variant="secondary"
            >
              {actions("seeTrending")}
              <ArrowRightIcon className="size-4" />
            </ButtonLink>
          </div>

          {leader ? (
            <p className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-label text-text-muted">
              <span>{t("leader", { rank: leader.rank })}</span>
              <span aria-hidden>·</span>
              <span className="text-text-secondary">
                @{leader.user.username}
              </span>
              <AuraValue value={leader.aura} size="sm" tone="aura" />
            </p>
          ) : null}
        </div>

        {topPost ? (
          <div className="animate-rise [animation-delay:120ms]">
            <AppPreview post={topPost} rank={authorRank} />
          </div>
        ) : null}
      </Container>
    </section>
  );
}
