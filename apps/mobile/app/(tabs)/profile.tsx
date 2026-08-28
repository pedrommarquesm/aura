import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { Screen } from '@/components/layout';
import { LanguageSwitcher } from '@/components/settings';
import { AuraGradient, AuraValue, Avatar, Button, Card, Skeleton, Text } from '@/components/ui';
import {
  fetchPublicProfile,
  fetchUserPosts,
  messageForError,
  type FeedCard,
} from '@/lib/api';
import { useFormat } from '@/lib/i18n';
import { queryKeys } from '@/lib/query/keys';
import { useAuthGateStore } from '@/store/auth-gate';
import { useSessionStore } from '@/store/session';
import { colors } from '@/theme/tokens';

const GRID_GAP = 4;
const GRID_COLUMNS = 3;

export default function ProfileScreen() {
  const { t } = useTranslation();
  const status = useSessionStore((state) => state.status);
  const user = useSessionStore((state) => state.user);
  const signOut = useSessionStore((state) => state.signOut);
  const requestAuth = useAuthGateStore((state) => state.requestAuth);

  if (status !== 'authenticated' || !user) {
    return (
      <Screen className="justify-center">
        <View className="items-center">
          <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-xl">
            <AuraGradient />
            <Ionicons name="person" size={36} color={colors.text.DEFAULT} />
          </View>
          <Text variant="title" className="pt-6 text-center">
            {t('auth.reasons.profile.title')}
          </Text>
          <Text variant="body" tone="secondary" className="pt-2 text-center">
            {t('auth.reasons.profile.body')}
          </Text>
          <Button
            label={t('auth.signIn')}
            className="mt-8"
            glow
            fullWidth
            onPress={() => requestAuth({ reason: 'profile' })}
          />
        </View>
        <LanguageSwitcher className="mt-10" />
      </Screen>
    );
  }

  return <SignedInProfile username={user.username} userId={user.id} onSignOut={() => void signOut()} />;
}

function SignedInProfile({
  username,
  userId,
  onSignOut,
}: {
  username: string;
  userId: string;
  onSignOut: () => void;
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const sessionUser = useSessionStore((state) => state.user);

  const profile = useQuery({
    queryKey: queryKeys.user(username),
    queryFn: ({ signal }) => fetchPublicProfile(username, signal),
  });

  const posts = useInfiniteQuery({
    queryKey: queryKeys.userPosts(userId),
    queryFn: ({ pageParam, signal }) => fetchUserPosts(userId, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
  });

  const card = profile.data;
  const aura = card?.aura ?? sessionUser?.aura ?? 0;
  const title = card?.title ?? sessionUser?.title;
  const handle = card?.username ?? username;
  const avatarUrl = card?.avatarUrl ?? sessionUser?.avatarUrl ?? null;
  const items = useMemo(
    () => posts.data?.pages.flatMap((page) => page.items) ?? [],
    [posts.data],
  );

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-8"
        scrollEventThrottle={16}
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
          <Stat
            value={card ? format.number(card.postCount) : '—'}
            label={t('profile.stats.posts')}
          />
          <Stat value={format.aura(aura)} label={t('common.aura')} tabular />
        </Card>

        <Text variant="heading" className="pb-3 pt-8">
          {t('profile.posts.title')}
        </Text>

        {posts.isPending ? (
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
            {t('profile.posts.empty')}
          </Text>
        ) : (
          <PostsGrid items={items} />
        )}

        <Text variant="caption" tone="muted" className="pt-8">
          {t('profile.comingSoon')}
        </Text>

        <LanguageSwitcher className="mt-8" />

        <Button label={t('auth.signOut')} variant="ghost" className="mt-6" onPress={onSignOut} />
      </ScrollView>
    </Screen>
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
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - 32 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

  return (
    <View className="flex-row flex-wrap" style={{ gap: GRID_GAP }}>
      {items.map((post) => {
        const uri = post.media.thumbUrl ?? post.media.feedUrl;
        return (
          <View
            key={post.id}
            accessibilityRole="image"
            accessibilityLabel={post.caption ?? `@${post.author.username}`}
            style={{ width: tile, height: tile }}
            className="overflow-hidden rounded-sm bg-surface"
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
          </View>
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
