import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CommentRow } from './comment-row';
import { Button, Skeleton, Text } from '@/components/ui';
import type { CommentCard } from '@/lib/api';

function CommentRowSkeleton() {
  return (
    <View className="flex-row items-start gap-3 px-gutter py-3" accessibilityElementsHidden>
      <Skeleton className="h-8 w-8 rounded-full" />
      <View className="flex-1 gap-1.5 pt-0.5">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </View>
    </View>
  );
}

export function CommentThread({
  comments,
  empty,
  error,
  loading = false,
  hasMore = false,
  loadingMore = false,
  onRetry,
  onLoadMore,
}: {
  comments: CommentCard[];
  empty: boolean;
  error?: boolean;
  /** First load of the thread — in-place rows, not the pull-to-refresh spinner. */
  loading?: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
  onRetry?: () => void;
  onLoadMore?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="pt-4">
      <Text variant="label" className="px-gutter pb-1">
        {t('post.comments.title')}
      </Text>

      {error ? (
        <View className="gap-2 px-gutter py-3">
          <Text variant="body" tone="secondary">
            {t('post.comments.error')}
          </Text>
          {onRetry ? <Button label={t('common.actions.retry')} size="sm" onPress={onRetry} /> : null}
        </View>
      ) : loading ? (
        <View testID="comment-thread-skeleton">
          <CommentRowSkeleton />
          <CommentRowSkeleton />
        </View>
      ) : empty ? (
        <Text variant="body" tone="secondary" className="px-gutter py-3">
          {t('post.comments.empty')}
        </Text>
      ) : (
        comments.map((comment) => <CommentRow key={comment.id} comment={comment} />)
      )}

      {hasMore && onLoadMore ? (
        <View className="px-gutter pb-3">
          <Button
            label={t('post.comments.more')}
            variant="ghost"
            size="sm"
            busy={loadingMore}
            onPress={onLoadMore}
          />
        </View>
      ) : null}
    </View>
  );
}
