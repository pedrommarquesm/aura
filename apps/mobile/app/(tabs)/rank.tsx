import { FlashList } from '@shopify/flash-list';
import { View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { AuraValue, Avatar, Card, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatRank } from '@/lib/format';
import { mockViewer } from '@/mocks/feed';
import { mockLeaderboard, type LeaderboardRow } from '@/mocks/leaderboard';

/** The top three read as medals; everyone else gets a plain tabular rank number. */
const MEDALS = ['🥇', '🥈', '🥉'];

function Row({ row, highlighted = false }: { row: LeaderboardRow; highlighted?: boolean }) {
  const medal = MEDALS[row.rank - 1];

  return (
    <View
      className={cn(
        'flex-row items-center gap-3 rounded-md px-3 py-2.5',
        highlighted && 'border border-aura-deep bg-aura-deep/25',
      )}
    >
      <View className="w-9 items-center">
        {medal ? (
          <Text variant="heading">{medal}</Text>
        ) : (
          <Text variant="label" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
            {formatRank(row.rank)}
          </Text>
        )}
      </View>

      <Avatar uri={row.avatarUrl} username={row.username} size="sm" ring={row.rank <= 3} />

      <View className="flex-1">
        <Text variant="label">@{row.username}</Text>
        {row.title ? (
          <Text variant="caption" tone="muted">
            {row.title}
          </Text>
        ) : null}
      </View>

      <AuraValue value={row.aura} tone={row.rank <= 3 ? 'aura' : 'default'} />
    </View>
  );
}

export default function RankScreen() {
  return (
    <Screen>
      <ScreenHeader title="Rank" subtitle="Global · all time" />

      <FlashList
        data={mockLeaderboard}
        keyExtractor={(item) => item.username}
        renderItem={({ item }) => <Row row={item} />}
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-4"
      />

      {/* Pinned so the user always sees their own position, even outside the top 100 (§15). */}
      <Card surface="elevated" padded={false} className="mb-4 border-aura-deep">
        <Row
          row={{
            rank: mockViewer.rank,
            username: mockViewer.username,
            avatarUrl: mockViewer.avatarUrl,
            aura: mockViewer.aura,
            title: mockViewer.title,
          }}
          highlighted
        />
      </Card>
    </Screen>
  );
}
