import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { CaptionText } from './caption-text';
import { VoteLedgerRow } from './vote-ledger-row';
import { Avatar, Button, Skeleton, Text } from '@/components/ui';
import { fetchVoteLedger, type FeedCard } from '@/lib/api';
import { hashtagPath } from '@/lib/hashtags';
import { queryKeys } from '@/lib/query/keys';
import { colors } from '@/theme/tokens';

function LedgerRowSkeleton() {
  return (
    <View className="flex-row items-start gap-3 px-gutter py-3" accessibilityElementsHidden>
      <Skeleton className="h-8 w-8" />
      <View className="flex-1 gap-1.5 pt-0.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-full" />
      </View>
    </View>
  );
}

/**
 * The receipt ledger. Covers ~70% of the screen (docs/redesign-tracker.md
 * §"Aura economy & slider"). Every vote appears here newest-first, with or
 * without a receipt — this is the source of truth the floating overlay only
 * samples from.
 */
export function VoteLedgerSheet({
  post,
  sheetRef,
  onOpenAuthor,
}: {
  post: FeedCard;
  sheetRef: RefObject<BottomSheetModal | null>;
  onOpenAuthor: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const snapPoints = useMemo(() => ['70%'], []);
  const [open, setOpen] = useState(false);

  const ledger = useInfiniteQuery({
    queryKey: queryKeys.postVotes(post.id),
    queryFn: ({ pageParam, signal }) => fetchVoteLedger(post.id, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
    enabled: open,
  });

  const items = ledger.data?.pages.flatMap((page) => page.items) ?? [];
  const lastPage = ledger.data?.pages.at(-1);
  const loading = open && ledger.isPending && items.length === 0;
  const empty = open && !ledger.isPending && items.length === 0 && !ledger.isError;

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
    >
      <BottomSheetView style={{ flex: 1 }}>
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 24 }}>
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
              <CaptionText
                caption={post.caption}
                variant="body"
                tone="secondary"
                onHashtagPress={(tag) => {
                  sheetRef.current?.dismiss();
                  router.push(hashtagPath(tag));
                }}
              />
            </View>
          ) : null}

          <View className="pt-4">
            <Text variant="label" className="px-gutter pb-1">
              {t('feed.ledger.title')}
            </Text>

            {ledger.isError ? (
              <View className="gap-2 px-gutter py-3">
                <Text variant="body" tone="secondary">
                  {t('feed.ledger.error')}
                </Text>
                <Button
                  label={t('common.actions.retry')}
                  size="sm"
                  onPress={() => void ledger.refetch()}
                />
              </View>
            ) : loading ? (
              <View testID="ledger-skeleton">
                <LedgerRowSkeleton />
                <LedgerRowSkeleton />
              </View>
            ) : empty ? (
              <Text variant="body" tone="secondary" className="px-gutter py-3">
                {t('feed.ledger.empty')}
              </Text>
            ) : (
              items.map((row) => (
                <VoteLedgerRow key={`${row.author.id}:${row.createdAt}`} row={row} />
              ))
            )}

            {lastPage?.hasMore ? (
              <View className="px-gutter pb-3">
                <Button
                  label={t('feed.ledger.more')}
                  variant="ghost"
                  size="sm"
                  busy={ledger.isFetchingNextPage}
                  onPress={() => void ledger.fetchNextPage()}
                />
              </View>
            ) : null}
          </View>
        </BottomSheetScrollView>
      </BottomSheetView>
    </BottomSheetModal>
  );
}
