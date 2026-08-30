import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState, type RefObject } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CommentComposer, CommentThread } from '@/components/comments';
import { Avatar, Text } from '@/components/ui';
import { createComment, fetchComments, type FeedCard } from '@/lib/api';
import { applyCreatedComment } from '@/lib/query/feed-cache';
import { queryKeys } from '@/lib/query/keys';
import { colors } from '@/theme/tokens';

export function FeedCommentsSheet({
  post,
  sheetRef,
  onOpenAuthor,
}: {
  post: FeedCard;
  sheetRef: RefObject<BottomSheetModal | null>;
  onOpenAuthor: () => void;
}) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const snapPoints = useMemo(() => ['50%', '90%'], []);
  const [open, setOpen] = useState(false);

  const comments = useInfiniteQuery({
    queryKey: queryKeys.postComments(post.id),
    queryFn: ({ pageParam, signal }) => fetchComments(post.id, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: open,
  });

  const items = comments.data?.pages.flatMap((page) => page.items) ?? [];
  const lastPage = comments.data?.pages.at(-1);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      onChange={(index) => setOpen(index >= 0)}
      onDismiss={() => setOpen(false)}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface.DEFAULT }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetView style={{ flex: 1, paddingBottom: insets.bottom }}>
        <BottomSheetScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          <Pressable
            onPress={onOpenAuthor}
            className="mx-gutter flex-row items-center gap-3 border-b border-border py-3"
          >
            <Avatar uri={post.author.avatarUrl} username={post.author.username} size="sm" />
            <View>
              <Text variant="label">@{post.author.username}</Text>
              {post.author.title ? (
                <Text variant="caption" tone="aura">
                  {post.author.title}
                </Text>
              ) : null}
            </View>
          </Pressable>

          {post.caption ? (
            <View className="mx-gutter border-b border-border py-4">
              <Text variant="body" tone="secondary">
                {post.caption}
              </Text>
            </View>
          ) : null}

          <CommentThread
            comments={items}
            loading={open && comments.isPending && items.length === 0}
            empty={open && !comments.isPending && items.length === 0 && !comments.isError}
            error={comments.isError}
            hasMore={Boolean(lastPage?.hasMore)}
            loadingMore={comments.isFetchingNextPage}
            onRetry={() => void comments.refetch()}
            onLoadMore={() => void comments.fetchNextPage()}
          />
        </BottomSheetScrollView>

        <CommentComposer
          postId={post.id}
          InputComponent={BottomSheetTextInput}
          onSubmit={async (body) => {
            const result = await createComment(post.id, body);
            applyCreatedComment(queryClient, post.id, result);
          }}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
}
