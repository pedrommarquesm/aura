import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { FeedPostCard, FeedPostSkeleton } from '@/components/feed';
import { Screen } from '@/components/layout';
import { Button, Text } from '@/components/ui';
import { fetchPost, messageForError } from '@/lib/api';
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

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void queryClient.invalidateQueries({ queryKey: queryKeys.post(id) });
    }, [id, queryClient]),
  );

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
        <ScrollView
          testID="post-scroll"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={post.isRefetching && !post.isPending}
              onRefresh={() => void post.refetch()}
              accessibilityLabel={t('common.actions.refresh')}
              tintColor={colors.aura.bright}
              colors={[colors.aura.bright]}
              progressBackgroundColor={colors.surface.DEFAULT}
            />
          }
        >
          <FeedPostCard post={post.data} isActiveVideo onDeleted={() => router.back()} />
        </ScrollView>
      )}
    </Screen>
  );
}
