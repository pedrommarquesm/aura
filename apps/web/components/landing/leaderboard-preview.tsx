import { Suspense } from "react";

import { Section } from "@/components/landing/section";
import { LeaderboardRow } from "@/components/leaderboard-row";
import { ButtonLink, Card, Skeleton } from "@/components/ui";
import { api } from "@/lib/api";
import { siteConfig } from "@/lib/site";

export function LeaderboardPreview() {
  return (
    <Section
      id="leaderboard"
      eyebrow="Leaderboard"
      title="The global board"
      description="Lifetime Aura, top to bottom, updated as likes land. In the app you also see your own position — even when you are nowhere near the top 100."
    >
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-12">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 text-caption tracking-[0.14em] text-text-muted uppercase sm:px-5">
            <span>Rank / creator</span>
            <span>Aura</span>
          </div>
          <Suspense fallback={<LeaderboardSkeleton />}>
            <LeaderboardRows />
          </Suspense>
        </Card>

        <div className="flex flex-col gap-5 lg:pt-4">
          <h3 className="text-title text-balance">
            You are not on this board yet.
          </h3>
          <p className="text-body text-text-secondary">
            Everyone starts at zero Aura and the title of NPC. The fastest way
            off the bottom is to post something worth liking.
          </p>
          <ButtonLink
            href={siteConfig.appDownloadUrl}
            size="lg"
            className="self-start"
          >
            Get the Aura app
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}

async function LeaderboardRows() {
  const leaderboard = await api.getGlobalLeaderboard({ limit: 10 });

  return (
    <ol className="divide-y divide-border/70">
      {leaderboard.items.map((entry) => (
        <LeaderboardRow key={entry.user.username} entry={entry} />
      ))}
    </ol>
  );
}

function LeaderboardSkeleton() {
  return (
    <ol className="divide-y divide-border/70">
      {Array.from({ length: 10 }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-20" />
        </li>
      ))}
    </ol>
  );
}
