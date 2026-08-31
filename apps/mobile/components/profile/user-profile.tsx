import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { PostsGrid, PostsSkeleton } from './posts-grid';
import { AuraValue, Avatar, Button, Card, Text } from '@/components/ui';
import {
  fetchPublicProfile,
  fetchUserPosts,
  messageForError,
  type PublicUser,
} from '@/lib/api';
import { useFormat } from '@/lib/i18n';
import { LibraryPermissionError, pickPhotoFromLibrary } from '@/lib/media/pick-photo';
import { setPendingAvatarSource } from '@/lib/media/pending-avatar';
import { queryKeys } from '@/lib/query/keys';
import { usePullToRefresh } from '@/lib/query/use-pull-to-refresh';
import { colors } from '@/theme/tokens';

export function UserProfile({
  username,
  userId,
  emptyPosts,
  fallback,
  showComingSoon = false,
  canEditAvatar = false,
  footer,
}: {
  username: string;
  /** Own session id — lets the grid load without waiting on the public card. */
  userId?: string;
  emptyPosts: string;
  fallback?: Pick<PublicUser, 'aura' | 'title' | 'username' | 'avatarUrl'> | null;
  showComingSoon?: boolean;
  /** Own profile only. Opens the library picker, then the circular crop. */
  canEditAvatar?: boolean;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const router = useRouter();

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
  const refetchProfile = profile.refetch;
  const refetchPosts = posts.refetch;

  const { refreshing, onRefresh } = usePullToRefresh(
    useCallback(async () => {
      await Promise.all([refetchProfile(), authorId ? refetchPosts() : Promise.resolve()]);
    }, [authorId, refetchPosts, refetchProfile]),
  );

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.user(username) });
      if (authorId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.userPosts(authorId) });
      }
    }, [authorId, queryClient, username]),
  );

  async function editAvatar() {
    try {
      const asset = await pickPhotoFromLibrary();
      if (!asset || !asset.width || !asset.height) return;
      setPendingAvatarSource({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
      });
      router.push('/avatar-edit');
    } catch (cause) {
      if (cause instanceof LibraryPermissionError) return;
    }
  }

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
          refreshing={refreshing}
          onRefresh={onRefresh}
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
        <View className="relative">
          <Avatar uri={avatarUrl} username={handle} size="xl" ring />
          {canEditAvatar ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('profile.avatar.edit')}
              hitSlop={8}
              onPress={() => void editAvatar()}
              className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-bg bg-aura"
            >
              <Ionicons name="pencil" size={14} color={colors.text.DEFAULT} />
            </Pressable>
          ) : null}
        </View>

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

