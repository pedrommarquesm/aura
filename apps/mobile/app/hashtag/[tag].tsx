import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { Screen } from '@/components/layout';
import { PostsGrid, PostsSkeleton } from '@/components/profile';
import { Button, Text, TextField } from '@/components/ui';
import { fetchHashtagPage, messageForError } from '@/lib/api';
import { displayHashtag, hashtagPath, normalizeHashtagQuery } from '@/lib/hashtags';
import { queryKeys } from '@/lib/query/keys';
import { usePullToRefresh } from '@/lib/query/use-pull-to-refresh';
import { colors } from '@/theme/tokens';

export default function HashtagScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const raw = useLocalSearchParams<{ tag?: string | string[] }>().tag;
  const encoded = Array.isArray(raw) ? raw[0] : raw;
  const tag = normalizeHashtagQuery(safeDecode(encoded));
  const [search, setSearch] = useState(tag ? displayHashtag(tag) : '#');

  useEffect(() => {
    setSearch(tag ? displayHashtag(tag) : '#');
  }, [tag]);

  const posts = useInfiniteQuery({
    queryKey: queryKeys.hashtag(tag ?? ''),
    queryFn: ({ pageParam, signal }) => fetchHashtagPage(tag!, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: Boolean(tag),
  });

  const refetch = posts.refetch;
  const { refreshing, onRefresh } = usePullToRefresh(
    useCallback(async () => {
      if (!tag) return;
      await refetch();
    }, [refetch, tag]),
  );

  const items = useMemo(
    () => posts.data?.pages.flatMap((page) => page.items) ?? [],
    [posts.data],
  );
  const lastPage = posts.data?.pages.at(-1);

  const submitSearch = () => {
    const next = normalizeHashtagQuery(search);
    if (!next || next === tag) return;
    router.replace(hashtagPath(next));
  };

  return (
    <Screen>
      <View className="flex-row items-center gap-3 pb-3 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.back')}
          hitSlop={12}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.DEFAULT} />
        </Pressable>
        <View className="flex-1">
          <TextField
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            placeholder={t('hashtag.search')}
            accessibilityLabel={t('hashtag.search')}
          />
        </View>
      </View>

      {!tag ? (
        <View className="flex-1 items-start justify-center gap-3 pb-24">
          <Text variant="title">{t('hashtag.error.title')}</Text>
          <Text variant="body" tone="secondary">
            {t('hashtag.invalid')}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onScrollEndDrag={() => {
            if (lastPage?.hasMore && !posts.isFetchingNextPage) {
              void posts.fetchNextPage();
            }
          }}
        >
          {posts.isPending && items.length === 0 ? (
            <PostsSkeleton />
          ) : posts.isError ? (
            <View className="gap-3 py-6">
              <Text variant="title">{t('hashtag.error.title')}</Text>
              <Text variant="body" tone="secondary">
                {messageForError(posts.error)}
              </Text>
              <Button label={t('common.actions.retry')} onPress={() => void posts.refetch()} />
            </View>
          ) : items.length === 0 ? (
            <Text variant="body" tone="secondary" className="py-6">
              {t('hashtag.empty', { tag })}
            </Text>
          ) : (
            <PostsGrid items={items} />
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function safeDecode(value: string | undefined) {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
