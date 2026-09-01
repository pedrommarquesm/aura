import { FlashList, type FlashListRef, type ViewToken } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeedPostCard, FeedPostSkeleton } from '@/components/feed';
import { TAB_BAR_CONTENT_HEIGHT } from '@/components/navigation/tab-bar';
import { Button, Text } from '@/components/ui';
import { fetchFeedPage, messageForError, type FeedCard, type FeedRanking } from '@/lib/api';
import { useFormat } from '@/lib/i18n';
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

function FeedHeader({ aura }: { aura?: number }) {
  const { t } = useTranslation();
  const format = useFormat();
  const ranking = usePreferencesStore((state) => state.feedRanking);
  const setRanking = usePreferencesStore((state) => state.setFeedRanking);

  return (
    <View className="px-gutter py-2" style={styles.header}>
      <View className="flex-row items-center justify-center">
        {RANKINGS.map((option, index) => {
          const active = option.value === ranking;

          return (
            <View key={option.value} className="flex-row items-center">
              {index > 0 ? (
                <Text variant="label" className="px-3" style={styles.rankSep}>
                  |
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                hitSlop={10}
                onPress={() => setRanking(option.value)}
              >
                <Text variant="label" style={active ? styles.rankActive : styles.rankIdle}>
                  {t(option.labelKey)}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {aura != null ? (
        <View pointerEvents="none" style={styles.rankAuraWrap}>
          <View style={styles.rankAuraSpread}>
            <View style={styles.rankAuraPill}>
              <Text variant="caption" style={styles.rankAura}>
                {format.count(aura)} 🗿
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
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
    // guest snapshot (`votedByMe: false`) and `refetchOnMount: false` keeps it
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
  const [activePostId, setActivePostId] = useState<string | null>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<FeedCard>[] }) => {
      const visible = viewableItems.find((token) => token.isViewable);
      if (visible?.item) setActivePostId(visible.item.id);
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
  const currentPost = posts.find((post) => post.id === activePostId) ?? posts[0];
  const currentAura = currentPost?.aura;

  // The tab scene is already above the tab bar. Cards must match this viewport
  // exactly — a guessed height (window minus status bar minus ~80) was short,
  // so the next post peeked under the current one.
  const [viewportHeight, setViewportHeight] = useState(
    () => Math.round(windowHeight - TAB_BAR_CONTENT_HEIGHT - insets.bottom),
  );
  const [headerHeight, setHeaderHeight] = useState(0);

  const onViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    if (next > 0) setViewportHeight(next);
  }, []);

  const onHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.height);
    if (next > 0) setHeaderHeight(next);
  }, []);

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
    <View className="flex-1 bg-bg" onLayout={onViewportLayout} style={{ overflow: 'visible' }}>
      {/* Floating Header Overlay — gradient is a sibling so the aura glow is not clipped */}
      <View
        pointerEvents="box-none"
        onLayout={onHeaderLayout}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          paddingTop: insets.top,
          paddingBottom: 16,
          overflow: 'visible',
        }}
      >
        <LinearGradient
          colors={[withAlpha(colors.bg, 0.8), 'transparent']}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <FeedHeader aura={currentAura} />
      </View>

      <FlashList
        ref={listRef}
        data={posts}
        style={{ flex: 1 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FeedPostCard
            post={item}
            isActiveVideo={item.id === playingVideoId}
            isActive={item.id === activePostId}
            height={viewportHeight}
            overlayInsetTop={headerHeight}
          />
        )}
        extraData={`${playingVideoId}:${activePostId}:${viewportHeight}:${headerHeight}`}
        viewabilityConfig={VIDEO_VIEWABILITY}
        onViewableItemsChanged={onViewableItemsChanged}
        pagingEnabled
        snapToInterval={viewportHeight}
        snapToAlignment="start"
        disableIntervalMomentum
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="px-gutter py-16" style={{ height: viewportHeight, justifyContent: 'center' }}>
            <Text variant="title">{t('feed.empty.title')}</Text>
            <Text variant="body" tone="secondary" className="pt-2">
              {t('feed.empty.body')}
            </Text>
          </View>
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

const rankShadow = {
  textShadowColor: withAlpha(colors.bg, 0.8),
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
};

const styles = StyleSheet.create({
  header: {
    overflow: 'visible',
  },
  rankActive: {
    ...rankShadow,
    color: colors.text.DEFAULT,
    fontWeight: '700',
  },
  rankIdle: {
    ...rankShadow,
    color: withAlpha(colors.text.DEFAULT, 0.82),
    fontWeight: '500',
  },
  rankSep: {
    ...rankShadow,
    color: withAlpha(colors.text.DEFAULT, 0.55),
  },
  rankAuraWrap: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    overflow: 'visible',
  },
  rankAuraSpread: {
    borderRadius: 999,
    backgroundColor: withAlpha(colors.bg, 0.65),
    shadowColor: colors.aura.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 10,
  },
  rankAuraPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    shadowColor: colors.aura.DEFAULT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  rankAura: {
    color: colors.text.DEFAULT,
    fontWeight: '700',
  },
});
