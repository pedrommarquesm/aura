import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen, ScreenHeader } from '@/components/layout';
import { AuraValue, Avatar, Button, Card, Skeleton, Text } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  fetchGlobalLeaderboard,
  messageForError,
  type LeaderboardEntry,
} from '@/lib/api';
import { queryKeys } from '@/lib/query/keys';

/** The top three read as medals; everyone else gets a plain tabular rank number. */
const MEDALS = ['🥇', '🥈', '🥉'];

function Row({ row, highlighted = false }: { row: LeaderboardEntry; highlighted?: boolean }) {
  const { t } = useTranslation();
  const medal = MEDALS[row.rank - 1];

  return (
    <View
      className={cn(
        'flex-row items-center gap-3 rounded-md px-3 py-2.5',
        highlighted && 'border border-aura-deep bg-aura-deep/25',
      )}
    >
      {/* A medal or a "#42" both read badly out loud, so both announce the ordinal. */}
      <View className="w-9 items-center">
        {medal ? (
          <Text variant="heading" accessibilityLabel={t('leaderboard.place', { rank: row.rank })}>
            {medal}
          </Text>
        ) : (
          <Text
            variant="label"
            tone="muted"
            style={{ fontVariant: ['tabular-nums'] }}
            accessibilityLabel={t('leaderboard.place', { rank: row.rank })}
          >
            {t('leaderboard.rank', { rank: row.rank })}
          </Text>
        )}
      </View>

      <Avatar uri={row.avatarUrl} username={row.username} size="sm" ring={row.rank <= 3} />

      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text variant="label" numberOfLines={1}>
            @{row.username}
          </Text>
          {highlighted ? (
            <Text variant="caption" tone="aura">
              {t('leaderboard.you')}
            </Text>
          ) : null}
        </View>
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

function RankSkeleton() {
  return (
    <View className="gap-1 px-1">
      {Array.from({ length: 8 }, (_, index) => (
        <View key={index} className="flex-row items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </View>
      ))}
    </View>
  );
}

export default function RankScreen() {
  const { t } = useTranslation();
  const board = useQuery({
    queryKey: queryKeys.leaderboard.global,
    queryFn: ({ signal }) => fetchGlobalLeaderboard(100, signal),
  });

  return (
    <Screen>
      <ScreenHeader title={t('leaderboard.title')} subtitle={t('leaderboard.subtitle')} />

      {board.isPending ? (
        <RankSkeleton />
      ) : board.isError ? (
        <View className="flex-1 items-start justify-center gap-3 px-gutter pb-16">
          <Text variant="title">{t('leaderboard.error.title')}</Text>
          <Text variant="body" tone="secondary">
            {messageForError(board.error)}
          </Text>
          <Button label={t('common.actions.retry')} onPress={() => void board.refetch()} />
        </View>
      ) : (
        <>
          <FlashList
            data={board.data.entries}
            keyExtractor={(item) => item.userId}
            renderItem={({ item }) => <Row row={item} highlighted={item.userId === board.data.viewer?.userId} />}
            ListEmptyComponent={
              <View className="px-gutter py-16">
                <Text variant="title">{t('leaderboard.empty.title')}</Text>
                <Text variant="body" tone="secondary" className="pt-2">
                  {t('leaderboard.empty.body')}
                </Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
            contentContainerClassName="pb-4"
          />

          {board.data.viewer ? (
            <Card surface="elevated" padded={false} className="mb-4 border-aura-deep">
              <Row row={board.data.viewer} highlighted />
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
