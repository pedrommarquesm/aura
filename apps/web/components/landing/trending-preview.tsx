import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { Section } from "@/components/landing/section";
import { PostCard } from "@/components/post-card";
import { Card, Skeleton } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { sectionId } from "@/i18n/sections";
import { api } from "@/lib/api";

export function TrendingPreview() {
  const locale = useLocale();
  const t = useTranslations("landing.trending");

  return (
    <Section
      id={sectionId(locale, "trending")}
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    >
      <Suspense fallback={<TrendingGridSkeleton />}>
        <TrendingGrid />
      </Suspense>

      <p className="mt-8 text-label text-text-muted">{t("note")}</p>
      <p className="mt-4">
        <Link
          href="/feed"
          className="text-label text-aura-bright transition-colors duration-(--motion-quick) ease-out hover:text-text"
        >
          {t("seeAll")}
        </Link>
      </p>
    </Section>
  );
}

async function TrendingGrid() {
  const t = await getTranslations("landing.trending");

  let items: Awaited<ReturnType<typeof api.getTrendingFeed>>["items"] = [];
  let failed = false;

  try {
    items = (await api.getTrendingFeed({ limit: 6 })).items;
  } catch {
    failed = true;
  }

  if (failed) {
    return <p className="text-body text-text-secondary">{t("unavailable")}</p>;
  }

  if (items.length === 0) {
    return <p className="text-body text-text-secondary">{t("empty")}</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((post, index) => (
        <PostCard key={post.id} post={post} priority={index === 0} />
      ))}
    </div>
  );
}

function TrendingGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="overflow-hidden">
          <Skeleton className="aspect-4/5 rounded-none" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        </Card>
      ))}
    </div>
  );
}
