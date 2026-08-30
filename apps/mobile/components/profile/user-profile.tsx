import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';

import { AuraValue, Avatar, Button, Card, Skeleton, Text } from '@/components/ui';
import {
  fetchPublicProfile,
  fetchUserPosts,
  messageForError,
  type FeedCard,
  type PublicUser,
} from '@/lib/api';
import { useFormat } from '@/lib/i18n';
import { queryKeys } from '@/lib/query/keys';
import { colors } from '@/theme/tokens';

const GRID_GAP = 4;
const GRID_COLUMNS = 3;

export function UserProfile({
  username,
  userId,
  emptyPosts,
  fallback,
  showComingSoon = false,
  footer,
}: {
  username: string;
  /** Own session id — lets the grid load without waiting on the public card. */
  userId?: string;
  emptyPosts: string;
  fallback?: Pick<PublicUser, 'aura' | 'title' | 'username' | 'avatarUrl'> | null;
  showComingSoon?: boolean;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const format = useFormat();

  const profile = useQuery({
    queryKey: queryKeys.user(username),
    queryFn: ({ signal }) => fetchPublicProfile(username, signal),
  });

  const authorId = userId ?? profile.data?.id;
  const posts = useInfiniteQuery({
    queryKey: queryKeys.userPosts(authorId ?? ''),
    queryFn: ({ pageParam, signal }) => fetchUserPosts(authorId!, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: Boolean(authorId),
  });

  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.user(username) });
      if (authorId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.userPosts(authorId) });
      }
    }, [authorId, queryClient, username]),
  );

  const card = profile.data;
  const aura = card?.aura ?? fallback?.aura ?? 0;
  const title = card?.title ?? fallback?.title;
  const handle = card?.username ?? fallback?.username ?? username;
  const avatarUrl = card?.avatarUrl ?? fallback?.avatarUrl ?? null;
  const items = useMemo(
    () => posts.data?.pages.flatMap((page) => page.items) ?? [],
    [posts.data],
  );

  if (profile.isError && !fallback) {
    return (
      <View className="flex-1 items-start justify-center gap-3 pb-24">
        <Text variant="title">{t('profile.error.title')}</Text>
        <Text variant="body" tone="secondary">
          {messageForError(profile.error)}
        </Text>
        <Button label={t('common.actions.retry')} onPress={() => void profile.refetch()} />
      </View>
    );
  }

  return (
    <ScrollView
      testID="profile-scroll"
      showsVerticalScrollIndicator={false}
      contentContainerClassName="pb-8"
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={
            (profile.isRefetching && !profile.isPending) ||
            (posts.isRefetching && !posts.isFetchingNextPage && !posts.isPending)
          }
          onRefresh={() => {
            void profile.refetch();
            if (authorId) void posts.refetch();
          }}
          accessibilityLabel={t('common.actions.refresh')}
          tintColor={colors.aura.bright}
          colors={[colors.aura.bright]}
          progressBackgroundColor={colors.surface.DEFAULT}
        />
      }
      onScroll={({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        if (layoutMeasurement.height + contentOffset.y < contentSize.height - 160) return;
        if (posts.hasNextPage && !posts.isFetchingNextPage) {
          void posts.fetchNextPage();
        }
      }}
    >
      <View className="items-center pt-4">
        <Avatar uri={avatarUrl} username={handle} size="xl" ring />

        <Text variant="heading" className="pt-3">
          @{handle}
        </Text>
        {title ? (
          <Text variant="caption" tone="aura">
            {title}
          </Text>
        ) : null}

        {card && card.rank > 0 ? (
          <Text variant="label" tone="secondary" className="pt-2">
            {t('profile.globalRank', { rank: card.rank })}
          </Text>
        ) : null}

        <AuraValue value={aura} size="xl" className="pt-4" />
      </View>

      <Card surface="elevated" className="mt-6 flex-row">
        <Stat value={card ? format.number(card.postCount) : '—'} label={t('profile.stats.posts')} />
        <Stat value={format.aura(aura)} label={t('common.aura')} tabular />
      </Card>

      <Text variant="heading" className="pb-3 pt-8">
        {t('profile.posts.title')}
      </Text>

      {posts.isPending || !authorId ? (
        <PostsSkeleton />
      ) : posts.isError ? (
        <View className="gap-3 py-6">
          <Text variant="body" tone="secondary">
            {messageForError(posts.error)}
          </Text>
          <Button label={t('common.actions.retry')} onPress={() => void posts.refetch()} />
        </View>
      ) : items.length === 0 ? (
        <Text variant="body" tone="secondary" className="py-6">
          {emptyPosts}
        </Text>
      ) : (
        <PostsGrid items={items} />
      )}

      {showComingSoon ? (
        <Text variant="caption" tone="muted" className="pt-8">
          {t('profile.comingSoon')}
        </Text>
      ) : null}

      {footer}
    </ScrollView>
  );
}

function Stat({
  value,
  label,
  tabular = false,
}: {
  value: string;
  label: string;
  tabular?: boolean;
}) {
  return (
    <View className="flex-1 items-center">
      <Text variant="heading" style={tabular ? { fontVariant: ['tabular-nums'] } : undefined}>
        {value}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function PostsGrid({ items }: { items: FeedCard[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - 32 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

  return (
    <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
      {items.map((post) => {
        const uri = post.media.thumbUrl ?? post.media.feedUrl;
        return (
          <Pressable
            key={post.id}
            accessibilityRole="button"
            accessibilityLabel={post.caption ?? `@${post.author.username}`}
            accessibilityHint={t('profile.posts.open')}
            onPress={() => {
              queryClient.setQueryData(queryKeys.post(post.id), { ...post, status: 'published' });
              router.push(`/post/${post.id}`);
            }}
            style={{ width: tile, height: tile }}
            className="relative overflow-hidden rounded-sm bg-surface"
          >
            {uri ? (
              <Image
                source={{ uri }}
                contentFit="cover"
                recyclingKey={post.id}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <View className="flex-1 bg-surface-elevated" />
            )}
            {post.media.type === 'video' ? (
              <View className="absolute bottom-1.5 right-1.5 rounded-full bg-bg/70 p-1">
                <Ionicons name="play" size={10} color={colors.text.DEFAULT} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function PostsSkeleton() {
  return (
    <View className="flex-row flex-wrap gap-1">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="aspect-square flex-1 basis-[31%]" />
      ))}
    </View>
  );
}
