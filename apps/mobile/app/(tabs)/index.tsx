import { FlashList, type FlashListRef, type ViewToken } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedPostCard, FeedPostSkeleton } from '@/components/feed';
import { Button, Text } from '@/components/ui';
import { fetchFeedPage, messageForError, type FeedCard, type FeedRanking } from '@/lib/api';
import { useScrollToTopOnTabPress } from '@/lib/navigation/use-scroll-to-top-on-tab-press';
import { queryKeys } from '@/lib/query/keys';
import { usePullToRefresh } from '@/lib/query/use-pull-to-refresh';
import { usePreferencesStore } from '@/store/preferences';
import { useSessionStore } from '@/store/session';
import { colors, withAlpha } from '@/theme/tokens';

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
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: active ? colors.aura.deep : colors.surface.elevated }}
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
  const { height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const ranking = usePreferencesStore((state) => state.feedRanking);
  const sessionStatus = useSessionStore((state) => state.status);
  const viewerId = useSessionStore((state) => state.user?.id);
  const viewer = sessionStatus === 'authenticated' && viewerId ? viewerId : 'guest';
  const listRef = useRef<FlashListRef<FeedCard>>(null);

  const feed = useInfiniteQuery({
    queryKey: queryKeys.feed.ranking(ranking, viewer),
    queryFn: ({ pageParam, signal }) => fetchFeedPage(ranking, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    // Cold start is `restoring` with no access token. Fetching then caches a
    // guest snapshot (`likedByMe: false`) and `refetchOnMount: false` keeps it
    // until the user pulls to refresh.
    enabled: sessionStatus !== 'restoring',
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

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);
  useScrollToTopOnTabPress(scrollToTop);

  const playingVideoId = isFocused ? activeVideoId : null;

  // Calculate snap interval for TikTok-style pagination
  const screenHeight = height - insets.top - 80; // minus tab bar
  const snapToInterval = screenHeight;

  if (isPending) {
    return (
      <View className="flex-1 bg-bg">
        <View 
          className="absolute top-0 left-0 right-0 z-10"
          style={{ paddingTop: insets.top }}
        >
          <FeedHeader />
        </View>
        <FeedPostSkeleton />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-bg">
        <View 
          className="absolute top-0 left-0 right-0 z-10 bg-bg"
          style={{ paddingTop: insets.top }}
        >
          <FeedHeader />
        </View>
        <View className="flex-1 items-start justify-center gap-3 px-gutter pb-24">
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
    <View className="flex-1 bg-bg">
      {/* Floating Header Overlay */}
      <LinearGradient
        colors={[withAlpha(colors.bg, 0.8), 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: insets.top }}
      >
        <FeedHeader />
      </LinearGradient>

      <FlashList
        ref={listRef}
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedPostCard post={item} isActiveVideo={item.id === playingVideoId} />
        )}
        extraData={playingVideoId}
        viewabilityConfig={VIDEO_VIEWABILITY}
        onViewableItemsChanged={onViewableItemsChanged}
        snapToInterval={snapToInterval}
        decelerationRate="fast"
        pagingEnabled
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="px-gutter py-16" style={{ height: screenHeight, justifyContent: 'center' }}>
            <Text variant="title">{t('feed.empty.title')}</Text>
            <Text variant="body" tone="secondary" className="pt-2">
              {t('feed.empty.body')}
            </Text>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <FeedPostSkeleton />
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
            testID="pull-to-refresh"
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.aura.bright}
            colors={[colors.aura.bright]}
            progressBackgroundColor={colors.surface.DEFAULT}
          />
        }
      />
    </View>
  );
}
