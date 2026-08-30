import Ionicons from '@expo/vector-icons/Ionicons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { CommentComposer, CommentThread } from '@/components/comments';
import { FeedPostCard, FeedPostSkeleton } from '@/components/feed';
import { Screen } from '@/components/layout';
import { Button, Text } from '@/components/ui';
import { createComment, fetchComments, fetchPost, messageForError } from '@/lib/api';
import { applyCreatedComment } from '@/lib/query/feed-cache';
import { queryKeys } from '@/lib/query/keys';
import { colors } from '@/theme/tokens';

export default function PostScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const raw = useLocalSearchParams<{ id?: string | string[] }>().id;
  const id = Array.isArray(raw) ? raw[0] : raw;

  const post = useQuery({
    queryKey: queryKeys.post(id ?? ''),
    queryFn: () => fetchPost(id!),
    enabled: Boolean(id),
  });

  const comments = useInfiniteQuery({
    queryKey: queryKeys.postComments(id ?? ''),
    queryFn: ({ pageParam, signal }) => fetchComments(id!, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: Boolean(id),
  });

  const refresh = useCallback(() => {
    if (!id) return;
    void post.refetch();
    void comments.refetch();
  }, [id, post, comments]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.post(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.postComments(id) });
    }, [id, queryClient]),
  );

  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];
  const lastPage = comments.data?.pages.at(-1);
  const refreshing =
    (post.isRefetching && !post.isPending) || (comments.isRefetching && !comments.isPending);

  return (
    <Screen padded={false}>
      <View className="flex-row items-center gap-3 px-gutter pb-3 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings.back')}
          hitSlop={12}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.DEFAULT} />
        </Pressable>
        <Text variant="title">{t('post.title')}</Text>
      </View>

      {!id || post.isError ? (
        <View className="flex-1 items-start justify-center gap-3 px-gutter pb-24">
          <Text variant="title">{t('post.error.title')}</Text>
          <Text variant="body" tone="secondary">
            {post.error ? messageForError(post.error) : t('errors.not_found')}
          </Text>
          <Button label={t('common.actions.retry')} onPress={() => void post.refetch()} />
        </View>
      ) : post.isPending || !post.data ? (
        <FeedPostSkeleton />
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            testID="post-scroll"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                accessibilityLabel={t('common.actions.refresh')}
                tintColor={colors.aura.bright}
                colors={[colors.aura.bright]}
                progressBackgroundColor={colors.surface.DEFAULT}
              />
            }
          >
            <FeedPostCard
              post={post.data}
              isActiveVideo
              onDeleted={() => router.back()}
            />
            <CommentThread
              comments={items}
              empty={!comments.isPending && items.length === 0 && !comments.isError}
              error={comments.isError}
              hasMore={Boolean(lastPage?.hasMore)}
              loadingMore={comments.isFetchingNextPage}
              onRetry={() => void comments.refetch()}
              onLoadMore={() => void comments.fetchNextPage()}
            />
          </ScrollView>
          <CommentComposer
            postId={id}
            onSubmit={async (body) => {
              const result = await createComment(id, body);
              applyCreatedComment(queryClient, id, result);
            }}
          />
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}
