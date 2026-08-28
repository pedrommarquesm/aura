import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import { LeaderboardRow } from "@/components/leaderboard-row";
import { Card, Skeleton } from "@/components/ui";
import type { LeaderboardEntry } from "@/lib/api";

export function LeaderboardBoard({
  entries,
  empty,
  unavailable,
  failed,
}: {
  entries: LeaderboardEntry[];
  empty: string;
  unavailable: string;
  failed: boolean;
}) {
  const board = useTranslations("leaderboard");

  let body: ReactNode;
  if (failed) {
    body = (
      <p className="px-4 py-8 text-body text-text-secondary sm:px-5">
        {unavailable}
      </p>
    );
  } else if (entries.length === 0) {
    body = (
      <p className="px-4 py-8 text-body text-text-secondary sm:px-5">{empty}</p>
    );
  } else {
    body = (
      <ol className="divide-y divide-border/70">
        {entries.map((entry) => (
          <LeaderboardRow key={entry.userId} entry={entry} />
        ))}
      </ol>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 text-caption tracking-[0.14em] text-text-muted uppercase sm:px-5">
        <span>{board("header.rankCreator")}</span>
        <span>{board("header.aura")}</span>
      </div>
      {body}
    </Card>
  );
}

export function LeaderboardSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-12" />
      </div>
      <ol className="divide-y divide-border/70">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </li>
        ))}
      </ol>
    </Card>
  );
}
