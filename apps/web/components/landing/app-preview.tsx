import { useFormatter, useTranslations } from "next-intl";

import { HeartIcon } from "@/components/icons";
import { PostMedia } from "@/components/post-media";
import { AuraValue, Avatar } from "@/components/ui";
import type { FeedCard } from "@/lib/api";
import { formatCount } from "@/lib/format";

/**
 * Static rendition of the mobile feed card. It exists to show the product on a
 * marketing page; the real thing is the app.
 */
export function AppPreview({
  post,
  rank,
}: {
  post: FeedCard;
  rank: number | null;
}) {
  const format = useFormatter();
  const t = useTranslations("landing.hero.preview");
  const tabs = useTranslations("nav.tabs");
  const feed = useTranslations("feed");

  const tabLabels = [
    tabs("home"),
    tabs("discover"),
    null,
    tabs("rank"),
    tabs("profile"),
  ];

  return (
    <div className="relative mx-auto w-full max-w-[336px]">
      <div
        aria-hidden
        className="absolute -inset-8 animate-aura-pulse rounded-full bg-aura/25 blur-3xl"
      />

      <div className="relative rounded-[2.25rem] border border-border bg-surface-elevated p-2.5 shadow-aura-glow">
        <div className="overflow-hidden rounded-[1.85rem] bg-bg">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-label">{t("title")}</span>
            <AuraValue value={post.author.aura} size="sm" tone="aura" />
          </div>

          <div className="relative">
            <PostMedia
              media={post.media}
              alt={post.caption ?? `@${post.author.username}`}
              priority
              sizes="336px"
              className="aspect-4/5"
              playInView={false}
            />
            <span className="absolute bottom-3 left-3 rounded-full bg-aura-gradient px-3 py-1 text-caption font-semibold">
              {t("auraGain", { aura: 10 })}
            </span>
          </div>

          <div className="flex flex-col gap-3 p-4">
            <div className="flex items-center gap-2.5">
              <Avatar
                username={post.author.username}
                src={post.author.avatarUrl}
                size="sm"
                ring
              />
              <span className="text-label">@{post.author.username}</span>
              {rank === null ? null : (
                <span className="ml-auto text-caption text-text-muted">
                  {t("globalRank", { rank })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-label text-text-secondary">
              <span className="inline-flex items-center gap-1.5 text-like">
                <HeartIcon className="size-4" />
                <span aria-hidden>{formatCount(format, post.likeCount)}</span>
                <span className="sr-only">
                  {feed("post.likes", { count: post.likeCount })}
                </span>
              </span>
              <AuraValue value={post.aura} size="sm" tone="secondary" />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border/70 px-4 py-3 text-caption text-text-muted">
            {tabLabels.map((tab, index) =>
              tab === null ? (
                <span
                  key="create"
                  aria-hidden
                  className="grid size-7 place-items-center rounded-full bg-aura-gradient text-text shadow-aura-glow-sm"
                >
                  +
                </span>
              ) : (
                <span key={tab} className={index === 0 ? "text-text" : undefined}>
                  {tab}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
