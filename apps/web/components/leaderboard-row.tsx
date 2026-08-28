import { AuraValue, Avatar } from "@/components/ui";
import type { LeaderboardEntry } from "@/lib/api";
import { MEDAL_BY_RANK } from "@/lib/aura";
import { cn } from "@/lib/cn";
import { formatRank } from "@/lib/format";

export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const medal = MEDAL_BY_RANK[entry.rank];

  return (
    <li className="flex items-center gap-4 px-4 py-3.5 transition-colors duration-(--motion-quick) ease-out hover:bg-surface-elevated sm:px-5">
      <span
        className={cn(
          "aura-numerals w-10 shrink-0 text-label tabular-nums",
          medal ? medal.className : "text-text-muted",
        )}
      >
        {medal ? (
          <span aria-label={formatRank(entry.rank)}>{medal.emoji}</span>
        ) : (
          formatRank(entry.rank)
        )}
      </span>

      <Avatar
        username={entry.user.username}
        src={entry.user.avatarUrl}
        size="sm"
        ring={entry.rank === 1}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-label">@{entry.user.username}</p>
        {entry.user.title ? (
          <p className="truncate text-caption text-text-muted">
            {entry.user.title}
          </p>
        ) : null}
      </div>

      <AuraValue value={entry.aura} size="md" />
    </li>
  );
}
