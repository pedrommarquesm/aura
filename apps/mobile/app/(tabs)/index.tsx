import { FlashList } from '@shopify/flash-list';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedPostCard, FeedPostSkeleton } from '@/components/feed';
import { AuraValue, Text } from '@/components/ui';
import type { FeedRanking } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatRank } from '@/lib/format';
import { mockFeed, mockViewer } from '@/mocks/feed';
import { usePreferencesStore } from '@/store/preferences';
import { colors } from '@/theme/tokens';

const RANKINGS: { value: FeedRanking; label: string }[] = [
  { value: 'latest', label: 'Latest' },
  { value: 'trending', label: 'Trending' },
];

function FeedHeader() {
  const ranking = usePreferencesStore((state) => state.feedRanking);
  const setRanking = usePreferencesStore((state) => state.setFeedRanking);

  return (
    <View className="px-gutter pb-1 pt-2">
      <View className="flex-row items-center justify-between">
        <Text variant="title" className="tracking-aura">
          Aura
        </Text>

        <View className="flex-row items-center gap-3">
          <AuraValue value={mockViewer.aura} tone="aura" />
          <Text variant="label" tone="muted" style={{ fontVariant: ['tabular-nums'] }}>
            {formatRank(mockViewer.rank)}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2 pt-3">
        {RANKINGS.map((option) => {
          const active = option.value === ranking;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setRanking(option.value)}
              className={cn(
                'rounded-full px-3 py-1.5',
                active ? 'bg-aura-deep' : 'bg-surface-elevated',
              )}
            >
              <Text variant="label" tone={active ? 'default' : 'muted'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // There is no `GET /feed` yet (roadmap `API-20`), so this only exercises the gesture
  // and its release animation. `MOB-30` replaces it with `refetch()`.
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <FlashList
        data={mockFeed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedPostCard post={item} />}
        ListHeaderComponent={FeedHeader}
        // Stands in for the next-page fetch, which is what the user will actually see
        // here once pagination is wired.
        ListFooterComponent={FeedPostSkeleton}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.aura.bright}
            colors={[colors.aura.bright]}
            progressBackgroundColor={colors.surface.DEFAULT}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
