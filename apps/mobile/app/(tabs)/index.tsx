import { FlashList, type ViewToken } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedPostCard, FeedPostSkeleton } from '@/components/feed';
import { Button, Text } from '@/components/ui';
import { fetchFeedPage, messageForError, type FeedCard, type FeedRanking } from '@/lib/api';
import { cn } from '@/lib/cn';
import { queryKeys } from '@/lib/query/keys';
import { usePullToRefresh } from '@/lib/query/use-pull-to-refresh';
import { usePreferencesStore } from '@/store/preferences';
import { colors } from '@/theme/tokens';

const RANKINGS: {
  value: FeedRanking;
  labelKey: 'feed.ranking.latest' | 'feed.ranking.trending';
}[] = [
  { value: 'latest', labelKey: 'feed.ranking.latest' },
  { value: 'trending', labelKey: 'feed.ranking.trending' },
];

const VIDEO_VIEWABILITY = {
  itemVisiblePercentThreshold: 65,
  minimumViewTime: 250,
};

function FeedHeader() {
  const { t } = useTranslation();
  const ranking = usePreferencesStore((state) => state.feedRanking);
  const setRanking = usePreferencesStore((state) => state.setFeedRanking);

  return (
    <View className="px-gutter pb-1 pt-2">
      <View className="flex-row items-center justify-between">
        <Text variant="title" className="tracking-aura">
          {t('common.aura')}
        </Text>
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
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const ranking = usePreferencesStore((state) => state.feedRanking);

  const feed = useInfiniteQuery({
    queryKey: queryKeys.feed.ranking(ranking),
    queryFn: ({ pageParam, signal }) => fetchFeedPage(ranking, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
  });

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isPending,
    refetch,
  } = feed;

  const posts = data?.pages.flatMap((page) => page.items) ?? [];
  const pageCount = data?.pages.length ?? 0;
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<FeedCard>[] }) => {
      const video = viewableItems.find(
        (token) => token.isViewable && token.item.media.type === 'video',
      );
      setActiveVideoId(video?.item.id ?? null);
    },
    [],
  );

  useEffect(() => {
    if (pageCount === 1 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [pageCount, hasNextPage, isFetchingNextPage, fetchNextPage, ranking]);

  const { refreshing, onRefresh } = usePullToRefresh(
    useCallback(() => refetch(), [refetch]),
  );

  const playingVideoId = isFocused ? activeVideoId : null;

  if (isPending) {
    return (
      <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
        <FeedHeader />
        <FeedPostSkeleton />
        <FeedPostSkeleton />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-bg px-gutter" style={{ paddingTop: insets.top }}>
        <FeedHeader />
        <View className="flex-1 items-start justify-center gap-3 pb-24">
          <Text variant="title">{t('feed.error.title')}</Text>
          <Text variant="body" tone="secondary">
            {messageForError(error)}
          </Text>
          <Button label={t('common.actions.retry')} onPress={() => void refetch()} />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <FlashList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedPostCard post={item} isActiveVideo={item.id === playingVideoId} />
        )}
        extraData={playingVideoId}
        viewabilityConfig={VIDEO_VIEWABILITY}
        onViewableItemsChanged={onViewableItemsChanged}
        ListHeaderComponent={FeedHeader}
        ListEmptyComponent={
          <View className="px-gutter py-16">
            <Text variant="title">{t('feed.empty.title')}</Text>
            <Text variant="body" tone="secondary" className="pt-2">
              {t('feed.empty.body')}
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <FeedPostSkeleton />
          ) : posts.length > 0 ? (
            <View className="h-8" />
          ) : null
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            void fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.6}
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
