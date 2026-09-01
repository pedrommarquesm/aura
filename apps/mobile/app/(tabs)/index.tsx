import { FlashList, type FlashListRef, type ViewToken } from '@shopify/flash-list';
import { useInfiniteQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  FEED_MODE_ORDER,
  FeedModeHeader,
  FeedPlaceholderPage,
  FeedPostCard,
  FeedPostSkeleton,
  type FeedMode,
} from '@/components/feed';
import { TAB_BAR_CONTENT_HEIGHT } from '@/components/navigation/tab-bar';
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

/**
 * Latest/Trending is a secondary control now — the swipe header
 * (`FeedModeHeader`) is Home's primary chrome (`RDX-51`). Live Check only.
 */
function FeedRankingToggle() {
  const { t } = useTranslation();
  const ranking = usePreferencesStore((state) => state.feedRanking);
  const setRanking = usePreferencesStore((state) => state.setFeedRanking);

  return (
    <View className="flex-row items-center justify-center px-gutter pb-2">
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
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const isFocused = useIsFocused();
  const ranking = usePreferencesStore((state) => state.feedRanking);
  const sessionStatus = useSessionStore((state) => state.status);
  const viewerId = useSessionStore((state) => state.user?.id);
  const viewer = sessionStatus === 'authenticated' && viewerId ? viewerId : 'guest';
  const listRef = useRef<FlashListRef<FeedCard>>(null);
  const pagerRef = useRef<ScrollView>(null);
  const [mode, setMode] = useState<FeedMode>('liveCheck');

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
    const liveCheckIndex = FEED_MODE_ORDER.indexOf('liveCheck');
    pagerRef.current?.scrollTo({ x: liveCheckIndex * windowWidth, animated: true });
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [windowWidth]);
  useScrollToTopOnTabPress(scrollToTop);

  const playingVideoId = isFocused && mode === 'liveCheck' ? activeVideoId : null;

  const onPagerSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (windowWidth <= 0) return;
      const index = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
      const clamped = Math.min(Math.max(index, 0), FEED_MODE_ORDER.length - 1);
      const next = FEED_MODE_ORDER[clamped];
      if (next) setMode(next);
    },
    [windowWidth],
  );

  const onSelectMode = useCallback(
    (next: FeedMode) => {
      const index = FEED_MODE_ORDER.indexOf(next);
      pagerRef.current?.scrollTo({ x: index * windowWidth, animated: true });
    },
    [windowWidth],
  );

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
        <View className="absolute top-0 left-0 right-0 z-10">
          <FeedModeHeader mode={mode} onSelect={setMode} />
        </View>
        <FeedPostSkeleton />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-bg">
        <View className="absolute top-0 left-0 right-0 z-10 bg-bg">
          <FeedModeHeader mode={mode} onSelect={setMode} />
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
          paddingBottom: 16,
          overflow: 'visible',
        }}
      >
        <LinearGradient
          colors={[withAlpha(colors.bg, 0.8), 'transparent']}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <FeedModeHeader mode={mode} onSelect={onSelectMode} />
        {mode === 'liveCheck' ? <FeedRankingToggle /> : null}
      </View>

      {/* Cooked ← Live Check → Certified (docs/redesign-screens/09, `RDX-51`).
          Certified/Cooked are placeholders — the inject threshold (`RDX-53`/
          `RDX-54`) is parked behind remote config that does not exist yet. */}
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: FEED_MODE_ORDER.indexOf('liveCheck') * windowWidth, y: 0 }}
        onMomentumScrollEnd={onPagerSettled}
        onScrollEndDrag={onPagerSettled}
        style={{ flex: 1 }}
      >
        <FeedPlaceholderPage
          icon="flame-outline"
          title={t('feed.mode.comingSoon.cooked.title')}
          body={t('feed.mode.comingSoon.cooked.body')}
          width={windowWidth}
          height={viewportHeight}
        />

        <View style={{ width: windowWidth, height: viewportHeight }}>
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

        <FeedPlaceholderPage
          icon="ribbon-outline"
          title={t('feed.mode.comingSoon.certified.title')}
          body={t('feed.mode.comingSoon.certified.body')}
          width={windowWidth}
          height={viewportHeight}
        />
      </ScrollView>
    </View>
  );
}

const rankShadow = {
  textShadowColor: withAlpha(colors.bg, 0.8),
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 6,
};

const styles = StyleSheet.create({
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
});
