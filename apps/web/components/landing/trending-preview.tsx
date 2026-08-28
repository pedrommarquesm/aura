import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";

import { Section } from "@/components/landing/section";
import { PostCard } from "@/components/post-card";
import { Card, Skeleton } from "@/components/ui";
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
    </Section>
  );
}

async function TrendingGrid() {
  const trending = await api.getTrendingFeed({ limit: 6 });

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {trending.items.map((post, index) => (
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
