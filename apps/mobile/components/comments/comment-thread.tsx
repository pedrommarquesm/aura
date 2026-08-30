import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { CommentRow } from './comment-row';
import { Button, Text } from '@/components/ui';
import type { CommentCard } from '@/lib/api';

export function CommentThread({
  comments,
  empty,
  error,
  hasMore = false,
  loadingMore = false,
  onRetry,
  onLoadMore,
}: {
  comments: CommentCard[];
  empty: boolean;
  error?: boolean;
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
