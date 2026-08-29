"use client";

import { useQuery } from "@tanstack/react-query";

import { PostCard } from "@/components/post-card";
import { Card, Skeleton } from "@/components/ui";
import { fetchTrendingInfinite } from "@/lib/query/browser";
import { queryKeys } from "@/lib/query/keys";

export function TrendingGrid({
  empty,
  unavailable,
}: {
  empty: string;
  unavailable: string;
}) {
  const query = useQuery({
    queryKey: queryKeys.feed.ranking("trending"),
    queryFn: () => fetchTrendingInfinite(6),
  });

  if (query.isPending) {
    return <TrendingGridSkeleton />;
  }

  if (query.isError) {
    return <p className="text-body text-text-secondary">{unavailable}</p>;
  }

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  if (items.length === 0) {
    return <p className="text-body text-text-secondary">{empty}</p>;
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((post, index) => (
        <PostCard key={post.id} post={post} priority={index === 0} />
      ))}
    </div>
  );
}

export function TrendingGridSkeleton() {
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
